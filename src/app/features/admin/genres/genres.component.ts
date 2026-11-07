import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../../core/admin-api';
import { ApiError } from '../../../core/api-error';
import { Genre, GenreCoverage, Page, UnclassifiedSong } from '../../../core/models';
import { ToastService } from '../../../shared/feedback';
import { lastDaysRange } from '../../../shared/format';
import { PageHeaderComponent, PaginationComponent, SongRowComponent, StatCardComponent } from '../../../shared/ui';

const PAGE_SIZE = 10;

type PeriodKey = 'all' | '7' | '30';
const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'all', label: 'Todo el historial' },
  { key: '7', label: 'Últimos 7 días' },
  { key: '30', label: 'Últimos 30 días' },
];

@Component({
  selector: 'app-genres',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PageHeaderComponent, StatCardComponent, SongRowComponent, PaginationComponent],
  template: `
    <app-page-header title="Clasificación de géneros" subtitle="Empieza por las más pedidas: es lo que más sube la cobertura.">
      <label class="field period">
        <span class="sr-only">Periodo</span>
        <select class="input" [ngModel]="period()" (ngModelChange)="changePeriod($event)" aria-label="Periodo">
          @for (p of periods; track p.key) { <option [value]="p.key">{{ p.label }}</option> }
        </select>
      </label>
    </app-page-header>

    <div class="grid-stats">
      <app-stat-card
        label="Cobertura de la clasificación"
        [value]="coverageText()"
        [hint]="coverage() ? coverage()!.classifiedRequests + ' de ' + coverage()!.totalRequests + ' solicitudes ya tienen género' : ''" />
    </div>

    <section class="card" aria-labelledby="pending-title">
      <h2 id="pending-title">Pedidas sin género</h2>
      @if (error()) { <p class="error-text" role="alert">{{ error() }}</p> }
      @for (song of page()?.items; track song.songId) {
        <app-song-row [title]="song.title" [artist]="song.artistDisplay" [thumbnail]="song.thumbnailUrl">
          <span meta> · pedida {{ song.requestCount }} {{ song.requestCount === 1 ? 'vez' : 'veces' }}</span>
          <select class="input genre" [attr.aria-label]="'Género de ' + song.title" [ngModel]="chosen()[song.songId] ?? ''" (ngModelChange)="choose(song.songId, $event)">
            <option value="" disabled>Elegir género</option>
            @for (g of genres(); track g.code) { <option [value]="g.code">{{ g.label }}</option> }
          </select>
          <button class="btn btn-small btn-primary" type="button" [disabled]="!chosen()[song.songId] || saving()" (click)="save(song)">Guardar</button>
        </app-song-row>
      } @empty {
        @if (page()) { <p class="empty">No hay canciones pendientes de clasificar en este periodo.</p> }
      }
      <app-pagination [page]="current()" [totalPages]="page()?.meta?.totalPages ?? 1" (go)="loadList($event)" />
    </section>
  `,
  styles: `
    .period { min-width: 190px; }
    .genre { width: 170px; flex: none; }
  `,
})
export class GenresComponent implements OnInit {
  private readonly api = inject(AdminApi);
  private readonly toast = inject(ToastService);

  protected readonly periods = PERIODS;
  protected readonly period = signal<PeriodKey>('all');
  protected readonly genres = signal<Genre[]>([]);
  protected readonly coverage = signal<GenreCoverage | null>(null);
  protected readonly page = signal<Page<UnclassifiedSong> | null>(null);
  protected readonly current = signal(1);
  protected readonly chosen = signal<Record<string, string | undefined>>({});
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly coverageText = computed(() => {
    const c = this.coverage();
    if (!c) return '—';
    return c.coveragePercent === null ? 'Sin solicitudes' : `${c.coveragePercent} %`;
  });

  ngOnInit(): void {
    // La lista cerrada viene del servidor: se envía el `code`, se muestra el `label`.
    this.api.genres().subscribe({ next: (g) => this.genres.set(g), error: (e: ApiError) => this.error.set(e.message) });
    this.reload();
  }

  protected changePeriod(key: PeriodKey): void {
    this.period.set(key);
    this.reload();
  }

  protected choose(songId: string, code: string): void {
    this.chosen.update((c) => ({ ...c, [songId]: code }));
  }

  protected save(song: UnclassifiedSong): void {
    const genre = this.chosen()[song.songId];
    if (!genre) return;
    this.saving.set(true);
    this.api.setGenre(song.songId, genre).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(`«${song.title}» clasificada.`);
        this.reload(this.current());
      },
      error: (e: ApiError) => {
        this.saving.set(false);
        this.toast.error(e.message);
      },
    });
  }

  protected loadList(page: number): void {
    this.api.unclassified({ ...this.range(), page, limit: PAGE_SIZE }).subscribe({
      next: (result) => {
        // Al clasificar la última de una página, la lista se acorta: se vuelve a la anterior.
        if (result.items.length === 0 && page > 1) return this.loadList(page - 1);
        this.page.set(result);
        this.current.set(page);
        this.error.set(null);
      },
      error: (e: ApiError) => this.error.set(e.message),
    });
  }

  private reload(page = 1): void {
    this.loadList(page);
    this.api.coverage(this.range()).subscribe({ next: (c) => this.coverage.set(c), error: (e: ApiError) => this.error.set(e.message) });
  }

  private range(): { from?: string; to?: string } {
    const key = this.period();
    return key === 'all' ? {} : lastDaysRange(Number(key));
  }
}
