export const APP_ROUTES = {
  login: 'login',
  addExpense: 'add',
  expenses: 'expenses',
  statistics: 'statistics',
} as const;

export const ROUTE_PARAMS = {
  expenseId: 'id',
} as const;

export const ROUTE_SEGMENTS = {
  edit: 'edit',
} as const;

export const ROUTE_LINKS = {
  login: `/${APP_ROUTES.login}`,
  addExpense: `/${APP_ROUTES.addExpense}`,
  expenses: `/${APP_ROUTES.expenses}`,
  statistics: `/${APP_ROUTES.statistics}`,
  expenseDetails: (id: string): string[] => ['/', APP_ROUTES.expenses, id],
  editExpense: (id: string): string[] => ['/', APP_ROUTES.expenses, id, ROUTE_SEGMENTS.edit],
} as const;
