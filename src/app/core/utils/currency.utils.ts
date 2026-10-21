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

/** Converts an amount into every supported currency through EUR, like expenses-server did. */
export function convertToAllCurrencies(amount: number, currency: CurrencyCode, eurRates: EurRates): CurrencyAmounts {
  const amountInEur = amount / eurRates[currency];

  return Object.fromEntries(
    CURRENCIES.map((target) => [
      target,
      target === currency ? roundMoney(amount) : roundMoney(amountInEur * eurRates[target]),
    ]),
  );
}
