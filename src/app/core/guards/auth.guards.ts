import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ROUTE_LINKS } from '../constants/app-routes';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ready();
  return auth.isAuthenticated() || router.parseUrl(ROUTE_LINKS.login);
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ready();
  return !auth.isAuthenticated() || router.parseUrl(ROUTE_LINKS.addExpense);
};
