import { CategoryNames } from '../models/category.model';
import { EurRates } from '../models/exchange-rates.model';
import { Expense } from '../models/expense.model';
import { fromDateInputValue } from './date.utils';
import { buildStatistics, groupExpensesByDay, toPercents } from './statistics.utils';

const RATES: EurRates = { EUR: 1, USD: 1.12280227, PLN: 4.36666929, RSD: 117.43791192, BYN: 3.342659 };

const CATEGORY_NAMES: Record<string, string> = { food: 'Еда', home: 'Дом' };
const SUBCATEGORY_NAMES: Record<string, string> = { shop: 'Магазин', cafe: 'Кафе', rent: 'Аренда' };
/** Same fallback order as `CategoriesRepository.names`. */
const NAMES: CategoryNames = {
  category: (e) => CATEGORY_NAMES[e.categoryId] || e.storedCategoryName || '?',
  subcategory: (e) => SUBCATEGORY_NAMES[e.subcategoryId] || e.storedSubcategoryName || '?',
};

const expense = (overrides: Partial<Expense>): Expense => ({
  id: 'id',
  amount: 10,
  currency: 'EUR',
  categoryId: 'food',
  subcategoryId: 'shop',
  storedCategoryName: '',
  storedSubcategoryName: '',
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
    }),
    // Migrated without conversions.
    expense({
      id: '3',
      amount: 2000,
      currency: 'RSD',
      person: 'Общее',
      categoryId: 'home',
      subcategoryId: 'rent',
    }),
  ];

  it('sums the stored conversions and converts the missing ones', () => {
    expect(buildStatistics(expenses, 'EUR', RATES, NAMES).total).toBe(35.55);
    expect(buildStatistics(expenses, 'RSD', RATES, NAMES).total).toBe(4174.38);
  });

  it('groups by id with the current name, whatever name an old expense was saved with', () => {
    const { byCategory } = buildStatistics(
      [
        expense({ id: '1', amounts: { EUR: 10 } }),
        expense({ id: '2', amounts: { EUR: 5 }, storedCategoryName: 'Продукты', storedSubcategoryName: 'Супермаркет' }),
      ],
      'EUR',
      RATES,
      NAMES,
    );

    expect(byCategory.map(({ label, amount }) => ({ label, amount }))).toEqual([{ label: 'Еда', amount: 15 }]);
    expect(byCategory[0].children.map((item) => item.label)).toEqual(['Магазин']);
  });

  it('groups old expenses without ids by their stored names', () => {
    const { byCategory } = buildStatistics(
      [
        expense({ id: '1', amounts: { EUR: 10 }, categoryId: '', subcategoryId: '', storedCategoryName: 'Старое' }),
        expense({ id: '2', amounts: { EUR: 5 }, categoryId: '', subcategoryId: '', storedCategoryName: 'Старое' }),
        expense({ id: '3', amounts: { EUR: 1 } }),
      ],
      'EUR',
      RATES,
      NAMES,
    );

    expect(byCategory.map(({ label, amount }) => ({ label, amount }))).toEqual([
      { label: 'Старое', amount: 15 },
      { label: 'Еда', amount: 1 },
    ]);
  });

  it('gives percents that add up to 100 in every list', () => {
    const { byCategory, byPerson } = buildStatistics(expenses, 'EUR', RATES, NAMES);
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
