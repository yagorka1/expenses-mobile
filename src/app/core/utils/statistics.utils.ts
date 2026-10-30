import { CurrencyCode } from '../constants/expense.constants';
import { CategoryNames } from '../models/category.model';
import { EurRates } from '../models/exchange-rates.model';
import { Expense } from '../models/expense.model';
import { BreakdownItem, DayGroup, ExpenseStatistics } from '../models/statistics.model';
import { toDateInputValue } from './date.utils';
import { convertAmount, roundMoney } from './currency.utils';

interface ExpenseGroup {
  key: string;
  label: string;
  expenses: Expense[];
}

function groupExpenses(
  expenses: readonly Expense[],
  getKey: (expense: Expense) => string,
  getLabel: (expense: Expense) => string,
): ExpenseGroup[] {
  const groups = new Map<string, ExpenseGroup>();
  for (const expense of expenses) {
    const key = getKey(expense);
    const group = groups.get(key) ?? { key, label: getLabel(expense), expenses: [] };
    group.expenses.push(expense);
    groups.set(key, group);
  }
  return [...groups.values()];
}

/**
 * The stored conversion when there is one. Migrated expenses may lack it: then the original amount
 * is used if it's already in `currency`, otherwise it's converted with `fallbackRates`.
 */
function amountIn(expense: Expense, currency: CurrencyCode, fallbackRates: EurRates | null): number {
  const stored = expense.amounts[currency];
  if (stored !== undefined) {
    return stored;
  }
  if (expense.currency === currency) {
    return expense.amount;
  }
  return fallbackRates ? convertAmount(expense.amount, expense.currency, currency, fallbackRates) : 0;
}

type SumIn = (expenses: readonly Expense[]) => number;

/**
 * Whole percents of the shares that add up to 100 (largest remainder method), so that rounding
 * never makes a list total 99% or 101%.
 */
export function toPercents(shares: readonly number[]): number[] {
  const exact = shares.map((share) => share * 100);
  const percents = exact.map(Math.floor);
  const target = Math.min(100, Math.round(exact.reduce((sum, value) => sum + value, 0)));
  const missing = Math.max(0, target - percents.reduce((sum, value) => sum + value, 0));
  exact
    .map((value, index) => ({ index, remainder: value - percents[index] }))
    .sort((a, b) => b.remainder - a.remainder)
    .slice(0, missing)
    .forEach(({ index }) => percents[index]++);
  return percents;
}

/** `total` is what shares are relative to: the period total, or the parent item's amount. */
function toBreakdown(
  groups: ExpenseGroup[],
  sumIn: SumIn,
  total: number,
  getChildren: (group: ExpenseGroup, amount: number) => BreakdownItem[] = () => [],
): BreakdownItem[] {
  const items = groups
    .map((group) => {
      const amount = sumIn(group.expenses);
      return {
        key: group.key,
        label: group.label,
        amount,
        share: total > 0 ? amount / total : 0,
        children: getChildren(group, amount),
      };
    })
    .sort((a, b) => b.amount - a.amount);
  const percents = toPercents(items.map((item) => item.share));
  return items.map((item, index) => ({ ...item, percent: percents[index] }));
}

/** Grouped by ids and labelled with the current names; an old expense without ids, by its stored names. */
export function buildStatistics(
  expenses: readonly Expense[],
  currency: CurrencyCode,
  fallbackRates: EurRates | null,
  names: CategoryNames,
): ExpenseStatistics {
  const sumIn: SumIn = (group) =>
    roundMoney(group.reduce((sum, expense) => sum + amountIn(expense, currency, fallbackRates), 0));
  const total = sumIn(expenses);

  const byCategory = toBreakdown(
    groupExpenses(expenses, (e) => e.categoryId || `name:${e.storedCategoryName}`, names.category),
    sumIn,
    total,
    (category, categoryAmount) =>
      toBreakdown(
        groupExpenses(category.expenses, (e) => e.subcategoryId || `name:${e.storedSubcategoryName}`, names.subcategory),
        sumIn,
        categoryAmount,
      ),
  );

  const byPerson = toBreakdown(
    groupExpenses(expenses, (e) => e.person, (e) => e.person),
    sumIn,
    total,
  );

  return { total, count: expenses.length, byCategory, byPerson };
}

/**
 * Expects expenses sorted by date (newest first) and keeps the order of the days. Within a day the
 * last added expense comes first: app expenses all share the noon of their day.
 */
export function groupExpensesByDay(expenses: readonly Expense[]): DayGroup[] {
  return groupExpenses(expenses, (e) => toDateInputValue(e.date), () => '').map((group) => ({
    key: group.key,
    date: group.expenses[0].date,
    expenses: [...group.expenses].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
  }));
}
