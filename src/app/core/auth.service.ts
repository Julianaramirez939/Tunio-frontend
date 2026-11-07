import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginResult, Staff } from './models';
import { SessionStore } from './session.store';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(SessionStore);

  login(email: string, password: string): Observable<LoginResult> {
    return this.http
      .post<LoginResult>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap((result) => this.store.start(result)));
  }

  /** Al recargar: confirma el token guardado y refresca los roles por local. */
  restore(): Observable<Staff> {
    return this.http.get<Staff>(`${environment.apiUrl}/auth/me`).pipe(tap((staff) => this.store.updateStaff(staff)));
  }

  logout(): void {
    this.store.clear();
  }
}
