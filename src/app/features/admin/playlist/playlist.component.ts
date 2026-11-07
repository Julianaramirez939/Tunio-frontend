import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../../core/admin-api';
import { ApiError } from '../../../core/api-error';
import { Playlist, PlaylistTrack, SearchResponse } from '../../../core/models';
import { ConfirmService, ToastService } from '../../../shared/feedback';
import { DurationPipe, TotalDurationPipe } from '../../../shared/pipes';
import { PageHeaderComponent, SongRowComponent } from '../../../shared/ui';

/** La búsqueda gasta cuota de YouTube de todo el sistema: mínimo de caracteres antes de enviarla. */
const MIN_QUERY_LENGTH = 3;

@Component({
  selector: 'app-playlist',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PageHeaderComponent, SongRowComponent, DurationPipe, TotalDurationPipe],
  template: `
    <app-page-header title="Lista por defecto" subtitle="Suena sola cuando la cola de solicitudes queda vacía" />

    <div class="split">
      <section class="card" aria-labelledby="list-title">
        <h2 id="list-title">{{ playlist()?.name ?? 'Lista' }}</h2>
        @if (playlist(); as list) {
          <p class="muted small summary">{{ list.trackCount }} canciones · {{ list.totalDurationSeconds | totalDuration }}</p>
          <p class="notice">Suena en orden y vuelve a empezar cuando acaba. Las canciones nuevas van al final.</p>
          @for (track of list.tracks; track track.trackId; let i = $index) {
            <app-song-row [position]="i + 1" [title]="track.title" [artist]="track.artistDisplay" [thumbnail]="track.thumbnailUrl">
              <span class="muted small">{{ track.durationSeconds | duration }}</span>
              <button class="btn btn-small" type="button" [disabled]="busy()" (click)="remove(track)">Quitar</button>
            </app-song-row>
          } @empty {
            <p class="empty">La lista está vacía. Busca canciones para añadirlas.</p>
          }
        } @else if (error()) {
          <p class="error-text" role="alert">{{ error() }}</p>
        }
      </section>

      <section class="card stack" aria-labelledby="add-title">
        <h2 id="add-title">Añadir canciones</h2>
        <form (ngSubmit)="search()">
          <label class="field">
            Buscar en el catálogo (pulsa Enter)
            <input class="input" name="q" [(ngModel)]="query" placeholder="Artista o canción" autocomplete="off" />
          </label>
        </form>
        @if (hint()) { <p class="muted small">{{ hint() }}</p> }
        @if (results(); as found) {
          @if (found.catalogLimited) {
            <p class="notice">El catálogo está limitado hoy: solo se muestran resultados de búsquedas anteriores.</p>
          }
          @for (r of found.results; track r.youtubeVideoId) {
            <app-song-row [title]="r.title" [artist]="r.artistDisplay" [thumbnail]="r.thumbnailUrl">
              <span class="muted small">{{ r.durationSeconds | duration }}</span>
              @if (inList().has(r.youtubeVideoId)) {
                <span class="muted small">En la lista</span>
              } @else {
                <button class="btn btn-small btn-primary" type="button" [disabled]="busy()" (click)="add(r.youtubeVideoId, r.title)">Añadir</button>
              }
            </app-song-row>
          } @empty {
            <p class="empty">Sin resultados.</p>
          }
        }
      </section>
    </div>
  `,
  styles: `.summary { margin-bottom: 10px; }`,
})
export class PlaylistComponent implements OnInit {
  private readonly api = inject(AdminApi);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly playlist = signal<Playlist | null>(null);
  protected readonly results = signal<SearchResponse | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly hint = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected query = '';

  protected readonly inList = computed(() => new Set(this.playlist()?.tracks.map((t) => t.youtubeVideoId)));

  ngOnInit(): void {
    this.loadPlaylist();
  }

  /** Solo al pulsar Enter, nunca mientras se escribe. */
  protected search(): void {
    const q = this.query.trim();
    if (q.length < MIN_QUERY_LENGTH) {
      this.hint.set(`Escribe al menos ${MIN_QUERY_LENGTH} caracteres para buscar.`);
      return;
    }
    this.hint.set('Buscando…');
    this.api.search(q).subscribe({
      next: (found) => {
        this.hint.set(null);
        this.results.set(found);
      },
      error: (e: ApiError) => this.hint.set(e.message),
    });
  }

  protected add(youtubeVideoId: string, title: string): void {
    this.busy.set(true);
    this.api.addTrack(youtubeVideoId).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success(`«${title}» se añadió al final de la lista.`);
        this.loadPlaylist();
      },
      error: (e: ApiError) => {
        this.busy.set(false);
        this.toast.error(e.message);
      },
    });
  }

  protected async remove(track: PlaylistTrack): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Quitar de la lista',
      message: `«${track.title}» dejará de sonar cuando la cola esté vacía. Su historial se conserva.`,
      confirmLabel: 'Quitar',
      danger: true,
    });
    if (!ok) return;
    this.busy.set(true);
    this.api.removeTrack(track.trackId).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success('Canción quitada de la lista.');
        this.loadPlaylist();
      },
      error: (e: ApiError) => {
        this.busy.set(false);
        this.toast.error(e.message);
      },
    });
  }

  private loadPlaylist(): void {
    this.api.playlist().subscribe({
      next: (list) => {
        this.playlist.set(list);
        this.error.set(null);
      },
      error: (e: ApiError) => this.error.set(e.message),
    });
  }
}
