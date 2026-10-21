import { Expense } from './expense.model';

export type StatisticsPeriod = 'week' | 'month' | 'previous-month' | 'year';
/** `custom` means the range is picked by the user. */
export type StatisticsPeriodSelection = StatisticsPeriod | 'custom';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface BreakdownItem {
  key: string;
  label: string;
  amount: number;
  /** Fraction of the period total, 0..1. */
  share: number;
  children: BreakdownItem[];
}

export interface ExpenseStatistics {
  total: number;
  count: number;
  byCategory: BreakdownItem[];
  byPerson: BreakdownItem[];
}

export interface DayGroup {
  key: string;
  date: Date;
  expenses: Expense[];
}
