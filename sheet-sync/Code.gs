/**
 * Mirrors the app's expenses (Firestore) into the "Расходы факт" sheet; runs from the sheet's own
 * Apps Script project, no billing needed. Firestore is the source of truth: rows with an id in
 * column N are created, updated and deleted to match it, rows without an id are never touched.
 *
 * Setup: see README.md. Run it from the "Расходы" menu of the sheet (or on a trigger).
 */

const CONFIG = {
  sheetName: 'Расходы факт',
  headerRows: 1,
  collection: 'expenses',
};

/** 1-based columns of the sheet. */
const COL = {
  date: 1,
  month: 2,
  article: 3,
  comment: 4,
  amount: 5,
  currency: 6,
  totalRsd: 7,
  totalEur: 11,
  addedAt: 12,
  person: 13,
  id: 14,
};
const LAST_COLUMN = COL.id;

/** Columns the sheet computes itself (month, totals, rates): copied from the last row as formulas. Totals are then replaced by the app's. */
const DERIVED_COLUMNS = [2, 7, 8, 9, 10, 11];

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

/** `categoryName` and `subcategoryName` are legacy copies, read only as a fallback for old expenses. */
const FIRESTORE_FIELDS = [
  'amount', 'currency', 'categoryId', 'subcategoryId', 'categoryName', 'subcategoryName',
  'person', 'description', 'date', 'amounts', 'createdAt',
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Расходы')
    .addItem('Синхронизировать с приложением', 'syncExpenses')
    .addItem('Отправить тестовое напоминание', 'sendTestReminder')
    .addToUi();
}

/** Entry point: the menu item and the optional trigger. */
function syncExpenses() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    notify('Синхронизация уже идёт');
    return;
  }
  try {
    notify('Синхронизация...');
    notify(runSync());
  } catch (error) {
    notify('Ошибка: ' + error.message);
    throw error;
  } finally {
    lock.releaseLock();
  }
}

/** Optional: syncs every morning. Run once from the editor; the button keeps working too. */
function installDailyTrigger() {
  ScriptApp.getProjectTriggers()
    .filter((trigger) => trigger.getHandlerFunction() === 'syncExpenses')
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger('syncExpenses').timeBased().everyDays(1).atHour(6).create();
}

function runSync() {
  const settings = readSettings();
  const spreadsheet = SpreadsheetApp.getActive();
  const sheet = spreadsheet.getSheetByName(CONFIG.sheetName);
  if (!sheet) {
    throw new Error('Нет листа «' + CONFIG.sheetName + '»');
  }
  const timeZone = spreadsheet.getSpreadsheetTimeZone();

  const idToken = signIn(settings);
  const expenses = fetchExpenses(settings, idToken);
  const names = {
    categories: fetchNames(settings, idToken, 'categories'),
    subcategories: fetchNames(settings, idToken, 'subcategories'),
  };
  const { dataEnd, byId, duplicateRows } = readSheet(sheet);
  if (expenses.size === 0 && byId.size > 0) {
    // Nothing is deleted on an empty answer: it's more likely a wrong SYNC_FROM or a failed query.
    throw new Error('Firestore не вернул ни одного расхода (проверьте SYNC_FROM), таблица не изменена');
  }

  const template = readTemplate(sheet, dataEnd);
  const records = new Map();
  expenses.forEach((expense, id) => records.set(id, toRecord(id, expense, names, timeZone)));

  const rejected = [];
  let updated = 0;
  records.forEach((record, id) => {
    const existing = byId.get(id);
    if (existing && differs(existing.values, record, template)) {
      writeRecords(sheet, existing.row, [record], template, false, rejected);
      updated++;
    }
  });

  const deleteRows = duplicateRows.concat(
    [...byId].filter(([id]) => !records.has(id)).map(([, existing]) => existing.row),
  );
  deleteRows.sort((a, b) => b - a).forEach((row) => sheet.deleteRow(row));

  // Entry order, like the rest of the sheet.
  const added = [...records]
    .filter(([id]) => !byId.has(id))
    .sort(([, a], [, b]) => a.addedAtMs - b.addedAtMs)
    .map(([, record]) => record);
  if (added.length) {
    writeRecords(sheet, dataEnd - deleteRows.length + 1, added, template, true, rejected);
  }

  const ownedRows = [...readSheet(sheet).byId.values()].map((existing) => existing.row);
  if (ownedRows.length) {
    restripe(sheet, Math.min(...ownedRows));
  }

  const summary = 'Добавлено: ' + added.length + ', обновлено: ' + updated + ', удалено: ' + deleteRows.length;
  return rejected.length ? summary + '. Таблица не приняла (нет в списке?): ' + rejected.join(', ') : summary;
}

function notify(message) {
  try {
    SpreadsheetApp.getActive().toast(message, 'Расходы', 10);
  } catch (error) {
    // No spreadsheet UI to show it in (e.g. a trigger); the execution log has the outcome.
  }
  console.log(message);
}

/** Script properties (Project settings → Script properties): nothing secret is kept in the code. */
function readSettings() {
  const properties = readProperties(['SYNC_FROM']);
  const syncFrom = Utilities.parseDate(
    properties.SYNC_FROM,
    SpreadsheetApp.getActive().getSpreadsheetTimeZone(),
    'yyyy-MM-dd',
  );
  return {
    apiKey: properties.FIREBASE_API_KEY,
    projectId: properties.FIREBASE_PROJECT_ID,
    email: properties.FAMILY_EMAIL,
    password: properties.FAMILY_PASSWORD,
    syncFrom,
  };
}

/** All script properties; the Firebase sign-in ones and `extra` must be set. */
function readProperties(extra) {
  const properties = PropertiesService.getScriptProperties().getProperties();
  const required = ['FIREBASE_API_KEY', 'FIREBASE_PROJECT_ID', 'FAMILY_EMAIL', 'FAMILY_PASSWORD'].concat(extra);
  const missing = required.filter((name) => !properties[name]);
  if (missing.length) {
    throw new Error('Не заданы свойства скрипта: ' + missing.join(', '));
  }
  return properties;
}

// ---- Firestore (REST, as the family account: the security rules apply) ----

function signIn({ apiKey, email, password }) {
  const response = UrlFetchApp.fetch(
    'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + encodeURIComponent(apiKey),
    {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ email, password, returnSecureToken: true }),
      muteHttpExceptions: true,
    },
  );
  if (response.getResponseCode() !== 200) {
    throw new Error('Не удалось войти в Firebase: ' + response.getContentText());
  }
  return JSON.parse(response.getContentText()).idToken;
}

function documentsUrl(settings) {
  return 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(settings.projectId) +
    '/databases/(default)/documents';
}

/** Expenses created since `syncFrom` by id; `createdAt` never changes, so the set is stable across edits. */
function fetchExpenses(settings, idToken) {
  const response = UrlFetchApp.fetch(
    documentsUrl(settings) + ':runQuery',
    {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + idToken },
      payload: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: CONFIG.collection }],
          select: { fields: FIRESTORE_FIELDS.map((fieldPath) => ({ fieldPath })) },
          where: {
            fieldFilter: {
              field: { fieldPath: 'createdAt' },
              op: 'GREATER_THAN_OR_EQUAL',
              value: { timestampValue: settings.syncFrom.toISOString() },
            },
          },
          orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'ASCENDING' }],
        },
      }),
      muteHttpExceptions: true,
    },
  );
  if (response.getResponseCode() !== 200) {
    throw new Error('Firestore: ' + response.getContentText());
  }
  const expenses = new Map();
  JSON.parse(response.getContentText()).forEach(({ document }) => {
    if (document) {
      expenses.set(document.name.split('/').pop(), fromFields(document.fields || {}));
    }
  });
  return expenses;
}

/** Names of a collection's documents (categories or subcategories) by id. */
function fetchNames(settings, idToken, collection) {
  const names = new Map();
  fetchDocuments(settings, idToken, collection, ['name']).forEach((fields, id) => names.set(id, fields.name || ''));
  return names;
}

/** All documents of a collection by id, with only the given fields. */
function fetchDocuments(settings, idToken, collection, fieldPaths) {
  const documents = new Map();
  const mask = fieldPaths.map((fieldPath) => '&mask.fieldPaths=' + encodeURIComponent(fieldPath)).join('');
  let pageToken = '';
  do {
    const response = UrlFetchApp.fetch(
      documentsUrl(settings) + '/' + collection + '?pageSize=300' + mask +
        (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : ''),
      { headers: { Authorization: 'Bearer ' + idToken }, muteHttpExceptions: true },
    );
    if (response.getResponseCode() !== 200) {
      throw new Error('Firestore: ' + response.getContentText());
    }
    const page = JSON.parse(response.getContentText());
    (page.documents || []).forEach((document) => {
      documents.set(document.name.split('/').pop(), fromFields(document.fields || {}));
    });
    pageToken = page.nextPageToken || '';
  } while (pageToken);
  return documents;
}

function fromFields(fields) {
  const result = {};
  Object.keys(fields).forEach((key) => (result[key] = fromValue(fields[key])));
  return result;
}

function fromValue(value) {
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('timestampValue' in value) return new Date(value.timestampValue);
  if ('mapValue' in value) return fromFields(value.mapValue.fields || {});
  return null;
}

// ---- Expense → sheet row ----

/**
 * The «статья» cell. Kept apart on purpose: how app categories map to the sheet's articles
 * is still to be decided; for now it's the current subcategory name as is. Names are looked up by id;
 * an old expense whose ids aren't known falls back to the names it was saved with.
 */
function articleFor(expense, names) {
  return (
    names.subcategories.get(expense.subcategoryId) ||
    expense.subcategoryName ||
    names.categories.get(expense.categoryId) ||
    expense.categoryName ||
    ''
  );
}

function toRecord(id, expense, names, timeZone) {
  const day = Utilities.formatDate(expense.date, timeZone, 'yyyy-MM-dd');
  const amounts = expense.amounts || {};
  const createdAt = expense.createdAt || expense.date;
  return {
    id,
    date: Utilities.parseDate(day, timeZone, 'yyyy-MM-dd'),
    month: MONTHS[Number(day.slice(5, 7)) - 1],
    article: articleFor(expense, names),
    comment: expense.description || '',
    amount: expense.amount,
    currency: expense.currency,
    totalRsd: round2(amounts.RSD),
    totalEur: round2(amounts.EUR),
    addedAt: Utilities.formatDate(createdAt, timeZone, 'yyyy-MM-dd HH:mm:ss'),
    addedAtMs: createdAt.getTime(),
    person: expense.person || '',
  };
}

/** `null` when the expense has no such conversion (migrated ones may not): the sheet's formula stays. */
function round2(value) {
  return typeof value === 'number' ? Math.round(value * 100) / 100 : null;
}

// ---- Sheet ----

/** Existing rows by expense id, the last used row and rows with an id that's already taken. */
function readSheet(sheet) {
  const height = Math.max(sheet.getLastRow() - CONFIG.headerRows, 0);
  const data = height ? sheet.getRange(CONFIG.headerRows + 1, 1, height, LAST_COLUMN).getValues() : [];
  const byId = new Map();
  const duplicateRows = [];
  let dataEnd = CONFIG.headerRows;
  data.forEach((values, index) => {
    const row = CONFIG.headerRows + 1 + index;
    const id = String(values[COL.id - 1]).trim();
    if (values[COL.date - 1] !== '' || id) {
      dataEnd = row;
    }
    if (!id) {
      return;
    }
    if (byId.has(id)) {
      duplicateRows.push(row);
    } else {
      byId.set(id, { row, values });
    }
  });
  return { dataEnd, byId, duplicateRows };
}

/** The last row is the model for new ones: which derived columns are formulas there. */
function readTemplate(sheet, dataEnd) {
  const formulas = {};
  if (dataEnd > CONFIG.headerRows) {
    sheet.getRange(dataEnd, 1, 1, LAST_COLUMN).getFormulasR1C1()[0].forEach((formula, index) => {
      if (DERIVED_COLUMNS.indexOf(index + 1) !== -1 && formula.charAt(0) === '=') {
        formulas[index + 1] = formula;
      }
    });
  }
  return { formulas };
}

/**
 * What the app owns in a row: the inputs and the totals in RSD and EUR (the app converts with the rates
 * of the expense's own day, not with the sheet's rates), plus the month when it isn't a formula in the
 * sheet. A getter returning `null` leaves the cell as it is: its formula keeps counting.
 * The rate columns stay the sheet's formulas; the totals don't use them any more.
 */
function ownedCells(template) {
  const cells = [
    [COL.date, (record) => record.date],
    [COL.article, (record) => record.article],
    [COL.comment, (record) => record.comment],
    [COL.amount, (record) => record.amount],
    [COL.currency, (record) => record.currency],
    [COL.person, (record) => record.person],
    [COL.totalRsd, (record) => record.totalRsd],
    [COL.totalEur, (record) => record.totalEur],
  ];
  if (!template.formulas[COL.month]) {
    cells.push([COL.month, (record) => record.month]);
  }
  return cells;
}

function differs(values, record, template) {
  return ownedCells(template).some(([column, get]) => {
    const wanted = get(record);
    return wanted !== null && !sameValue(values[column - 1], wanted);
  });
}

function sameValue(cell, wanted) {
  if (cell instanceof Date && wanted instanceof Date) {
    return cell.getTime() === wanted.getTime();
  }
  if (typeof wanted === 'number' || typeof cell === 'number') {
    return Number(cell) === Number(wanted);
  }
  return String(cell).trim() === String(wanted).trim();
}

/**
 * What a dropdown cell accepts, or `null` when it takes anything (no rule, a warning-only rule,
 * criteria other than a list). The sheet applies writes in a batch at the end of the run, so a rejected
 * value can't be caught around the write: it has to be checked up front.
 */
function dropdownValues(rule, cache) {
  if (!rule || rule.getAllowInvalid()) {
    return null;
  }
  const criteria = SpreadsheetApp.DataValidationCriteria;
  const type = rule.getCriteriaType();
  const [source] = rule.getCriteriaValues();
  if (type === criteria.VALUE_IN_LIST) {
    return source.map(String);
  }
  if (type === criteria.VALUE_IN_RANGE) {
    const key = source.getSheet().getSheetId() + '!' + source.getA1Notation();
    cache[key] = cache[key] || [].concat(...source.getValues()).map(String);
    return cache[key];
  }
  return null;
}

/**
 * Writes a column of values. A value that isn't in the cell's dropdown (month, article, currency,
 * person) is not written: the cell keeps what it had and is added to `rejected`, the rest is written.
 */
function setCells(sheet, row, column, values, rejected) {
  const range = sheet.getRange(row, column, values.length, 1);
  const rules = range.getDataValidations();
  const formulas = range.getFormulas();
  const current = range.getValues();
  const keep = (index) => [formulas[index][0] || current[index][0]];
  const cache = {};
  const result = values.map(([value], index) => {
    if (value === null) {
      return keep(index);
    }
    const allowed = dropdownValues(rules[index][0], cache);
    if (allowed === null || value === '' || allowed.indexOf(String(value).trim()) !== -1) {
      return [value];
    }
    rejected.push(String.fromCharCode(64 + column) + (row + index) + ' «' + value + '»');
    return keep(index);
  });
  range.setValues(result);
}

/**
 * The sheet alternates two row fills set cell by cell, so appended or deleted rows break the pattern.
 * Tiles the two rows above the app's first row (hand-entered, so they follow the pattern) over the rest
 * of the sheet, down to its last pre-formatted row.
 */
function restripe(sheet, firstRow) {
  const height = Math.floor((sheet.getMaxRows() - firstRow + 1) / 2) * 2;
  if (firstRow - 2 <= CONFIG.headerRows || height < 2) {
    return;
  }
  sheet
    .getRange(firstRow - 2, 1, 2, LAST_COLUMN)
    .copyTo(sheet.getRange(firstRow, 1, height, LAST_COLUMN), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
}

/** Writes consecutive rows from `startRow`; new rows also get the model row's formulas. */
function writeRecords(sheet, startRow, records, template, isNew, rejected) {
  const count = records.length;
  const lastNeeded = startRow + count - 1;
  if (lastNeeded > sheet.getMaxRows()) {
    sheet.insertRowsAfter(sheet.getMaxRows(), lastNeeded - sheet.getMaxRows());
  }
  if (isNew) {
    // First, so that the owned cells below overwrite them where the app has a value.
    DERIVED_COLUMNS.forEach((column) => {
      if (template.formulas[column]) {
        sheet.getRange(startRow, column, count, 1).setFormulaR1C1(template.formulas[column]);
      }
    });
  }
  ownedCells(template).forEach(([column, get]) => {
    setCells(sheet, startRow, column, records.map((record) => [get(record)]), rejected);
  });
  if (isNew) {
    setCells(sheet, startRow, COL.addedAt, records.map((record) => [record.addedAt]), rejected);
    setCells(sheet, startRow, COL.id, records.map((record) => [record.id]), rejected);
  }
}
