import { fromDateInputValue, getDateInputRange, getPeriodRange, toDateInputValue } from './date.utils';

const noon = (year: number, month: number, day: number): Date => new Date(year, month - 1, day, 12);
const startOf = (year: number, month: number, day: number): Date => new Date(year, month - 1, day);
const endOf = (year: number, month: number, day: number): Date => new Date(year, month - 1, day, 23, 59, 59, 999);

describe('getPeriodRange', () => {
  it('starts the week on Monday, also on a Sunday when the clocks go back', () => {
    expect(getPeriodRange('week', noon(2026, 10, 25))).toEqual({ from: startOf(2026, 10, 19), to: endOf(2026, 10, 25) });
  });

  it('takes the whole month, including 29 February', () => {
    expect(getPeriodRange('month', noon(2028, 2, 10))).toEqual({ from: startOf(2028, 2, 1), to: endOf(2028, 2, 29) });
  });

  it('reaches into the previous year for the previous month in January', () => {
    expect(getPeriodRange('previous-month', noon(2026, 1, 15))).toEqual({
      from: startOf(2025, 12, 1),
      to: endOf(2025, 12, 31),
    });
  });

  it('takes the whole year', () => {
    expect(getPeriodRange('year', noon(2026, 10, 21))).toEqual({ from: startOf(2026, 1, 1), to: endOf(2026, 12, 31) });
  });
});

describe('getDateInputRange', () => {
  it('takes whole days with the bounds in any order', () => {
    expect(getDateInputRange('2026-10-21', '2026-10-01')).toEqual({ from: startOf(2026, 10, 1), to: endOf(2026, 10, 21) });
  });
});

describe('date input values', () => {
  it('survive a round trip through the noon of the day', () => {
    for (const value of ['2026-10-25', '2026-03-29', '2024-02-29', '2026-01-01']) {
      expect(toDateInputValue(fromDateInputValue(value))).toBe(value);
    }
  });
});
