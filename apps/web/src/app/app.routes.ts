import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePageComponent) },
  { path: 'movie/:id', loadComponent: () => import('./pages/movie-detail/movie-detail.page').then((m) => m.MovieDetailPageComponent) },
  { path: 'showtime/:id', loadComponent: () => import('./pages/showtime/showtime.page').then((m) => m.ShowtimePageComponent), canActivate: [authGuard] },
  { path: 'tickets', loadComponent: () => import('./pages/tickets/tickets.page').then((m) => m.TicketsPageComponent), canActivate: [authGuard] },
  { path: 'ticket/:id', loadComponent: () => import('./pages/ticket/ticket.page').then((m) => m.TicketPageComponent), canActivate: [authGuard] },
  { path: 'profile', loadComponent: () => import('./pages/profile/profile.page').then((m) => m.ProfilePageComponent), canActivate: [authGuard] },
  {
    path: 'auth',
    loadComponent: () => import('./layouts/auth-layout.component').then((m) => m.AuthLayoutComponent),
    children: [
      { path: 'login', loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPageComponent) },
      { path: 'register', loadComponent: () => import('./pages/register/register.page').then((m) => m.RegisterPageComponent) },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '' },
];
