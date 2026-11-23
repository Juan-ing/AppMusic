import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (authService.loading()) return authService.waitForInitialAuth().then((user) => user ? true : router.parseUrl('/login'));
  return authService.user() ? true : router.parseUrl('/login');
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (authService.loading()) return authService.waitForInitialAuth().then((user) => user ? router.parseUrl('/dashboard') : true);
  return authService.user() ? router.parseUrl('/dashboard') : true;
};
