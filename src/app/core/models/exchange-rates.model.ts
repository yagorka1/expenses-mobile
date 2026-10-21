import { CurrencyCode } from '../constants/expense.constants';

/** How many units of each currency equal 1 EUR. */
export type EurRates = Record<CurrencyCode, number>;

export interface CachedExchangeRates {
  rates: EurRates;
  fetchedAt: number;
}

export interface FrankfurterResponse {
  base: string;
  date: string;
  rates: Partial<Record<string, number>>;
}
