import { Observable, catchError, map, of, startWith } from 'rxjs';
import { ApiError } from '../core/api-error';

/** Estado plano de una carga: lo que la plantilla necesita para elegir entre cargando, error o datos. */
export interface Loadable<T> {
  loading: boolean;
  data: T | null;
  error: string | null;
}

export const LOADING: Loadable<never> = { loading: true, data: null, error: null };

export function loadable<T>(source: Observable<T>): Observable<Loadable<T>> {
  return source.pipe(
    map((data): Loadable<T> => ({ loading: false, data, error: null })),
    catchError((e: ApiError) => of<Loadable<T>>({ loading: false, data: null, error: e.message })),
    startWith(LOADING as Loadable<T>),
  );
}
