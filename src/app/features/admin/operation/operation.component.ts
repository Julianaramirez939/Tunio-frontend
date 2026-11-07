import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, debounceTime, switchMap } from 'rxjs';
import { ApiError } from '../../../core/api-error';
import { LiveQueueService } from '../../../core/live-queue.service';
import { AnalyticsSummary, Block, MusicSession, QueueEntry } from '../../../core/models';
import { OperationApi } from '../../../core/operation-api';
import { SessionStore } from '../../../core/session.store';
import { ConfirmService, ToastService } from '../../../shared/feedback';
import { elapsedNow } from '../../../shared/format';
import { DateTimePipe, DurationPipe } from '../../../shared/pipes';
import {
  PageHeaderComponent, ProgressBarComponent, SongRowComponent, StatCardComponent, StatusBadgeComponent, VoteCountComponent,
  BadgeTone,
} from '../../../shared/ui';

/** Cada cuánto avanza la barra de progreso entre mensajes del servidor. */
const TICK_MS = 1000;

@Component({
  selector: 'app-operation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, PageHeaderComponent, StatusBadgeComponent, StatCardComponent, SongRowComponent, ProgressBarComponent,
    VoteCountComponent, DurationPipe, DateTimePipe,
  ],
  providers: [LiveQueueService],
  template: `
    <app-page-header title="Operación en vivo" [subtitle]="subtitle()">
      @if (!live.connected()) { <span class="muted small" role="status">Sin conexión en vivo</span> }
      <app-status-badge [tone]="badge().tone" [label]="badge().label" />
    </app-page-header>

    @if (live.failure(); as failure) { <p class="error-text" role="alert">{{ failure }}</p> }

    @if (!session()) {
      <section class="card stack" aria-labelledby="open-title">
        <h2 id="open-title">El servicio está cerrado</h2>
        <p class="muted">Mientras no haya una sesión abierta, nadie puede pedir ni votar. La música de la pantalla del bar queda en espera.</p>
        <form class="cluster" (ngSubmit)="openSession()">
          <label class="field grow">
            Nombre del evento (opcional)
            <input class="input" name="eventName" [(ngModel)]="eventName" maxlength="100" placeholder="Viernes crossover" />
          </label>
          <button class="btn btn-primary" type="submit" [disabled]="busy()">Abrir sesión</button>
        </form>
      </section>
    } @else {
      <div class="grid-stats">
        <app-stat-card label="Solicitudes" [value]="summary()?.songRequests ?? '—'" />
        <app-stat-card label="Usuarios únicos" [value]="summary()?.uniqueDevices ?? '—'" />
        <app-stat-card label="Votos" [value]="summary()?.votes?.total ?? '—'"
          [hint]="summary() ? summary()!.votes.support + ' de apoyo a canciones ya pedidas' : ''" />
      </div>

      <div class="split">
        <section class="card" aria-labelledby="queue-title">
          <h2 id="queue-title">Cola en vivo</h2>
          @for (entry of entries(); track entry.queueItemId) {
            <app-song-row [position]="entry.position" [title]="entry.title" [artist]="entry.artistDisplay" [thumbnail]="entry.thumbnailUrl">
              <span meta> · <app-vote-count [count]="entry.voteCount" /> votos · {{ entry.durationSeconds | duration }}</span>
              <button class="btn btn-small" type="button" [disabled]="busy()" (click)="remove(entry)">Retirar</button>
              <button class="btn btn-small" type="button" [disabled]="busy()" (click)="blockSong(entry.songId, entry.title)">Bloquear</button>
            </app-song-row>
          } @empty {
            <p class="empty">La cola está vacía: suena la lista por defecto.</p>
          }
        </section>

        <div class="stack">
          <section class="card" aria-labelledby="now-title">
            <div class="accent small strong" id="now-title">Sonando ahora</div>
            @if (nowPlaying(); as track) {
              <div class="now-title">{{ track.title }}</div>
              <div class="muted artist">{{ track.artistDisplay }}</div>
              <app-progress-bar [elapsed]="elapsed()" [duration]="track.durationSeconds" />
              <div class="cluster actions">
                <button class="btn btn-primary" type="button" [disabled]="busy()" (click)="skip()">Saltar canción</button>
                <button class="btn" type="button" [disabled]="busy()" (click)="blockSong(track.songId, track.title)">Bloquear</button>
              </div>
            } @else {
              <p class="muted">No suena nada ahora mismo.</p>
            }
          </section>

          <section class="card stack" aria-labelledby="service-title">
            <h2 id="service-title">Servicio</h2>
            @if (session()!.status === 'PAUSED') {
              <p class="notice">Servicio en pausa: no se aceptan pedidos ni votos. <strong>La música sigue sonando.</strong></p>
              <button class="btn btn-primary" type="button" [disabled]="busy()" (click)="resume()">Reanudar servicio</button>
            } @else {
              <p class="muted small">Pausar el servicio deja de aceptar pedidos y votos. La música no se detiene.</p>
              <button class="btn" type="button" [disabled]="busy()" (click)="pause()">Pausar servicio</button>
            }
            <button class="btn btn-danger" type="button" [disabled]="busy()" (click)="closeSession()">Cerrar sesión</button>
          </section>
        </div>
      </div>
    }

    <section class="card" aria-labelledby="blocks-title">
      <h2 id="blocks-title">Canciones bloqueadas</h2>
      @for (block of blocks(); track block.blockId) {
        <app-song-row [title]="block.title" [artist]="block.artistDisplay" [thumbnail]="block.thumbnailUrl">
          <span meta> · {{ block.reason ?? 'Sin motivo' }} · vence {{ block.expiresAt | dateTime }}</span>
          <button class="btn btn-small" type="button" [disabled]="busy()" (click)="lift(block)">Desbloquear</button>
        </app-song-row>
      } @empty {
        <p class="empty">No hay canciones bloqueadas.</p>
      }
    </section>
  `,
  styles: `
    .grow { flex: 1; min-width: 220px; }
    .now-title { font-size: 20px; font-weight: 700; }
    .artist { margin-bottom: 14px; }
    .actions { margin-top: 16px; }
    app-progress-bar { display: block; }
  `,
})
export class OperationComponent implements OnInit {
  protected readonly live = inject(LiveQueueService);
  private readonly api = inject(OperationApi);
  private readonly store = inject(SessionStore);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly session = signal<MusicSession | null>(null);
  protected readonly summary = signal<AnalyticsSummary | null>(null);
  protected readonly blocks = signal<Block[]>([]);
  protected readonly busy = signal(false);
  protected readonly now = signal(Date.now());
  protected eventName = '';

  private readonly summaryRefresh = new Subject<string>();

  protected readonly entries = computed(() => this.live.state()?.data.entries ?? []);
  protected readonly nowPlaying = computed(() => this.live.state()?.data.nowPlaying ?? null);
  protected readonly elapsed = computed(() => {
    const track = this.nowPlaying();
    const received = this.live.state()?.receivedAt ?? 0;
    return track ? elapsedNow(track.elapsedSeconds, received, track.durationSeconds, this.now()) : 0;
  });
  protected readonly subtitle = computed(() => {
    const venue = this.store.venue()?.venueName ?? '';
    const event = this.session()?.eventName;
    return event ? `${venue} · ${event}` : venue;
  });
  protected readonly badge = computed<{ tone: BadgeTone; label: string }>(() => {
    switch (this.session()?.status) {
      case 'ACTIVE': return { tone: 'ok', label: 'Servicio activo' };
      case 'PAUSED': return { tone: 'warn', label: 'Servicio en pausa' };
      default: return { tone: 'off', label: 'Servicio cerrado' };
    }
  });

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), TICK_MS);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  ngOnInit(): void {
    // Los indicadores no llegan por el socket: se vuelven a pedir con cada queue:state.
    this.summaryRefresh
      .pipe(debounceTime(300), switchMap((id) => this.api.nightSummary(id)), takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (s) => this.summary.set(s), error: () => undefined });

    this.live.updates$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((state) => {
      const known = this.session();
      if ((state.session?.id ?? null) !== (known?.id ?? null) || state.session?.status !== known?.status) this.loadSession();
      else if (known) this.summaryRefresh.next(known.id);
    });

    this.live.connect();
    this.loadSession();
    this.loadBlocks();
  }

  protected openSession(): void {
    this.perform(this.api.openSession(this.eventName.trim() || undefined), 'Sesión abierta. Ya se pueden hacer pedidos.', () => {
      this.eventName = '';
      this.loadSession();
    });
  }

  protected pause(): void {
    this.perform(this.api.pause(this.session()!.id), 'Servicio en pausa. La música sigue sonando.', () => this.loadSession());
  }

  protected resume(): void {
    this.perform(this.api.resume(this.session()!.id), 'Servicio reanudado.', () => this.loadSession());
  }

  protected async closeSession(): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Cerrar la sesión',
      message: 'Se acaba la noche: nadie podrá pedir ni votar y lo que suena se corta. Las canciones pendientes quedarán sin sonar.',
      confirmLabel: 'Cerrar sesión',
      danger: true,
    });
    if (ok) this.perform(this.api.close(this.session()!.id), 'Sesión cerrada.', () => this.loadSession());
  }

  protected async skip(): Promise<void> {
    const track = this.nowPlaying();
    if (!track) return;
    const ok = await this.confirm.ask({
      title: 'Saltar la canción',
      message: `«${track.title}» se corta y empieza la siguiente.`,
      confirmLabel: 'Saltar',
      danger: true,
    });
    if (ok) this.perform(this.api.skip(track.playbackId), 'Canción saltada.');
  }

  protected async remove(entry: QueueEntry): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Retirar de la cola',
      message: `«${entry.title}» sale de la cola. Se puede volver a pedir.`,
      confirmLabel: 'Retirar',
      danger: true,
    });
    if (ok) this.perform(this.api.removeEntry(entry.queueItemId), 'Entrada retirada de la cola.');
  }

  protected async blockSong(songId: string, title: string): Promise<void> {
    const reason = await this.confirm.askText({
      title: 'Bloquear la canción',
      message: `«${title}» no podrá pedirse ni sonar en el local mientras dure el bloqueo. Si suena, se salta.`,
      confirmLabel: 'Bloquear',
      danger: true,
      inputLabel: 'Motivo (opcional, lo verá quien la pida)',
      inputMaxLength: 200,
    });
    if (reason === null) return;
    this.perform(this.api.block(songId, reason || undefined), 'Canción bloqueada.', () => this.loadBlocks());
  }

  protected async lift(block: Block): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Desbloquear',
      message: `«${block.title}» podrá pedirse otra vez. Lo que se retiró de la cola no vuelve.`,
      confirmLabel: 'Desbloquear',
    });
    // Desbloquear no llega por el WebSocket: la lista se vuelve a pedir tras la acción propia.
    if (ok) this.perform(this.api.lift(block.blockId), 'Canción desbloqueada.', () => this.loadBlocks());
  }

  private loadSession(): void {
    this.api.currentSession().subscribe({
      next: (session) => {
        this.session.set(session);
        if (session) this.summaryRefresh.next(session.id);
        else this.summary.set(null);
      },
      error: (e: ApiError) => this.toast.error(e.message),
    });
  }

  private loadBlocks(): void {
    this.api.blocks().subscribe({ next: (blocks) => this.blocks.set(blocks), error: (e: ApiError) => this.toast.error(e.message) });
  }

  /** Ejecuta una acción del personal: evita dobles clics y deja a la vista el resultado. */
  private perform<T>(action: Observable<T>, successText: string, then?: () => void): void {
    this.busy.set(true);
    action.subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success(successText);
        then?.();
      },
      error: (e: ApiError) => {
        this.busy.set(false);
        this.toast.error(e.message);
      },
    });
  }
}
