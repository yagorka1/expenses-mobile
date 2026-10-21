import { CURRENCIES, CurrencyCode } from '../constants/expense.constants';
import { CurrencyAmounts } from '../models/expense.model';
import { EurRates } from '../models/exchange-rates.model';

const CENTS = 100;

export function roundMoney(value: number): number {
  return Math.round(value * CENTS) / CENTS;
}

/** Parses user input like "12", "12.5" or "12,50"; returns NaN for anything else. */
export function parseAmount(value: string): number {
  return Number(value.trim().replace(',', '.'));
}

/** Converts through EUR, like expenses-server did; not rounded. */
export function convertAmount(amount: number, from: CurrencyCode, to: CurrencyCode, eurRates: EurRates): number {
  return from === to ? amount : (amount / eurRates[from]) * eurRates[to];
}

/** Converts an amount into every supported currency. */
export function convertToAllCurrencies(amount: number, currency: CurrencyCode, eurRates: EurRates): CurrencyAmounts {
  return Object.fromEntries(
    CURRENCIES.map((target) => [target, roundMoney(convertAmount(amount, currency, target, eurRates))]),
  );
}

/** Migrated expenses may have no or only some conversions. */
export function hasAllAmounts(amounts: CurrencyAmounts): boolean {
  return CURRENCIES.every((code) => amounts[code] !== undefined);
}
