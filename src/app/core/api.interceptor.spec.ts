import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../environments/environment';
import { ApiError } from './api-error';
import { apiInterceptor } from './api.interceptor';
import { AuthService } from './auth.service';
import { LoginResult } from './models';
import { SessionStore } from './session.store';

const API = environment.apiUrl;

const LOGIN: LoginResult = {
  accessToken: 'tok-123',
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  staff: {
    id: 's1', displayName: 'ADMIN Faro', email: 'admin@x.test',
    venues: [{ venueId: 'v1', venueName: 'Taberna El Faro', role: 'ADMIN' }],
  },
};

describe('interceptor de la API', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let store: SessionStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([apiInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    store = TestBed.inject(SessionStore);
  });

  afterEach(() => backend.verify());

  it('desenvuelve `{ success, data }`', () => {
    let result: unknown;
    http.get(`${API}/venues/v1`).subscribe((r) => (result = r));
    backend.expectOne(`${API}/venues/v1`).flush({ success: true, data: { name: 'El Faro' } });
    expect(result).toEqual({ name: 'El Faro' });
  });

  it('`data: null` llega como null: es un estado, no un error', () => {
    let result: unknown = 'sin respuesta';
    http.get(`${API}/venues/v1/sessions/current`).subscribe((r) => (result = r));
    backend.expectOne(`${API}/venues/v1/sessions/current`).flush({ success: true, data: null });
    expect(result).toBeNull();
  });

  it('deja pasar el PNG del QR sin sobre', () => {
    let result: unknown;
    http.get(`${API}/venues/v1/qr/image`, { responseType: 'blob' }).subscribe((r) => (result = r));
    const blob = new Blob(['png'], { type: 'image/png' });
    backend.expectOne(`${API}/venues/v1/qr/image`).flush(blob);
    expect(result).toBe(blob);
  });

  it('envía el token del personal, y no en el login', () => {
    store.start(LOGIN);
    http.get(`${API}/venues/v1`).subscribe();
    expect(backend.expectOne(`${API}/venues/v1`).request.headers.get('Authorization')).toBe('Bearer tok-123');

    http.post(`${API}/auth/login`, {}).subscribe();
    expect(backend.expectOne(`${API}/auth/login`).request.headers.has('Authorization')).toBeFalse();
  });

  it('convierte el sobre de error en un ApiError en español', () => {
    let error: ApiError | undefined;
    http.post(`${API}/venues/v1/sessions`, {}).subscribe({ error: (e) => (error = e) });
    backend.expectOne(`${API}/venues/v1/sessions`).flush(
      { success: false, error: { statusCode: 409, message: 'This venue already has an open session' } },
      { status: 409, statusText: 'Conflict' },
    );
    expect(error instanceof ApiError).toBeTrue();
    expect(error!.message).toBe('Ya hay una sesión abierta en este establecimiento.');
    expect(error!.status).toBe(409);
  });

  it('un 401 cierra la credencial y marca que venció', () => {
    store.start(LOGIN);
    http.get(`${API}/venues/v1`).subscribe({ error: () => undefined });
    backend.expectOne(`${API}/venues/v1`).flush(
      { success: false, error: { statusCode: 401, message: 'Unauthorized' } },
      { status: 401, statusText: 'Unauthorized' },
    );
    expect(store.isLoggedIn()).toBeFalse();
    expect(store.expired()).toBeTrue();
  });

  it('un 401 del login (credenciales malas) no se toma por sesión vencida', () => {
    http.post(`${API}/auth/login`, {}).subscribe({ error: () => undefined });
    backend.expectOne(`${API}/auth/login`).flush(
      { success: false, error: { statusCode: 401, message: 'Invalid credentials' } },
      { status: 401, statusText: 'Unauthorized' },
    );
    expect(store.expired()).toBeFalse();
  });

  it('recorrido de acceso: el login guarda credencial y rol del local', () => {
    TestBed.inject(AuthService).login('admin@x.test', 'pw').subscribe();
    backend.expectOne(`${API}/auth/login`).flush({ success: true, data: LOGIN });
    expect(store.isLoggedIn()).toBeTrue();
    expect(store.venueId()).toBe('v1'); // un solo local: entra directo
    expect(store.role()).toBe('ADMIN');
  });
});
