import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiError } from '../../../core/api-error';
import { AdminAction, Page } from '../../../core/models';
import { OperationApi } from '../../../core/operation-api';
import { DateTimePipe } from '../../../shared/pipes';
import { PageHeaderComponent, PaginationComponent } from '../../../shared/ui';

const PAGE_SIZE = 20;

// Los valores de `action` se traducen aquí.
const ACTION_LABELS: Record<string, string> = {
  SESSION_OPEN: 'Abrió la sesión',
  SESSION_PAUSE: 'Pausó el servicio',
  SESSION_RESUME: 'Reanudó el servicio',
  SESSION_CLOSE: 'Cerró la sesión',
  QR_ENABLE: 'Activó el QR',
  QR_DISABLE: 'Desactivó el QR',
  PLAYLIST_ADD: 'Añadió a la lista por defecto',
  PLAYLIST_REMOVE: 'Quitó de la lista por defecto',
  SKIP: 'Saltó una canción',
  MAINTENANCE_CLEAR: 'Limpió la cola',
  BLOCK: 'Bloqueó una canción',
  UNBLOCK: 'Desbloqueó una canción',
  REMOVE: 'Retiró una entrada de la cola',
  GENRE_SET: 'Asignó un género',
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

/** Línea de detalle legible a partir de `details`; vacía si no hay nada que añadir. */
export function actionDetail(action: AdminAction): string {
  const d = action.details;
  const parts: string[] = [];
  if (typeof d['songTitle'] === 'string') parts.push(`«${d['songTitle']}»`);
  if (action.action === 'BLOCK' && d['reason']) parts.push(`Motivo: ${d['reason']}`);
  if (action.action === 'MAINTENANCE_CLEAR') parts.push(`${d['removedCount'] ?? 0} entradas retiradas`);
  if (action.action === 'GENRE_SET' && d['genre']) parts.push(`Género: ${d['genre']}`);
  return parts.join(' · ');
}

@Component({
  selector: 'app-audit-log',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PageHeaderComponent, PaginationComponent, DateTimePipe],
  template: `
    <app-page-header title="Bitácora" subtitle="Quién hizo qué y cuándo. Lo más reciente primero." />

    <form class="card cluster" (ngSubmit)="search()">
      <label class="field">
        Desde
        <input class="input" type="date" name="from" [(ngModel)]="from" />
      </label>
      <label class="field">
        Hasta
        <input class="input" type="date" name="to" [(ngModel)]="to" />
      </label>
      <button class="btn" type="submit">Filtrar</button>
    </form>

    <section class="card" aria-label="Acciones registradas">
      @if (error()) { <p class="error-text" role="alert">{{ error() }}</p> }
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Cuándo</th><th>Quién</th><th>Qué</th><th>Detalle</th></tr></thead>
          <tbody>
            @for (item of page()?.items; track item.id) {
              <tr>
                <td>{{ item.occurredAt | dateTime }}</td>
                <td>{{ item.actor.displayName }} <span class="muted small">({{ item.actor.role }})</span></td>
                <td>{{ label(item.action) }}</td>
                <td class="muted">{{ detail(item) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (page() && page()!.items.length === 0) { <p class="empty">No hay acciones en este periodo.</p> }
      <app-pagination [page]="current()" [totalPages]="page()?.meta?.totalPages ?? 1" (go)="load($event)" />
    </section>
  `,
})
export class AuditLogComponent implements OnInit {
  private readonly api = inject(OperationApi);

  protected readonly page = signal<Page<AdminAction> | null>(null);
  protected readonly current = signal(1);
  protected readonly error = signal<string | null>(null);
  protected from = '';
  protected to = '';

  protected readonly label = actionLabel;
  protected readonly detail = actionDetail;

  ngOnInit(): void {
    this.load(1);
  }

  protected search(): void {
    this.load(1);
  }

  protected load(page: number): void {
    this.error.set(null);
    this.api.adminActions({ from: this.from || undefined, to: this.to || undefined, page, limit: PAGE_SIZE }).subscribe({
      next: (result) => {
        this.page.set(result);
        this.current.set(page);
      },
      error: (e: ApiError) => this.error.set(e.message),
    });
  }
}
