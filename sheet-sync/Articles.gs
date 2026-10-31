/**
 * One-off: renames the budget's articles to the app's subcategories (see categories-restructure.md), so the article
 * the sync writes (the subcategory name) is always a budget row. Changes «Бюджет» and the article of every row of
 * «Расходы факт» and «Расходы План»: the budget sums them by name, so a renamed article must be renamed everywhere.
 * «Бюджет ЕВРО» and the article dropdown take the names from «Бюджет» by themselves.
 *
 * Run once from the «Расходы» menu, after making a copy of the file. Everything is checked before the first write;
 * once the old articles are gone it refuses to run again.
 */

const BUDGET_SHEET = 'Бюджет';
const ARTICLE_SHEETS = ['Расходы факт', 'Расходы План'];

/** Labels in «Бюджет» column B that delimit the expense sections (income below has its own «Подарки»). */
const BUDGET_LABELS = {
  expenses: 'Расходы',
  regularTotal: 'Итого регулярные',
  irregularTotal: 'Итого нерегулярные',
  total: 'Общие расходы',
};

/** Old article → new one. A split article keeps its row for its main part; the other parts are in ARTICLES_ADDED. */
const ARTICLE_RENAMES = {
  'Электричество': 'Коммунальные услуги',
  'Жильё': 'Аренда квартиры',
  'Кафе, рестораны': 'Кафе и рестораны',
  'Бытовая химия и хозтовары': 'Хозтовары',
  'Ремонт/товары для дома': 'Ремонт и уют',
  'Красота и здоровье': 'Красота',
  'Спорт': 'Спорт и танцы',
  'Одежда Обувь': 'Одежда, обувь и аксессуары',
  'Подарки': 'Подарки и цветы',
  'ВНЖ/ПМЖ/Виза/Бумаги': 'ВНЖ, визы, бумаги',
  'Штарфы/комиссии': 'Штрафы и комиссии',
  'Непредвиденное': 'Другое',
  'Такси и электричка': 'Такси',
  'Путешествия': 'Транспорт в путешествиях',
  'Техника/мебель': 'Мебель и бытовая техника',
};

/** New budget rows: they take the empty rows (formulas already in place) at the end of their section. */
const ARTICLES_ADDED = {
  regular: ['Общественный транспорт', 'Подписки на сервисы'],
  irregular: ['Аренда жилья в путешествиях', 'Экскурсии и др', 'Компьютеры', 'Телефоны'],
};

/** Budget rows left without a name; their formulas stay, so the totals don't break. */
const ARTICLES_REMOVED = ['Расходы бизнес'];

/** Rows of a split article that go to another part than its renamed row; found by day, amount and currency. */
const ROW_OVERRIDES = [
  { sheet: 'Расходы факт', article: 'Такси и электричка', day: '2026-04-10', amount: 0.68, currency: 'EUR', to: 'Общественный транспорт' },
  { sheet: 'Расходы факт', article: 'Такси и электричка', day: '2026-04-10', amount: 83, currency: 'RUB', to: 'Общественный транспорт' },
  { sheet: 'Расходы факт', article: 'Такси и электричка', day: '2026-04-22', amount: 1.3, currency: 'EUR', to: 'Общественный транспорт' },
];

/** Entry point: the menu item. */
function updateArticles() {
  try {
    notify(runUpdateArticles());
  } catch (error) {
    notify('Ошибка: ' + error.message);
    throw error;
  }
}

function runUpdateArticles() {
  const spreadsheet = SpreadsheetApp.getActive();
  const problems = [];
  const plan = planBudget(requireSheet(spreadsheet, BUDGET_SHEET), problems);
  const sheets = ARTICLE_SHEETS.map((name) =>
    planArticleColumn(requireSheet(spreadsheet, name), plan.articleRows, spreadsheet.getSpreadsheetTimeZone(), problems),
  );
  if (problems.length) {
    throw new Error('Ничего не изменено. ' + problems.join('; '));
  }

  plan.writes.forEach(([row, name]) => plan.sheet.getRange(row, 2).setValue(name));
  // The dropdowns check the new articles against «Бюджет»: it must be written before the rows.
  SpreadsheetApp.flush();
  sheets.filter(({ range }) => range).forEach(({ range, values }) => range.setValues(values));

  return (
    'Статьи обновлены. Строк изменено: ' +
    sheets.map(({ sheet, changed }) => '«' + sheet.getName() + '» ' + changed).join(', ')
  );
}

function requireSheet(spreadsheet, name) {
  const sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    throw new Error('Нет листа «' + name + '»');
  }
  return sheet;
}

/** The «Бюджет» cells to write, and the rows that will hold the new articles (for the dropdown check). */
function planBudget(sheet, problems) {
  const height = sheet.getLastRow();
  const names = sheet.getRange(1, 2, height, 1).getValues().map(([name]) => String(name).trim());
  const formulas = sheet.getRange(1, 3, height, 1).getFormulas().map(([formula]) => formula);
  const rowOf = (label) => {
    const index = names.indexOf(label);
    if (index === -1) {
      throw new Error('На листе «' + BUDGET_SHEET + '» нет строки «' + label + '»');
    }
    return index + 1;
  };
  const sections = {
    regular: [rowOf(BUDGET_LABELS.expenses) + 1, rowOf(BUDGET_LABELS.regularTotal)],
    irregular: [rowOf(BUDGET_LABELS.regularTotal) + 1, rowOf(BUDGET_LABELS.irregularTotal)],
  };
  const [first, end] = [sections.regular[0], rowOf(BUDGET_LABELS.total)];
  const rowsNamed = (name) => {
    const rows = [];
    for (let row = first; row < end; row++) {
      if (names[row - 1] === name) rows.push(row);
    }
    return rows;
  };

  const writes = [];
  const articleRows = [];
  Object.keys(ARTICLE_RENAMES).forEach((old) => {
    const rows = rowsNamed(old);
    if (rows.length !== 1) {
      problems.push('статья «' + old + '» найдена ' + rows.length + ' раз');
      return;
    }
    writes.push([rows[0], ARTICLE_RENAMES[old]]);
    articleRows.push(rows[0]);
  });
  const newNames = Object.keys(ARTICLE_RENAMES)
    .map((old) => ARTICLE_RENAMES[old])
    .concat(ARTICLES_ADDED.regular, ARTICLES_ADDED.irregular);
  newNames
    .filter((name) => rowsNamed(name).length)
    .forEach((name) => problems.push('статья «' + name + '» уже есть (статьи уже обновлены?)'));

  Object.keys(ARTICLES_ADDED).forEach((section) => {
    const [from, to] = sections[section];
    const free = [];
    for (let row = from; row < to; row++) {
      if (!names[row - 1] && formulas[row - 1]) free.push(row);
    }
    const added = ARTICLES_ADDED[section];
    if (free.length < added.length) {
      problems.push('в разделе до строки ' + to + ' нет ' + added.length + ' пустых строк с формулами');
      return;
    }
    added.forEach((name, index) => {
      writes.push([free[index], name]);
      articleRows.push(free[index]);
    });
  });

  ARTICLES_REMOVED.forEach((name) => rowsNamed(name).forEach((row) => writes.push([row, ''])));
  return { sheet, writes, articleRows };
}

/** The new article column of «Расходы факт» / «Расходы План». */
function planArticleColumn(sheet, articleRows, timeZone, problems) {
  const name = sheet.getName();
  const height = sheet.getLastRow() - 1;
  if (height < 1) {
    return { sheet, range: null, values: null, changed: 0 };
  }
  const range = sheet.getRange(2, COL.article, height, 1);
  const original = range.getValues();
  if (range.getFormulas().some(([formula]) => formula)) {
    problems.push('в столбце «статья» листа «' + name + '» есть формулы');
  }
  checkDropdown(sheet, articleRows, problems);

  const rows = sheet.getRange(2, 1, height, COL.currency).getValues();
  const values = original.map(([article]) => {
    const trimmed = String(article).trim();
    return [trimmed in ARTICLE_RENAMES ? ARTICLE_RENAMES[trimmed] : article];
  });

  ROW_OVERRIDES.filter((override) => override.sheet === name).forEach((override) => {
    const matches = [];
    rows.forEach((row, index) => {
      const day = row[COL.date - 1] instanceof Date ? Utilities.formatDate(row[COL.date - 1], timeZone, 'yyyy-MM-dd') : '';
      if (
        String(row[COL.article - 1]).trim() === override.article &&
        day === override.day &&
        Math.abs(Number(row[COL.amount - 1]) - override.amount) < 1e-6 &&
        String(row[COL.currency - 1]).trim() === override.currency
      ) {
        matches.push(index);
      }
    });
    if (matches.length !== 1) {
      problems.push(
        '«' + name + '»: строка ' + override.day + ' ' + override.amount + ' ' + override.currency +
          ' найдена ' + matches.length + ' раз',
      );
      return;
    }
    values[matches[0]] = [override.to];
  });

  const changed = values.filter(([value], index) => value !== original[index][0]).length;
  return { sheet, range, values, changed };
}

/** The article dropdown must take its values from the «Бюджет» rows that will hold the new articles. */
function checkDropdown(sheet, articleRows, problems) {
  const rule = sheet.getRange(2, COL.article).getDataValidation();
  if (!rule || rule.getAllowInvalid()) {
    return;
  }
  const criteria = SpreadsheetApp.DataValidationCriteria;
  const [source] = rule.getCriteriaValues();
  const covers =
    rule.getCriteriaType() === criteria.VALUE_IN_RANGE &&
    source.getSheet().getName() === BUDGET_SHEET &&
    source.getColumn() === 2 &&
    articleRows.every((row) => row >= source.getRow() && row <= source.getLastRow());
  if (!covers) {
    problems.push(
      'выпадающий список статей на листе «' + sheet.getName() + '» не берётся из столбца B листа «' + BUDGET_SHEET +
        '» целиком: новые статьи он не примет',
    );
  }
}
