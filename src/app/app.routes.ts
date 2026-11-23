import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (component) => component.LoginComponent,
      ),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register/register.component').then(
        (component) => component.RegisterComponent,
      ),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/layout/main-layout/main-layout.component').then(
        (component) => component.MainLayoutComponent,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      {
        path: 'home',
        loadComponent: () =>
          import('./features/home/home/home.component').then(
            (component) => component.HomeComponent,
          ),
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./features/search/search/search.component').then(
            (component) => component.SearchComponent,
          ),
      },
      {
        path: 'library',
        loadComponent: () =>
          import('./features/library/library/library.component').then(
            (component) => component.LibraryComponent,
          ),
      },
      {
        path: 'favorites',
        loadComponent: () =>
          import('./features/favorites/favorites/favorites.component').then(
            (component) => component.FavoritesComponent,
          ),
      },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
