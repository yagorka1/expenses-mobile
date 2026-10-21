import { StatisticsPeriod } from './statistics.model';

/** An empty string means "any". */
export type ExpensePeriodFilter = StatisticsPeriod | '';

export interface ExpenseFilter {
  period: ExpensePeriodFilter;
  person: string;
  categoryId: string;
  /** Only set together with `categoryId`. */
  subcategoryId: string;
}
