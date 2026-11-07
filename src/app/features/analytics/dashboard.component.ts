import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { combineLatest, switchMap, tap } from 'rxjs';
import { AnalyticsApi } from '../../core/analytics-api';
import { BarDatum, BarListComponent, ColumnChartComponent, ColumnDatum } from '../../shared/charts';
import { formatWaitPrecise } from '../../shared/format';
import { LOADING, loadable } from '../../shared/loadable';
import { DateTimePipe } from '../../shared/pipes';
import { PaginationComponent, StatCardComponent } from '../../shared/ui';
import { AnalyticsFilterService } from './analytics-filter.service';

const PAGE_SIZE = 10;

const PLAYBACK_STATUS: Record<string, string> = {
  PLAYING: 'Sonando', COMPLETED: 'Completada', SKIPPED: 'Saltada', UNAVAILABLE: 'No disponible', ERROR: 'Error',
};
const PLAYBACK_SOURCE: Record<string, string> = { QUEUE: 'Cola', DEFAULT_PLAYLIST: 'Lista por defecto' };

/** Tablero descriptivo */
@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, StatCardComponent, BarListComponent, ColumnChartComponent, PaginationComponent, DateTimePipe,
  ],
  template: `
    @if (summary().error) { <p class="error-text" role="alert">{{ summary().error }}</p> }

    @if (summary().data; as s) {
      <div class="grid-stats">
        <app-stat-card label="Solicitudes totales" [value]="s.songRequests"
          [hint]="s.votes.fromRequests + ' voto(s) iniciales · ' + s.sessionCount + ' sesión(es)'" />
        <app-stat-card label="Usuarios únicos" [value]="s.uniqueDevices" hint="Teléfonos que entraron por el QR" />
        <app-stat-card label="Votos" [value]="s.votes.total" [hint]="s.votes.support + ' de apoyo a canciones ya pedidas'" />
        <app-stat-card label="Espera promedio" [value]="s.waitSeconds.average === null ? 'Sin datos' : formatWait(s.waitSeconds.average)"
          [hint]="waitHint(s.waitSeconds)" />
        <app-stat-card label="Canción más popular" [value]="s.mostPopularSong?.title ?? 'Sin datos'"
          [hint]="s.mostPopularSong ? s.mostPopularSong.totalVotes + ' votos · ' + s.mostPopularSong.uniqueVoters + ' teléfonos' : ''" />
      </div>
      <p class="muted small">La espera cuenta solo las canciones que sonaron desde la cola; las que no sonaron no tienen espera.</p>
    } @else if (summary().loading) {
      <p class="muted">Cargando indicadores…</p>
    }

    <div class="split">
      <section class="card" aria-labelledby="hourly-title">
        <h2 id="hourly-title">Participación por franja horaria</h2>
        <p class="muted small">Votos por hora local (incluyen las solicitudes). La franja con más votos va en ámbar.</p>
        @if (hourly().error) { <p class="error-text" role="alert">{{ hourly().error }}</p> }
        @if (hourlyColumns(); as cols) {
          @if (cols.length > 0) {
            <app-column-chart [columns]="cols" ariaLabel="Votos por hora del día" />
          } @else if (!hourly().loading) {
            <p class="empty">Aún no hay votos en este periodo.</p>
          }
        }
      </section>

      <section class="card" aria-labelledby="genres-title">
        <h2 id="genres-title">Géneros más solicitados</h2>
        @if (genres().error) { <p class="error-text" role="alert">{{ genres().error }}</p> }
        @if (genres().data; as g) {
          @if (g.buckets.length > 0) {
            <app-bar-list [bars]="genreBars()" />
            <p class="notice coverage">
              @if (g.coverage.coveragePercent !== null) {
                Cobertura: {{ g.coverage.coveragePercent }} % de las solicitudes tiene género
                ({{ g.coverage.classifiedRequests }} de {{ g.coverage.totalRequests }}).
              }
              @if (unclassifiedPercent() > 0) {
                El {{ unclassifiedPercent() }} % está sin clasificar. <a routerLink="/admin/generos">Clasificar canciones</a>
              }
            </p>
          } @else {
            <p class="empty">Aún no hay solicitudes en este periodo.</p>
          }
        }
      </section>
    </div>

    <div class="split">
      <section class="card" aria-labelledby="rank-title">
        <h2 id="rank-title">Canciones más votadas</h2>
        @if (ranking().error) { <p class="error-text" role="alert">{{ ranking().error }}</p> }
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>#</th><th>Canción</th><th class="num">Votos</th><th class="num">Teléfonos</th></tr></thead>
            <tbody>
              @for (song of ranking().data?.items; track song.songId; let i = $index) {
                <tr>
                  <td>{{ (rankingPage() - 1) * pageSize + i + 1 }}</td>
                  <td>{{ song.title }} <span class="muted small">{{ song.artistDisplay }}</span></td>
                  <td class="num">{{ song.totalVotes }}</td>
                  <td class="num">{{ song.uniqueVoters }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (ranking().data?.items?.length === 0) { <p class="empty">Sin votos en este periodo.</p> }
        <app-pagination [page]="rankingPage()" [totalPages]="ranking().data?.meta?.totalPages ?? 1" (go)="rankingPage.set($event)" />
      </section>

      <section class="card" aria-labelledby="hist-title">
        <h2 id="hist-title">Canciones reproducidas</h2>
        @if (history().error) { <p class="error-text" role="alert">{{ history().error }}</p> }
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Canción</th><th>Origen</th><th>Resultado</th><th>Inicio</th></tr></thead>
            <tbody>
              @for (p of history().data?.items; track p.playbackId) {
                <tr>
                  <td>{{ p.title }} <span class="muted small">{{ p.artistDisplay }}</span></td>
                  <td>{{ source(p.source) }}</td>
                  <td>{{ status(p.status) }}</td>
                  <td>{{ p.startedAt | dateTime }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (history().data?.items?.length === 0) { <p class="empty">No sonó nada en este periodo.</p> }
        <app-pagination [page]="historyPage()" [totalPages]="history().data?.meta?.totalPages ?? 1" (go)="historyPage.set($event)" />
      </section>
    </div>
  `,
  styles: `.coverage { margin-top: 14px; }`,
})
export class DashboardComponent {
  private readonly api = inject(AnalyticsApi);
  private readonly filter = inject(AnalyticsFilterService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly rankingPage = signal(1);
  protected readonly historyPage = signal(1);
  protected readonly formatWait = formatWaitPrecise;

  private readonly filter$ = toObservable(this.filter.filter);

  protected readonly summary = toSignal(this.filter$.pipe(switchMap((f) => loadable(this.api.summary(f)))), { initialValue: LOADING });
  protected readonly hourly = toSignal(this.filter$.pipe(switchMap((f) => loadable(this.api.hourly(f)))), { initialValue: LOADING });
  protected readonly genres = toSignal(this.filter$.pipe(switchMap((f) => loadable(this.api.genres(f)))), { initialValue: LOADING });
  protected readonly ranking = toSignal(
    combineLatest([this.filter$, toObservable(this.rankingPage)]).pipe(
      switchMap(([f, page]) => loadable(this.api.popularity(f, { page, limit: PAGE_SIZE }))),
    ),
    { initialValue: LOADING },
  );
  protected readonly history = toSignal(
    combineLatest([this.filter$, toObservable(this.historyPage)]).pipe(
      switchMap(([f, page]) => loadable(this.api.playbacks(f, { page, limit: PAGE_SIZE }))),
    ),
    { initialValue: LOADING },
  );

  protected readonly hourlyColumns = computed<ColumnDatum[]>(() => {
    const rows = this.hourly().data ?? [];
    const peak = Math.max(0, ...rows.map((r) => r.votes));
    return rows.map((r) => ({ label: `${String(r.hour).padStart(2, '0')}h`, value: r.votes, highlight: r.votes === peak && peak > 0 }));
  });

  protected readonly genreBars = computed<BarDatum[]>(() =>
    (this.genres().data?.buckets ?? []).map((b) => ({
      label: b.label, value: b.percent, display: `${b.percent} %`, muted: b.genre === null,
    })),
  );

  /** La barra «Sin clasificar» la da el servidor (`genre: null`); aquí solo se lee. */
  protected readonly unclassifiedPercent = computed(() => this.genres().data?.buckets.find((b) => b.genre === null)?.percent ?? 0);

  constructor() {
    // Al cambiar el filtro, las tablas vuelven a su primera página.
    this.filter$.pipe(tap(() => { this.rankingPage.set(1); this.historyPage.set(1); }), takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  protected waitHint(w: { measured: number; median: number | null }): string {
    return w.median === null ? 'Ninguna canción sonó desde la cola' : `Mediana ${formatWaitPrecise(w.median)} · ${w.measured} medidas`;
  }

  protected status(code: string): string { return PLAYBACK_STATUS[code] ?? code; }
  protected source(code: string): string { return PLAYBACK_SOURCE[code] ?? code; }
}
