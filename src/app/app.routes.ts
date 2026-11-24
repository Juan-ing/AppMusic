import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/landing/landing.component').then(
        (component) => component.LandingComponent,
      ),
  },
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
      {
        path: 'playlists',
        loadComponent: () =>
          import('./features/playlists/playlists.component').then(
            (component) => component.PlaylistsComponent,
          ),
      },
      {
        path: 'chat',
        loadComponent: () =>
          import('./features/chat/chat.component').then(
            (component) => component.ChatComponent,
          ),
      },
      {
        path: 'store',
        loadComponent: () =>
          import('./features/store/store.component').then(
            (component) => component.StoreComponent,
          ),
      },
      {
        path: 'cart',
        loadComponent: () =>
          import('./features/cart/cart.component').then(
            (component) => component.CartComponent,
          ),
      },
      {
        path: 'tours',
        loadComponent: () =>
          import('./features/tours/tours.component').then(
            (component) => component.ToursComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then(
            (component) => component.ProfileComponent,
          ),
      },
    ],
  },
  {
    path: 'artist/:id',
    loadComponent: () =>
      import('./features/artist/artist.component').then(
        (component) => component.ArtistComponent,
      ),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then(
        (component) => component.NotFoundComponent,
      ),
  },
];
