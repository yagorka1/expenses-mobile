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

/** Columns the sheet computes itself (month, totals, rates): copied from the last row as formulas. */
const DERIVED_COLUMNS = [2, 7, 8, 9, 10, 11];

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const FIRESTORE_FIELDS = [
  'amount', 'currency', 'categoryName', 'subcategoryName', 'person', 'description', 'date', 'amounts', 'createdAt',
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Расходы')
    .addItem('Синхронизировать с приложением', 'syncExpenses')
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

  const expenses = fetchExpenses(settings);
  const { dataEnd, byId, duplicateRows } = readSheet(sheet);
  if (expenses.size === 0 && byId.size > 0) {
    // Nothing is deleted on an empty answer: it's more likely a wrong SYNC_FROM or a failed query.
    throw new Error('Firestore не вернул ни одного расхода (проверьте SYNC_FROM), таблица не изменена');
  }

  const template = readTemplate(sheet, dataEnd);
  const records = new Map();
  expenses.forEach((expense, id) => records.set(id, toRecord(id, expense, timeZone)));

  let updated = 0;
  records.forEach((record, id) => {
    const existing = byId.get(id);
    if (existing && differs(existing.values, record, template)) {
      writeRecords(sheet, existing.row, [record], template, false);
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
    writeRecords(sheet, dataEnd - deleteRows.length + 1, added, template, true);
  }

  return 'Добавлено: ' + added.length + ', обновлено: ' + updated + ', удалено: ' + deleteRows.length;
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
  const properties = PropertiesService.getScriptProperties().getProperties();
  const required = ['FIREBASE_API_KEY', 'FIREBASE_PROJECT_ID', 'FAMILY_EMAIL', 'FAMILY_PASSWORD', 'SYNC_FROM'];
  const missing = required.filter((name) => !properties[name]);
  if (missing.length) {
    throw new Error('Не заданы свойства скрипта: ' + missing.join(', '));
  }
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

/** Expenses created since `syncFrom` by id; `createdAt` never changes, so the set is stable across edits. */
function fetchExpenses(settings) {
  const response = UrlFetchApp.fetch(
    'https://firestore.googleapis.com/v1/projects/' +
      encodeURIComponent(settings.projectId) +
      '/databases/(default)/documents:runQuery',
    {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + signIn(settings) },
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
 * is still to be decided; for now it's the subcategory name as is.
 */
function articleFor(expense) {
  return expense.subcategoryName || expense.categoryName || '';
}

function toRecord(id, expense, timeZone) {
  const day = Utilities.formatDate(expense.date, timeZone, 'yyyy-MM-dd');
  const amounts = expense.amounts || {};
  const createdAt = expense.createdAt || expense.date;
  return {
    id,
    date: Utilities.parseDate(day, timeZone, 'yyyy-MM-dd'),
    month: MONTHS[Number(day.slice(5, 7)) - 1],
    article: articleFor(expense),
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

function round2(value) {
  return typeof value === 'number' ? Math.round(value * 100) / 100 : '';
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

/** The last row is the model for new ones: its formats, and which derived columns are formulas. */
function readTemplate(sheet, dataEnd) {
  if (dataEnd <= CONFIG.headerRows) {
    return { range: null, formulas: {} };
  }
  const range = sheet.getRange(dataEnd, 1, 1, LAST_COLUMN);
  const formulas = {};
  range.getFormulasR1C1()[0].forEach((formula, index) => {
    if (DERIVED_COLUMNS.indexOf(index + 1) !== -1 && formula.charAt(0) === '=') {
      formulas[index + 1] = formula;
    }
  });
  return { range, formulas };
}

/**
 * What the app owns in a row: the inputs, plus the derived cells that aren't formulas in the sheet
 * (month and totals get a plain value then; rates can't be derived and stay as they are).
 */
function ownedCells(template) {
  const cells = [
    [COL.date, (record) => record.date],
    [COL.article, (record) => record.article],
    [COL.comment, (record) => record.comment],
    [COL.amount, (record) => record.amount],
    [COL.currency, (record) => record.currency],
    [COL.person, (record) => record.person],
  ];
  [
    [COL.month, (record) => record.month],
    [COL.totalRsd, (record) => record.totalRsd],
    [COL.totalEur, (record) => record.totalEur],
  ].forEach((cell) => {
    if (!template.formulas[cell[0]]) {
      cells.push(cell);
    }
  });
  return cells;
}

function differs(values, record, template) {
  return ownedCells(template).some(([column, get]) => !sameValue(values[column - 1], get(record)));
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

/** Writes consecutive rows from `startRow`; new rows also get the model row's formats and formulas. */
function writeRecords(sheet, startRow, records, template, isNew) {
  const count = records.length;
  const lastNeeded = startRow + count - 1;
  if (lastNeeded > sheet.getMaxRows()) {
    sheet.insertRowsAfter(sheet.getMaxRows(), lastNeeded - sheet.getMaxRows());
  }
  if (isNew && template.range) {
    template.range.copyTo(
      sheet.getRange(startRow, 1, count, LAST_COLUMN),
      SpreadsheetApp.CopyPasteType.PASTE_FORMAT,
      false,
    );
  }
  ownedCells(template).forEach(([column, get]) => {
    sheet.getRange(startRow, column, count, 1).setValues(records.map((record) => [get(record)]));
  });
  if (isNew) {
    DERIVED_COLUMNS.forEach((column) => {
      if (template.formulas[column]) {
        sheet.getRange(startRow, column, count, 1).setFormulaR1C1(template.formulas[column]);
      }
    });
    sheet.getRange(startRow, COL.addedAt, count, 1).setValues(records.map((record) => [record.addedAt]));
    sheet.getRange(startRow, COL.id, count, 1).setValues(records.map((record) => [record.id]));
  }
}
