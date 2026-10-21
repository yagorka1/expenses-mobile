import { CurrencyCode } from '../constants/expense.constants';

/** How many units of each currency equal 1 EUR. */
export type EurRates = Record<CurrencyCode, number>;

export interface CachedExchangeRates {
  rates: EurRates;
  fetchedAt: number;
}

/** Rates are keyed by lowercase currency codes, e.g. `{ date, eur: { usd: 1.12, ... } }`. */
export interface CurrencyApiResponse {
  date: string;
  eur: Partial<Record<string, number>>;
}
