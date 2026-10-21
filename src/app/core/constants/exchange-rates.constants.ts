import { EurRates } from '../models/exchange-rates.model';
import { CurrencyCode } from './expense.constants';

export const BASE_CURRENCY: CurrencyCode = 'EUR';

export const EXCHANGE_RATES_URL = 'https://api.frankfurter.app/latest';
export const EXCHANGE_RATES_TIMEOUT_MS = 5_000;
export const EXCHANGE_RATES_TTL_MS = 12 * 60 * 60 * 1_000;

/** Currencies whose rates are fetched from Frankfurter (ECB data). */
export const MARKET_CURRENCIES: readonly CurrencyCode[] = ['USD', 'PLN'];

/** ECB doesn't publish RSD/BYN, so they use fixed rates (1 EUR = N units), same as expenses-server. */
export const FIXED_EUR_RATES: Partial<EurRates> = {
  RSD: 117.4,
  BYN: 3.39,
};

/** Used only when there are no cached rates and the network is unavailable. */
export const FALLBACK_EUR_RATES: EurRates = {
  EUR: 1,
  USD: 1.12,
  PLN: 4.36,
  RSD: 117.4,
  BYN: 3.39,
};
