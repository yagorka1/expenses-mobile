import { DateRange, StatisticsPeriod } from '../models/statistics.model';

/** Hour used for dates picked without a time, so timezone shifts never move them to another day. */
const DATE_ONLY_HOUR = 12;
const DAYS_IN_WEEK = 7;

const pad = (value: number): string => String(value).padStart(2, '0');

/** Local date as `YYYY-MM-DD` (the format of `<input type="date">`). */
export function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDateInputValue(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, DATE_ONLY_HOUR);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

const startOfDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const endOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

export function getPeriodRange(period: StatisticsPeriod, now: Date = new Date()): DateRange {
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (period) {
    case 'week': {
      const daysSinceMonday = (now.getDay() + DAYS_IN_WEEK - 1) % DAYS_IN_WEEK;
      const monday = startOfDay(addDays(now, -daysSinceMonday));
      return { from: monday, to: endOfDay(addDays(monday, DAYS_IN_WEEK - 1)) };
    }
    case 'month':
      return { from: new Date(year, month, 1), to: endOfDay(new Date(year, month + 1, 0)) };
    case 'previous-month':
      return { from: new Date(year, month - 1, 1), to: endOfDay(new Date(year, month, 0)) };
    case 'year':
      return { from: new Date(year, 0, 1), to: endOfDay(new Date(year, 11, 31)) };
  }
}
