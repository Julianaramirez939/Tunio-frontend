import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, switchMap, tap } from 'rxjs';
import { AnalyticsApi } from '../../core/analytics-api';
import { ParticipationLevel } from '../../core/models';
import { BarListComponent } from '../../shared/charts';
import { LOADING, loadable } from '../../shared/loadable';
import { DateTimePipe, DayPipe, NightDatePipe, WeekdayPipe } from '../../shared/pipes';
import { PaginationComponent, StatusBadgeComponent } from '../../shared/ui';
import { AnalyticsFilterService } from './analytics-filter.service';

const PAGE_SIZE = 10;

const LEVEL: Record<ParticipationLevel, { tone: 'ok' | 'warn' | 'off'; label: string; help: string }> = {
  LOW: { tone: 'warn', label: 'Baja', help: 'Menos de la mitad de los usuarios únicos habituales.' },
  NORMAL: { tone: 'ok', label: 'Normal', help: 'En línea con el promedio del local.' },
  INSUFFICIENT_HISTORY: {
    tone: 'off',
    label: 'Sin historial',
    help: 'Hacen falta al menos 3 noches cerradas anteriores para comparar; aún no se puede decir si fue una noche baja.',
  },
};

/** Diagnóstico y comparativo (WEB-10). Los umbrales y alertas los decide el servidor. */
@Component({
  selector: 'app-diagnostics',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BarListComponent, PaginationComponent, StatusBadgeComponent, DateTimePipe, DayPipe, NightDatePipe, WeekdayPipe],
  template: `
    <section class="card" aria-labelledby="unplayed-title">
      <h2 id="unplayed-title">Pedidas que no sonaron</h2>
      <p class="muted small">Canciones que alguien pidió y ya no van a sonar, con el motivo. En una sesión abierta las pendientes aún cuentan como posibles.</p>
      @if (unplayed().error) { <p class="error-text" role="alert">{{ unplayed().error }}</p> }
      @if (unplayed().data; as u) {
        @if (u.byReason.length > 0) {
          <app-bar-list [bars]="reasonBars(u.byReason)" />
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Canción</th><th class="num">Votos</th><th>Motivo</th><th>Pedida</th></tr></thead>
              <tbody>
                @for (item of u.items; track item.queueItemId) {
                  <tr>
                    <td>{{ item.title }} <span class="muted small">{{ item.artistDisplay }}</span></td>
                    <td class="num">{{ item.voteCount }}</td>
                    <td>{{ item.reason }}</td>
                    <td>{{ item.requestedAt | dateTime }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <app-pagination [page]="unplayedPage()" [totalPages]="u.meta.totalPages" (go)="unplayedPage.set($event)" />
        } @else {
          <p class="empty">Todo lo que se pidió sonó o todavía puede sonar.</p>
        }
      }
    </section>

    <section class="card" aria-labelledby="conc-title">
      <h2 id="conc-title">Concentración de votos</h2>
      <p class="muted small">Qué parte de los votos se llevaron las 3 canciones principales de cada noche. La alerta salta con 60 % o más y al menos 5 canciones votadas.</p>
      @if (concentration().error) { <p class="error-text" role="alert">{{ concentration().error }}</p> }
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Noche</th><th class="num">Votos</th><th class="num">Canciones votadas</th><th class="num">Top 3</th><th>Estado</th></tr></thead>
          <tbody>
            @for (row of concentration().data; track row.sessionId) {
              <tr>
                <td>{{ row.startedAt | day }}{{ row.eventName ? ' · ' + row.eventName : '' }}</td>
                <td class="num">{{ row.totalVotes }}</td>
                <td class="num">{{ row.votedSongs }}</td>
                <td class="num">{{ row.top3SharePct === null ? 'Sin votos' : row.top3SharePct + ' %' }}</td>
                <td>
                  @if (row.alert) {
                    <app-status-badge tone="warn" label="Concentración alta" [compact]="true" />
                  } @else {
                    <span class="muted">Sin alerta</span>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (concentration().data?.length === 0) { <p class="empty">No hay sesiones en este periodo.</p> }
    </section>

    <section class="card" aria-labelledby="low-title">
      <h2 id="low-title">Baja participación</h2>
      <p class="muted small">Usuarios únicos de cada noche cerrada frente al promedio de las noches cerradas anteriores del local.</p>
      @if (low().error) { <p class="error-text" role="alert">{{ low().error }}</p> }
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Noche</th><th class="num">Usuarios únicos</th><th class="num">Promedio histórico</th><th class="num">Frente al promedio</th><th>Nivel</th></tr></thead>
          <tbody>
            @for (row of low().data; track row.sessionId) {
              <tr>
                <td>{{ row.startedAt | day }}</td>
                <td class="num">{{ row.uniqueDevices }}</td>
                <td class="num">{{ row.historicalAverage ?? '—' }}</td>
                <td class="num">{{ row.ratioPct === null ? '—' : row.ratioPct + ' %' }}</td>
                <td>
                  <app-status-badge [tone]="level(row.level).tone" [label]="level(row.level).label" [compact]="true" />
                  <div class="muted small help">{{ level(row.level).help }}</div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (low().data?.length === 0) { <p class="empty">No hay noches cerradas en este periodo.</p> }
    </section>

    <section class="card" aria-labelledby="nights-title">
      <h2 id="nights-title">Comparativo por noche</h2>
      @if (nights().error) { <p class="error-text" role="alert">{{ nights().error }}</p> }
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Fecha</th><th>Día</th><th class="num">Usuarios únicos</th><th class="num">Solicitudes</th><th class="num">Votos</th></tr></thead>
          <tbody>
            @for (n of nights().data; track n.sessionId) {
              <tr>
                <td>{{ n.nightDate | nightDate }}{{ n.eventName ? ' · ' + n.eventName : '' }}</td>
                <td>{{ n.weekday | weekday }}</td>
                <td class="num">{{ n.uniqueDevices }}</td>
                <td class="num">{{ n.songRequests }}</td>
                <td class="num">{{ n.totalVotes }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (nights().data?.length === 0) {
        <p class="empty">Aún no hay noches cerradas en este periodo. El comparativo necesita varias noches.</p>
      }
    </section>
  `,
  styles: `
    section > p { margin-bottom: 12px; }
    .help { max-width: 280px; margin-top: 4px; }
    app-bar-list { display: block; margin-bottom: 16px; }
  `,
})
export class DiagnosticsComponent {
  private readonly api = inject(AnalyticsApi);
  private readonly filter = inject(AnalyticsFilterService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly unplayedPage = signal(1);
  private readonly filter$ = toObservable(this.filter.filter);

  protected readonly unplayed = toSignal(
    combineLatest([this.filter$, toObservable(this.unplayedPage)]).pipe(
      switchMap(([f, page]) => loadable(this.api.unplayed(f, { page, limit: PAGE_SIZE }))),
    ),
    { initialValue: LOADING },
  );
  protected readonly concentration = toSignal(this.filter$.pipe(switchMap((f) => loadable(this.api.voteConcentration(f)))), { initialValue: LOADING });
  protected readonly low = toSignal(this.filter$.pipe(switchMap((f) => loadable(this.api.lowParticipation(f)))), { initialValue: LOADING });
  protected readonly nights = toSignal(this.filter$.pipe(switchMap((f) => loadable(this.api.nightComparison(f)))), { initialValue: LOADING });

  constructor() {
    this.filter$.pipe(tap(() => this.unplayedPage.set(1)), takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  /** El motivo ya viene en español desde la vista: se muestra tal cual. */
  protected reasonBars(rows: { reason: string; count: number }[]) {
    return rows.map((r) => ({ label: r.reason, value: r.count, display: String(r.count) }));
  }

  protected level(level: ParticipationLevel) {
    return LEVEL[level];
  }
}
