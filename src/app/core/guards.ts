import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from './models';
import { SessionStore } from './session.store';

/** Solo exige credencial vigente: lo usa la pantalla donde se elige el local. */
export const loggedInGuard: CanActivateFn = () => {
  const store = inject(SessionStore);
  const router = inject(Router);
  if (store.isLoggedIn() && !store.isExpired()) return true;
  if (store.isLoggedIn()) store.handleUnauthorized();
  return router.createUrlTree(['/login']);
};

/** Exige credencial vigente y un local elegido (si hay más de uno, se elige antes de entrar). */
export const authGuard: CanActivateFn = () => {
  const store = inject(SessionStore);
  const router = inject(Router);
  if (!store.isLoggedIn() || store.isExpired()) {
    if (store.isLoggedIn()) store.handleUnauthorized();
    return router.createUrlTree(['/login']);
  }
  return store.venueId() ? true : router.createUrlTree(['/select-venue']);
};

/** Guarda de rol: los roles permitidos van en `data.roles` de la ruta. */
export const roleGuard: CanActivateFn = (route) => {
  const store = inject(SessionStore);
  const router = inject(Router);
  const allowed = route.data['roles'] as Role[] | undefined;
  const role = store.role();
  return role && (!allowed || allowed.includes(role)) ? true : router.createUrlTree(['/admin/operacion']);
};
