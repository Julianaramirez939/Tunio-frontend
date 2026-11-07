import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards';

const adminOnly = { canActivate: [roleGuard], data: { roles: ['ADMIN'] } };

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./admin-shell.component').then((m) => m.AdminShellComponent),
    children: [
      // DJ y ADMIN: la operación de la noche y su bitácora.
      {
        path: 'operacion',
        loadComponent: () => import('./operation/operation.component').then((m) => m.OperationComponent),
      },
      {
        path: 'bitacora',
        loadComponent: () => import('./audit-log/audit-log.component').then((m) => m.AuditLogComponent),
      },
      // Solo ADMIN.
      {
        path: '',
        ...adminOnly,
        children: [
          { path: 'analitica', loadChildren: () => import('../analytics/analytics.routes').then((m) => m.ANALYTICS_ROUTES) },
          { path: 'lista', loadComponent: () => import('./playlist/playlist.component').then((m) => m.PlaylistComponent) },
          { path: 'generos', loadComponent: () => import('./genres/genres.component').then((m) => m.GenresComponent) },
          { path: 'configuracion', loadComponent: () => import('./settings/settings.component').then((m) => m.SettingsComponent) },
        ],
      },
      { path: '', pathMatch: 'full', redirectTo: 'operacion' },
    ],
  },
];
