import { SelectOption } from '../models/select-option.model';
import { StatisticsPeriod } from '../models/statistics.model';

export const APP_LOCALE = 'ru';
export const APP_LOCALE_TAG = 'ru-RU';

export const TOAST_DURATION_MS = 3_000;

export const DATE_FORMATS = {
  dayHeader: 'EEEE, d MMMM',
  full: 'd MMMM y',
  short: 'd MMM',
} as const;

export const PERCENT_FORMAT = '1.0-0';

export const STATISTICS_PERIOD_OPTIONS: readonly SelectOption<StatisticsPeriod>[] = [
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'previous-month', label: 'Прошлый месяц' },
  { value: 'year', label: 'Год' },
];

export const DEFAULT_STATISTICS_PERIOD: StatisticsPeriod = 'month';
