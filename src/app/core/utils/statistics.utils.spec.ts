import { EurRates } from '../models/exchange-rates.model';
import { Expense } from '../models/expense.model';
import { fromDateInputValue } from './date.utils';
import { buildStatistics, groupExpensesByDay, toPercents } from './statistics.utils';

const RATES: EurRates = { EUR: 1, USD: 1.12280227, PLN: 4.36666929, RSD: 117.43791192, BYN: 3.342659 };

const expense = (overrides: Partial<Expense>): Expense => ({
  id: 'id',
  amount: 10,
  currency: 'EUR',
  categoryId: 'food',
  categoryName: 'Еда',
  subcategoryId: 'shop',
  subcategoryName: 'Магазин',
  person: 'Егор',
  description: '',
  date: fromDateInputValue('2026-10-21'),
  createdAt: new Date(2026, 9, 21, 9),
  amounts: {},
  ratesDate: '2026-10-21',
  approximateAmounts: false,
  isPending: false,
  ...overrides,
});

describe('toPercents', () => {
  it('adds up to exactly 100', () => {
    expect(toPercents([1 / 3, 1 / 3, 1 / 3])).toEqual([34, 33, 33]);
    expect(toPercents([0.125, 0.125, 0.75])).toEqual([13, 12, 75]);
  });

  it('keeps zero shares at zero', () => {
    expect(toPercents([0, 0])).toEqual([0, 0]);
  });
});

describe('buildStatistics', () => {
  const expenses = [
    expense({ id: '1', amount: 1000, currency: 'RSD', amounts: { EUR: 8.52, RSD: 1000 } }),
    expense({
      id: '2',
      amounts: { EUR: 10, RSD: 1174.38 },
      person: 'Юлианна',
      subcategoryId: 'cafe',
      subcategoryName: 'Кафе',
    }),
    // Migrated without conversions.
    expense({
      id: '3',
      amount: 2000,
      currency: 'RSD',
      person: 'Общее',
      categoryId: 'home',
      categoryName: 'Дом',
      subcategoryId: 'rent',
      subcategoryName: 'Аренда',
    }),
  ];

  it('sums the stored conversions and converts the missing ones', () => {
    expect(buildStatistics(expenses, 'EUR', RATES).total).toBe(35.55);
    expect(buildStatistics(expenses, 'RSD', RATES).total).toBe(4174.38);
  });

  it('gives percents that add up to 100 in every list', () => {
    const { byCategory, byPerson } = buildStatistics(expenses, 'EUR', RATES);
    const sum = (items: { percent: number }[]): number => items.reduce((total, item) => total + item.percent, 0);

    expect(sum(byCategory)).toBe(100);
    expect(sum(byPerson)).toBe(100);
    for (const category of byCategory) {
      expect(sum(category.children)).toBe(100);
    }
  });
});

describe('groupExpensesByDay', () => {
  it('keeps the days in order and lists the last added expense of a day first', () => {
    const groups = groupExpensesByDay([
      expense({ id: 'morning', createdAt: new Date(2026, 9, 21, 9) }),
      expense({ id: 'evening', createdAt: new Date(2026, 9, 21, 18) }),
      expense({ id: 'yesterday', date: fromDateInputValue('2026-10-20'), createdAt: new Date(2026, 9, 21, 8) }),
    ]);

    expect(groups.map((group) => group.key)).toEqual(['2026-10-21', '2026-10-20']);
    expect(groups[0].expenses.map((item) => item.id)).toEqual(['evening', 'morning']);
  });
});
