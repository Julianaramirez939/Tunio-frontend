import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Role } from '../../core/models';
import { SessionStore } from '../../core/session.store';

interface NavItem { label: string; path: string; roles: Role[] }

// El menú se adapta al rol.
const NAV: NavItem[] = [
  { label: 'Operación', path: '/admin/operacion', roles: ['ADMIN', 'DJ'] },
  { label: 'Bitácora', path: '/admin/bitacora', roles: ['ADMIN', 'DJ'] },
  { label: 'Analítica', path: '/admin/analitica', roles: ['ADMIN'] },
  { label: 'Lista por defecto', path: '/admin/lista', roles: ['ADMIN'] },
  { label: 'Géneros', path: '/admin/generos', roles: ['ADMIN'] },
  { label: 'Configuración', path: '/admin/configuracion', roles: ['ADMIN'] },
];

@Component({
  selector: 'app-admin-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout">
      <nav aria-label="Menú principal">
        <div class="brand">Tunio</div>
        @for (item of items(); track item.path) {
          <a class="nv" [routerLink]="item.path" routerLinkActive="on">{{ item.label }}</a>
        }
        @if (store.role() === 'ADMIN') {
          <!-- Se abre en otra pestaña: la pantalla del bar se proyecta, el panel se queda aquí. -->
          <a class="nv" href="/bar" target="_blank" rel="noopener">Pantalla del bar ↗</a>
        }
        <div class="who">
          <div class="strong">{{ store.venue()?.venueName }}</div>
          <div class="muted small">{{ store.staff()?.displayName }} · {{ store.role() === 'ADMIN' ? 'Administrador' : 'DJ' }}</div>
          @if ((store.staff()?.venues?.length ?? 0) > 1) {
            <button class="btn btn-small" type="button" (click)="changeVenue()">Cambiar de local</button>
          }
          <button class="btn btn-small" type="button" (click)="logout()">Salir</button>
        </div>
      </nav>
      <main><router-outlet /></main>
    </div>
  `,
  styles: `
    .layout { display: flex; min-height: 100vh; }
    nav { width: 230px; flex: none; padding: 24px 16px; border-right: 1px solid var(--line); display: flex; flex-direction: column; gap: 6px; }
    .brand { font-size: 26px; font-weight: 700; color: var(--primary); margin: 0 8px 20px; }
    .nv { display: flex; align-items: center; min-height: 44px; border-radius: 10px; padding: 0 12px; font-weight: 600; text-decoration: none; color: var(--muted); }
    .nv:hover { background: var(--surface); }
    .nv.on { background: var(--surface-2); color: var(--primary); }
    .who { margin-top: auto; padding: 12px 8px 0; display: flex; flex-direction: column; gap: 8px; border-top: 1px solid var(--line); }
    main { flex: 1; min-width: 0; padding: 24px 32px; display: flex; flex-direction: column; gap: 20px; }
    @media (max-width: 800px) {
      .layout { flex-direction: column; }
      nav { width: auto; flex-direction: row; flex-wrap: wrap; align-items: center; border-right: 0; border-bottom: 1px solid var(--line); padding: 12px 16px; }
      .brand { margin: 0 12px 0 0; }
      .who { margin-top: 0; flex-direction: row; align-items: center; border-top: 0; padding: 0; }
      main { padding: 16px; }
    }
  `,
})
export class AdminShellComponent {
  protected readonly store = inject(SessionStore);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly items = computed(() => NAV.filter((item) => this.store.role() && item.roles.includes(this.store.role()!)));

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }

  changeVenue(): void {
    this.store.selectVenue('');
    void this.router.navigate(['/select-venue']);
  }
}
