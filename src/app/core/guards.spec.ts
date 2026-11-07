import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, UrlTree, provideRouter } from '@angular/router';
import { authGuard, roleGuard } from './guards';
import { LoginResult, Role } from './models';
import { SessionStore } from './session.store';

function login(roles: Role[], expiresInMs = 3_600_000): LoginResult {
  return {
    accessToken: 't',
    expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
    staff: {
      id: 's', displayName: 'Persona', email: 'p@x.test',
      venues: roles.map((role, i) => ({ venueId: `v${i + 1}`, venueName: `Local ${i + 1}`, role })),
    },
  };
}

describe('guardas', () => {
  let store: SessionStore;
  let router: Router;

  const run = (guard: typeof authGuard, data: object = {}) =>
    TestBed.runInInjectionContext(() => guard({ data } as ActivatedRouteSnapshot, {} as never));
  const path = (result: unknown) => router.serializeUrl(result as UrlTree);

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    store = TestBed.inject(SessionStore);
    router = TestBed.inject(Router);
  });

  it('sin credencial lleva al login', () => {
    expect(path(run(authGuard))).toBe('/login');
  });

  it('con un solo local entra directo', () => {
    store.start(login(['DJ']));
    expect(run(authGuard)).toBeTrue();
  });

  it('con varios locales hay que elegir antes de entrar', () => {
    store.start(login(['ADMIN', 'DJ']));
    expect(path(run(authGuard))).toBe('/select-venue');
    store.selectVenue('v2');
    expect(run(authGuard)).toBeTrue();
  });

  it('una credencial vencida lleva al login y avisa', () => {
    store.start(login(['ADMIN'], -1000));
    expect(path(run(authGuard))).toBe('/login');
    expect(store.expired()).toBeTrue();
  });

  it('el rol es por local: el mismo usuario es ADMIN en uno y DJ en otro', () => {
    store.start(login(['ADMIN', 'DJ']));
    store.selectVenue('v1');
    expect(store.role()).toBe('ADMIN');
    store.selectVenue('v2');
    expect(store.role()).toBe('DJ');
  });

  it('un DJ no entra a una ruta de ADMIN y vuelve a Operación', () => {
    store.start(login(['DJ']));
    expect(path(run(roleGuard, { roles: ['ADMIN'] }))).toBe('/admin/operacion');
  });

  it('un ADMIN entra a la ruta de ADMIN; el DJ a la de operación', () => {
    store.start(login(['ADMIN']));
    expect(run(roleGuard, { roles: ['ADMIN'] })).toBeTrue();
    expect(run(roleGuard, { roles: ['ADMIN', 'DJ'] })).toBeTrue();
  });
});
