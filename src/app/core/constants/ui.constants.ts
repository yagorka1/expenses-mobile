import { ExpenseFilter, ExpensePeriodFilter } from '../models/expense-filter.model';
import { SelectOption } from '../models/select-option.model';
import { StatisticsPeriod, StatisticsPeriodSelection } from '../models/statistics.model';

export const APP_LOCALE = 'ru';
export const APP_LOCALE_TAG = 'ru-RU';

export const TOAST_DURATION_MS = 3_000;

/** How long a deleted expense can still be restored: it's hidden at once and deleted after this. */
export const UNDO_DELETE_MS = 5_000;

export const DATE_FORMATS = {
  dayHeader: 'EEEE, d MMMM',
  full: 'd MMMM y',
  short: 'd MMM',
  shortWithYear: 'd MMM y',
} as const;

export const PERCENT_FORMAT = '1.0-0';

export const STATISTICS_PERIOD_OPTIONS: readonly SelectOption<StatisticsPeriod>[] = [
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'previous-month', label: 'Прошлый месяц' },
  { value: 'year', label: 'Год' },
];

export const DEFAULT_STATISTICS_PERIOD: StatisticsPeriod = 'month';

export const CUSTOM_STATISTICS_PERIOD = 'custom' satisfies StatisticsPeriodSelection;

export const STATISTICS_PERIOD_SELECTION_OPTIONS: readonly SelectOption<StatisticsPeriodSelection>[] = [
  ...STATISTICS_PERIOD_OPTIONS,
  { value: CUSTOM_STATISTICS_PERIOD, label: 'Свои даты' },
];

/** Chip value that disables a filter. */
export const ANY_FILTER_VALUE = '';
export const ANY_FILTER_LABEL = 'Все';

export const EXPENSE_PERIOD_FILTER_OPTIONS: readonly SelectOption<ExpensePeriodFilter>[] = [
  { value: ANY_FILTER_VALUE, label: 'Всё время' },
  ...STATISTICS_PERIOD_OPTIONS,
];

export const EMPTY_EXPENSE_FILTER: ExpenseFilter = {
  period: ANY_FILTER_VALUE,
  person: ANY_FILTER_VALUE,
  categoryId: ANY_FILTER_VALUE,
  subcategoryId: ANY_FILTER_VALUE,
};
