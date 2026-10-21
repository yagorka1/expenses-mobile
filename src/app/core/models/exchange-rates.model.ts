import { CurrencyCode } from '../constants/expense.constants';

/** How many units of each currency equal 1 EUR. */
export type EurRates = Record<CurrencyCode, number>;

export interface RatesSnapshot {
  rates: EurRates;
  /**
   * `YYYY-MM-DD` the rates were published for; `null` when they only stand in for the exact ones
   * (not loaded yet: stale or another day's rates, or the built-in fallback).
   */
  date: string | null;
}

/** Rates the API published for `date`. */
export interface PublishedRates extends RatesSnapshot {
  date: string;
}

export interface CachedExchangeRates {
  rates: EurRates;
  date: string;
  fetchedAt: number;
}

/** Rates of past days never change, so they are cached by day without expiry. */
export type HistoricalRatesCache = Partial<Record<string, EurRates>>;

/** Rates are keyed by lowercase currency codes, e.g. `{ date, eur: { usd: 1.12, ... } }`. */
export interface CurrencyApiResponse {
  date: string;
  eur: Partial<Record<string, number>>;
}
