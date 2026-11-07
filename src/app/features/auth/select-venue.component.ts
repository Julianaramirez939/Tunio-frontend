import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { SessionStore } from '../../core/session.store';

/** El rol es por local, así que con más de uno hay que elegir antes de entrar. */
@Component({
  selector: 'app-select-venue',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main>
      <section class="card">
        <div class="brand">Tunio</div>
        <h1>¿En qué local vas a trabajar?</h1>
        <ul>
          @for (venue of store.staff()?.venues; track venue.venueId) {
            <li>
              <button class="btn" type="button" (click)="choose(venue.venueId)">
                <span>{{ venue.venueName }}</span>
                <span class="muted small">{{ venue.role === 'ADMIN' ? 'Administrador' : 'DJ' }}</span>
              </button>
            </li>
          }
        </ul>
        <button class="btn btn-small" type="button" (click)="logout()">Salir</button>
      </section>
    </main>
  `,
  styles: `
    main { min-height: 100vh; display: grid; place-items: center; padding: 16px; }
    section { width: min(420px, 100%); display: flex; flex-direction: column; gap: 16px; padding: 28px; }
    .brand { font-size: 28px; font-weight: 700; color: var(--primary); }
    ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
    li .btn { width: 100%; justify-content: space-between; }
  `,
})
export class SelectVenueComponent {
  protected readonly store = inject(SessionStore);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  choose(venueId: string): void {
    this.store.selectVenue(venueId);
    void this.router.navigate(['/admin']);
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
