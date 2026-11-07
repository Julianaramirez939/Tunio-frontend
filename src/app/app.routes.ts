import { Routes } from '@angular/router';
import { authGuard, loggedInGuard, roleGuard } from './core/guards';

// Tres zonas con carga diferida: acceso, pantalla del bar y paneles.
export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'select-venue',
    canActivate: [loggedInGuard],
    loadComponent: () => import('./features/auth/select-venue.component').then((m) => m.SelectVenueComponent),
  },
  {
    // La abre un ADMIN: es quien puede leer el token del QR (docs/00, decisión 13).
    path: 'bar',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () => import('./features/bar/bar-screen.component').then((m) => m.BarScreenComponent),
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  { path: '', pathMatch: 'full', redirectTo: 'admin' },
  { path: '**', redirectTo: 'admin' },
];
