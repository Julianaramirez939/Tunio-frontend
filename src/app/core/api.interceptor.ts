import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { translateError } from './api-error';
import { SessionStore } from './session.store';

const LOGIN_PATH = '/auth/login';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);

  const store = inject(SessionStore);
  const isLogin = req.url.endsWith(LOGIN_PATH);
  const token = store.accessToken();
  const authorized = token && !isLogin ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authorized).pipe(
    map((event) => {
      // El PNG del QR no lleva sobre; los 204 no traen cuerpo.
      if (event instanceof HttpResponse && isEnvelope(event.body)) return event.clone({ body: event.body.data });
      return event;
    }),
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) return throwError(() => error);
      const body = error.error as { error?: { message?: string | string[] } } | null;
      const apiError = translateError(error.status, body?.error?.message);
      if (error.status === 401 && !isLogin) store.handleUnauthorized();
      return throwError(() => apiError);
    }),
  );
};

function isEnvelope(body: unknown): body is { success: boolean; data: unknown } {
  return typeof body === 'object' && body !== null && 'success' in body && 'data' in body;
}
