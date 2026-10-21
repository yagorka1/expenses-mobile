import { EurRates } from '../models/exchange-rates.model';
import { CurrencyCode } from './expense.constants';

export const BASE_CURRENCY: CurrencyCode = 'EUR';

/** fawazahmed0/exchange-api (free, no key, updated daily); the second URL is its official mirror. */
export const EXCHANGE_RATES_URLS: readonly string[] = [
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json',
  'https://latest.currency-api.pages.dev/v1/currencies/eur.json',
];
export const EXCHANGE_RATES_TIMEOUT_MS = 5_000;
export const EXCHANGE_RATES_TTL_MS = 12 * 60 * 60 * 1_000;

/** Used only when there are no cached rates and the network is unavailable. */
export const FALLBACK_EUR_RATES: EurRates = {
  EUR: 1,
  USD: 1.12,
  PLN: 4.37,
  RSD: 117.4,
  BYN: 3.34,
};
