import { Routes } from '@angular/router';
import { APP_ROUTES, ROUTE_PARAMS } from './core/constants/app-routes';
import { PAGE_TITLES } from './core/constants/messages';
import { authGuard, guestGuard } from './core/guards/auth.guards';

export const routes: Routes = [
  {
    path: APP_ROUTES.login,
    canActivate: [guestGuard],
    title: PAGE_TITLES.login,
    loadComponent: () => import('./features/auth/login-page/login-page').then((m) => m.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: APP_ROUTES.addExpense },
      {
        path: APP_ROUTES.addExpense,
        title: PAGE_TITLES.addExpense,
        loadComponent: () =>
          import('./features/expense-form/expense-form-page/expense-form-page').then((m) => m.ExpenseFormPage),
      },
      {
        path: APP_ROUTES.expenses,
        title: PAGE_TITLES.expenses,
        loadComponent: () => import('./features/expenses/expenses-page/expenses-page').then((m) => m.ExpensesPage),
      },
      {
        path: `${APP_ROUTES.expenses}/:${ROUTE_PARAMS.expenseId}`,
        title: PAGE_TITLES.expenseDetails,
        loadComponent: () =>
          import('./features/expenses/expense-details-page/expense-details-page').then((m) => m.ExpenseDetailsPage),
      },
      {
        path: APP_ROUTES.statistics,
        title: PAGE_TITLES.statistics,
        loadComponent: () =>
          import('./features/statistics/statistics-page/statistics-page').then((m) => m.StatisticsPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
