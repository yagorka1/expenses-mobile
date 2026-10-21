export const CURRENCIES = ['RSD', 'EUR', 'USD', 'BYN', 'PLN'] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY: CurrencyCode = 'RSD';

export const STATISTICS_CURRENCIES: readonly CurrencyCode[] = ['EUR', 'RSD'];
export const DEFAULT_STATISTICS_CURRENCY: CurrencyCode = 'EUR';

export const PERSONS = ['Егор', 'Юлианна', 'Общее'] as const;
export type Person = (typeof PERSONS)[number];

/** Digits with an optional 1–2 digit fraction; both "." and "," are accepted (iOS decimal keypad). */
export const AMOUNT_PATTERN = /^\d+([.,]\d{1,2})?$/;
export const DESCRIPTION_MAX_LENGTH = 200;
/** Earlier dates are typos (e.g. a two-digit year). Keep in sync with firestore.rules. */
export const MIN_EXPENSE_DATE = '2000-01-01';

export const RECENT_EXPENSES_PAGE_SIZE = 30;

export const EXPENSE_SOURCES = {
  app: 'app',
  bot: 'bot',
  migration: 'migration',
} as const;
export type ExpenseSource = (typeof EXPENSE_SOURCES)[keyof typeof EXPENSE_SOURCES];
