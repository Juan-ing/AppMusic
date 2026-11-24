import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const isReady = () => Boolean(
    authService.user() && authService.profile()?.uid === authService.user()?.uid,
  );
  if (authService.loading()) {
    return authService.waitForInitialAuth().then(() => isReady() ? true : router.parseUrl('/login'));
  }
  return isReady() ? true : router.parseUrl('/login');
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const isReady = () => Boolean(
    authService.user() && authService.profile()?.uid === authService.user()?.uid,
  );
  if (authService.loading()) {
    return authService.waitForInitialAuth().then(() => isReady() ? router.parseUrl('/dashboard') : true);
  }
  return isReady() ? router.parseUrl('/dashboard') : true;
};
