import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LoginResult, Role, Staff } from './models';

const STORAGE_KEY = 'tunio.session';
const MAX_TIMER_MS = 2_147_483_647;

interface Persisted { accessToken: string; expiresAt: string; staff: Staff; venueId: string | null }

/** Credencial del personal y local activo. Se conserva entre recargas (la pantalla del bar la necesita). */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly router = inject(Router);
  private readonly state = signal<Persisted | null>(this.read());
  private timer?: ReturnType<typeof setTimeout>;

  /** true cuando el acceso terminó por vencimiento y no por salida voluntaria. */
  readonly expired = signal(false);

  readonly accessToken = computed(() => this.state()?.accessToken ?? null);
  readonly staff = computed(() => this.state()?.staff ?? null);
  readonly venueId = computed(() => this.state()?.venueId ?? null);
  readonly isLoggedIn = computed(() => !!this.state());
  readonly venue = computed(() => this.staff()?.venues.find((v) => v.venueId === this.venueId()) ?? null);
  /** El rol es por local: sale del local elegido. */
  readonly role = computed<Role | null>(() => this.venue()?.role ?? null);

  constructor() {
    this.armExpiry();
  }

  start(result: LoginResult): void {
    const only = result.staff.venues.length === 1 ? result.staff.venues[0].venueId : null;
    this.expired.set(false);
    this.write({ accessToken: result.accessToken, expiresAt: result.expiresAt, staff: result.staff, venueId: only });
  }

  updateStaff(staff: Staff): void {
    const current = this.state();
    if (!current) return;
    const stillThere = staff.venues.some((v) => v.venueId === current.venueId);
    this.write({ ...current, staff, venueId: stillThere ? current.venueId : null });
  }

  selectVenue(venueId: string): void {
    const current = this.state();
    if (current) this.write({ ...current, venueId });
  }

  clear(): void {
    this.write(null);
  }

  /** Un 401 o un `connect_error` Unauthorized: se pide entrar de nuevo, sin reintentos silenciosos. */
  handleUnauthorized(): void {
    if (!this.state()) return;
    this.expired.set(true);
    this.clear();
    void this.router.navigate(['/login']);
  }

  isExpired(): boolean {
    const current = this.state();
    return !current || Date.parse(current.expiresAt) <= Date.now();
  }

  private armExpiry(): void {
    clearTimeout(this.timer);
    const current = this.state();
    if (!current) return;
    const remaining = Date.parse(current.expiresAt) - Date.now();
    if (remaining <= 0) {
      this.state.set(null);
      this.expired.set(true);
      this.persist(null);
      return;
    }
    this.timer = setTimeout(() => this.handleUnauthorized(), Math.min(remaining, MAX_TIMER_MS));
  }

  private write(value: Persisted | null): void {
    this.state.set(value);
    this.persist(value);
    this.armExpiry();
  }

  private read(): Persisted | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Persisted) : null;
    } catch {
      return null;
    }
  }

  private persist(value: Persisted | null): void {
    try {
      if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Sin almacenamiento la sesión dura solo hasta recargar; no es un error.
    }
  }
}
