import { EurRates } from '../models/exchange-rates.model';
import { convertToAllCurrencies, hasAllAmounts, parseAmount } from './currency.utils';

/** Published by the API for 2026-10-21. */
const RATES: EurRates = { EUR: 1, USD: 1.12280227, PLN: 4.36666929, RSD: 117.43791192, BYN: 3.342659 };

describe('convertToAllCurrencies', () => {
  it('converts through EUR and rounds to cents', () => {
    expect(convertToAllCurrencies(1000, 'RSD', RATES)).toEqual({ RSD: 1000, EUR: 8.52, USD: 9.56, BYN: 28.46, PLN: 37.18 });
    expect(convertToAllCurrencies(50, 'BYN', RATES)).toEqual({ RSD: 1756.65, EUR: 14.96, USD: 16.8, BYN: 50, PLN: 65.32 });
  });

  it('keeps the amount as it is in its own currency', () => {
    expect(convertToAllCurrencies(12.5, 'EUR', RATES).EUR).toBe(12.5);
  });
});

describe('parseAmount', () => {
  it('accepts a comma as the decimal separator', () => {
    expect(parseAmount(' 12,50 ')).toBe(12.5);
  });

  it('rejects anything but a number', () => {
    expect(parseAmount('12abc')).toBeNaN();
  });
});

describe('hasAllAmounts', () => {
  it('needs a conversion into every currency', () => {
    expect(hasAllAmounts(convertToAllCurrencies(1, 'EUR', RATES))).toBe(true);
    expect(hasAllAmounts({ EUR: 1, RSD: 117.44 })).toBe(false);
  });
});
