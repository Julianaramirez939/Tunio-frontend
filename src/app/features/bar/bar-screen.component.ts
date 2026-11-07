import {
  ChangeDetectionStrategy, Component, ElementRef, OnDestroy, OnInit, computed, effect, inject, signal, untracked, viewChild,
} from '@angular/core';
import { AdminApi } from '../../core/admin-api';
import { LiveQueueService } from '../../core/live-queue.service';
import { elapsedNow } from '../../shared/format';
import { WaitPipe } from '../../shared/pipes';
import { ProgressBarComponent, ThumbComponent, VoteCountComponent } from '../../shared/ui';
import { BarPlayerService } from './bar-player.service';
import { YouTubeSurface } from './youtube-surface';

/** Cuántas canciones caben de lejos sin apretar la pantalla. */
const VISIBLE_ENTRIES = 5;

/**
 * Pantalla del bar y reproductor. Se lee a cinco metros, en penumbra:
 * tipografía grande, contraste alto, poca información.
 */
@Component({
  selector: 'app-bar-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProgressBarComponent, ThumbComponent, VoteCountComponent, WaitPipe],
  providers: [LiveQueueService, BarPlayerService],
  template: `
    <div class="screen">
      <aside>
        <div class="brand">Tunio</div>
        <!-- El reproductor oficial va visible: lo exigen los términos de uso de YouTube. -->
        <div class="video" #playerHost></div>

        @if (player.current(); as track) {
          <div class="label accent">Sonando ahora</div>
          <div class="title">{{ track.title }}</div>
          <div class="artist">{{ track.artistDisplay }}</div>
          <app-progress-bar [elapsed]="elapsed()" [duration]="track.durationSeconds" />
        } @else if (player.phase() === 'idle') {
          <div class="label accent">Sin música por ahora</div>
          <div class="artist">No hay nada reproducible en la cola ni en la lista por defecto.</div>
        }
      </aside>

      <section>
        <div class="head">
          <h1>Siguientes en la cola</h1>
        </div>

        @if (status() === 'PAUSED') {
          <p class="banner">Servicio en pausa: no se aceptan pedidos ni votos. La música sigue sonando.</p>
        }

        @if (entries().length > 0) {
          <ol>
            @for (entry of entries(); track entry.queueItemId) {
              <li>
                <span class="pos accent">{{ entry.position }}</span>
                <app-thumb [src]="entry.thumbnailUrl" style="--thumb: 52px" />
                <div class="text">
                  <div class="entry-title">{{ entry.title }}</div>
                  <div class="entry-artist">{{ entry.artistDisplay }}</div>
                </div>
                <span class="wait">{{ entry.approxWaitSeconds | wait }}</span>
                <span class="meter" aria-hidden="true"><span [style.width.%]="(entry.voteCount / maxVotes()) * 100"></span></span>
                <app-vote-count class="votes" [count]="entry.voteCount" />
              </li>
            }
          </ol>
        } @else {
          <p class="empty-note">
            @if (live.state()?.data?.session) { La cola está vacía: suena la lista por defecto. } @else { Esperando a que se abra el servicio. }
          </p>
        }

        <footer>
          @if (qrUrl(); as url) {
            <img [src]="url" alt="Código QR para entrar a Tunio" width="104" height="104" />
          }
          <div>
            <div class="invite">Escanea y pide tu canción</div>
            <div class="artist">Un voto por persona y canción · sin registro</div>
          </div>
        </footer>
      </section>

      @if (player.phase() === 'waiting-gesture') {
        <div class="overlay">
          <div class="brand">Tunio</div>
          <button class="btn btn-primary start" type="button" (click)="player.start()">Iniciar la noche</button>
          <p class="artist">El navegador exige un clic para dejar sonar la música.</p>
          @if (player.failure(); as failure) { <p class="error-text" role="alert">{{ failure }}</p> }
        </div>
      } @else if (player.phase() === 'closed' || !live.state()?.data?.session) {
        @if (live.state()) {
          <div class="overlay closed" role="status">
            <div class="brand">Tunio</div>
            <div class="closed-title">Servicio cerrado</div>
            <p class="artist">Vuelve pronto. Cuando el personal abra la noche, la música arranca sola.</p>
          </div>
        }
      }

      @if (player.failure() && player.phase() !== 'waiting-gesture') {
        <div class="alert" role="alert">
          {{ player.failure() }}
          <button class="btn btn-small" type="button" (click)="player.retry()">Reintentar</button>
        </div>
      }
      @if (live.failure(); as failure) { <div class="alert" role="alert">{{ failure }}</div> }
      @if (!live.connected() && !live.failure()) { <div class="offline" role="status">Sin conexión</div> }

      @if (!fullscreen()) {
        <button class="btn btn-small fs" type="button" (click)="toggleFullscreen()">Pantalla completa</button>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .screen { position: relative; min-height: 100vh; display: flex; gap: 56px; padding: 40px 56px; background: var(--bg); overflow: hidden; }
    aside { width: min(30vw, 480px); flex: none; display: flex; flex-direction: column; }
    section { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .brand { font-size: 32px; font-weight: 700; color: var(--primary); }
    .video { width: 100%; aspect-ratio: 16 / 9; margin-top: 28px; border-radius: 20px; overflow: hidden; background: #000; }
    .label { font-size: 22px; font-weight: 700; margin-top: 24px; }
    .title { font-size: clamp(30px, 3.4vw, 46px); font-weight: 700; line-height: 1.1; }
    .artist { font-size: 22px; color: var(--muted); }
    app-progress-bar { margin-top: 20px; --bar-height: 10px; --time-size: 20px; }
    h1 { font-size: 36px; }
    .head { display: flex; justify-content: space-between; align-items: baseline; }
    .banner { margin-top: 12px; background: var(--accent); color: var(--bg); border-radius: 12px; padding: 10px 18px; font-size: 22px; font-weight: 700; }
    ol { list-style: none; margin: 16px 0 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
    li { display: flex; align-items: center; gap: 20px; background: var(--surface); border-radius: 18px; padding: 10px 20px; }
    .pos { width: 36px; font-size: 30px; font-weight: 700; text-align: center; }
    .text { flex: 1; min-width: 0; }
    .entry-title { font-size: 26px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .entry-artist { font-size: 20px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .wait { font-size: 20px; color: var(--muted); width: 90px; text-align: right; }
    .meter { width: 160px; height: 10px; background: var(--line); border-radius: 5px; flex: none; }
    .meter > span { display: block; height: 100%; background: var(--primary); border-radius: 5px; }
    .votes { width: 60px; font-size: 28px; }
    .empty-note { margin-top: 40px; font-size: 28px; color: var(--muted); }
    footer { margin-top: auto; display: flex; align-items: center; gap: 24px; background: var(--surface-2); border-radius: 20px; padding: 16px 24px; }
    footer img { border-radius: 12px; background: #fff; }
    .invite { font-size: 28px; font-weight: 700; }
    .overlay { position: absolute; inset: 0; z-index: 10; background: var(--bg); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; text-align: center; padding: 24px; }
    .start { min-height: 88px; font-size: 32px; padding: 0 64px; border-radius: 44px; }
    .closed-title { font-size: 64px; font-weight: 700; }
    .alert { position: absolute; left: 56px; right: 56px; top: 12px; z-index: 20; background: var(--danger); color: var(--bg); font-weight: 700; border-radius: 12px; padding: 10px 18px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .offline { position: absolute; right: 24px; top: 14px; z-index: 20; background: var(--surface-2); border: 1px solid var(--accent); color: var(--accent); border-radius: 20px; padding: 4px 14px; font-size: 14px; font-weight: 700; }
    .fs { position: absolute; right: 24px; bottom: 12px; z-index: 5; opacity: 0.6; }
    @media (max-width: 900px) { .screen { flex-direction: column; padding: 20px; gap: 24px; } aside { width: 100%; } }
  `,
})
export class BarScreenComponent implements OnInit, OnDestroy {
  protected readonly live = inject(LiveQueueService);
  protected readonly player = inject(BarPlayerService);
  private readonly admin = inject(AdminApi);

  private readonly playerHost = viewChild.required<ElementRef<HTMLElement>>('playerHost');
  private surface?: YouTubeSurface;
  private ticker?: ReturnType<typeof setInterval>;

  protected readonly now = signal(Date.now());
  protected readonly fullscreen = signal(!!document.fullscreenElement);
  protected readonly qrUrl = signal<string | null>(null);

  protected readonly status = computed(() => this.live.state()?.data.session?.status ?? null);
  protected readonly entries = computed(() => this.live.state()?.data.entries.slice(0, VISIBLE_ENTRIES) ?? []);
  protected readonly maxVotes = computed(() => Math.max(1, ...this.entries().map((e) => e.voteCount)));
  /** Segundos transcurridos de la canción: lo que informó el servidor más lo que pasó desde entonces. */
  protected readonly elapsed = computed(() => {
    const track = this.player.current();
    return track ? elapsedNow(track.elapsedSeconds, this.player.loadedAt(), track.durationSeconds, this.now()) : 0;
  });

  private readonly onFullscreen = () => this.fullscreen.set(!!document.fullscreenElement);

  constructor() {
    // El QR se vuelve a pedir cuando cambia el estado de la sesión: es lo que el ADMIN pudo haber tocado.
    effect(() => {
      this.status();
      untracked(() => this.loadQr());
    });
  }

  ngOnInit(): void {
    this.surface = new YouTubeSurface(this.playerHost().nativeElement, {
      ended: () => this.player.onEnded(),
      failed: (code) => this.player.onYoutubeError(code),
    });
    this.player.attach(this.surface);
    this.live.updates$.subscribe((state) => this.player.onQueueState(state));
    this.live.connect();
    this.ticker = setInterval(() => this.now.set(Date.now()), 1000);
    document.addEventListener('fullscreenchange', this.onFullscreen);
  }

  ngOnDestroy(): void {
    clearInterval(this.ticker);
    document.removeEventListener('fullscreenchange', this.onFullscreen);
    this.surface?.destroy();
    this.revokeQr();
  }

  protected toggleFullscreen(): void {
    void document.documentElement.requestFullscreen?.();
  }

  private loadQr(): void {
    // Si el QR está desactivado no se muestra (2.6); la imagen exige Authorization, así que va como blob (2.9).
    this.admin.qr().subscribe({
      next: (qr) => {
        if (!qr.isEnabled) return this.revokeQr();
        this.admin.qrImage().subscribe({
          next: (blob) => {
            this.revokeQr();
            this.qrUrl.set(URL.createObjectURL(blob));
          },
          error: () => this.revokeQr(),
        });
      },
      error: () => this.revokeQr(),
    });
  }

  private revokeQr(): void {
    const url = this.qrUrl();
    if (url) URL.revokeObjectURL(url);
    this.qrUrl.set(null);
  }
}
