import { CurrencyCode } from '../constants/expense.constants';
import { Expense } from '../models/expense.model';
import { BreakdownItem, DayGroup, ExpenseStatistics } from '../models/statistics.model';
import { toDateInputValue } from './date.utils';
import { roundMoney } from './currency.utils';

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

const sumIn = (expenses: readonly Expense[], currency: CurrencyCode): number =>
  roundMoney(expenses.reduce((sum, expense) => sum + (expense.amounts[currency] ?? 0), 0));

function toBreakdown(
  groups: ExpenseGroup[],
  currency: CurrencyCode,
  total: number,
  getChildren: (group: ExpenseGroup) => BreakdownItem[] = () => [],
): BreakdownItem[] {
  return groups
    .map((group) => {
      const amount = sumIn(group.expenses, currency);
      return {
        key: group.key,
        label: group.label,
        amount,
        share: total > 0 ? amount / total : 0,
        children: getChildren(group),
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

export function buildStatistics(expenses: readonly Expense[], currency: CurrencyCode): ExpenseStatistics {
  const total = sumIn(expenses, currency);

  const byCategory = toBreakdown(
    groupExpenses(expenses, (e) => e.categoryId || e.categoryName, (e) => e.categoryName),
    currency,
    total,
    (category) =>
      toBreakdown(
        groupExpenses(category.expenses, (e) => e.subcategoryId || e.subcategoryName, (e) => e.subcategoryName),
        currency,
        total,
      ),
  );

  const byPerson = toBreakdown(
    groupExpenses(expenses, (e) => e.person, (e) => e.person),
    currency,
    total,
  );

  return { total, count: expenses.length, byCategory, byPerson };
}

/** Expects expenses sorted by date (newest first) and keeps that order. */
export function groupExpensesByDay(expenses: readonly Expense[]): DayGroup[] {
  return groupExpenses(expenses, (e) => toDateInputValue(e.date), () => '').map((group) => ({
    key: group.key,
    date: group.expenses[0].date,
    expenses: group.expenses,
  }));
}
