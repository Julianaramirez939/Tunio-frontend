import { Routes } from '@angular/router';

export const ANALYTICS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./analytics-shell.component').then((m) => m.AnalyticsShellComponent),
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./dashboard.component').then((m) => m.DashboardComponent) },
      { path: 'diagnostico', loadComponent: () => import('./diagnostics.component').then((m) => m.DiagnosticsComponent) },
    ],
  },
];
