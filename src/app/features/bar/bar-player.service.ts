import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiError } from '../../core/api-error';
import { NowPlaying, QueueState } from '../../core/models';
import { PlayerApi } from '../../core/player-api';
import { PlayerSurface } from './youtube-surface';

/** Códigos de YouTube que significan «este vídeo no se puede reproducir» (el servidor lo veta). */
const UNAVAILABLE_CODES = [100, 101, 150];
const NO_OPEN_SESSION = 'The venue has no open session';

export type PlayerPhase =
  | 'waiting-gesture' // el navegador exige un clic antes de dejar sonar
  | 'idle' // iniciado, pero el servidor no tiene nada que poner
  | 'playing'
  | 'closed'; // no hay sesión abierta

@Injectable()
export class BarPlayerService {
  private readonly api = inject(PlayerApi);
  private surface?: PlayerSurface;
  private started = false;

  readonly phase = signal<PlayerPhase>('waiting-gesture');
  readonly current = signal<NowPlaying | null>(null);
  /** Instante local en que se cargó `current`: con él la barra avanza entre mensajes. */
  readonly loadedAt = signal(0);
  /** Fallo que el personal debe ver; no se reintenta en silencio. */
  readonly failure = signal<string | null>(null);

  attach(surface: PlayerSurface): void {
    this.surface = surface;
  }

  /** Gesto inicial («Iniciar la noche»): desde aquí el encadenado funciona solo. */
  async start(): Promise<void> {
    this.started = true;
    this.failure.set(null);
    try {
      await this.surface?.ready();
    } catch (e) {
      this.failure.set((e as Error).message);
      this.started = false;
      return;
    }
    this.run(this.api.next());
  }

  retry(): void {
    this.failure.set(null);
    this.run(this.api.next());
  }

  /** YouTube informó que el vídeo terminó. */
  onEnded(): void {
    const playing = this.current();
    if (playing) this.run(this.api.complete(playing.playbackId));
  }

  /** YouTube informó un error de reproducción. */
  onYoutubeError(code: number): void {
    const playing = this.current();
    if (!playing) return;
    const message = `YouTube error ${code}`;
    this.run(UNAVAILABLE_CODES.includes(code) ? this.api.unavailable(playing.playbackId, message) : this.api.error(playing.playbackId, message));
  }

  /** Cada `queue:state` del WebSocket: el DJ pudo saltar o bloquear, o la sesión pudo abrirse o cerrarse. */
  onQueueState(state: QueueState): void {
    if (!this.started) return;
    if (!state.session) {
      this.close();
      return;
    }
    if (state.nowPlaying) {
      this.apply(state.nowPlaying);
    } else if (!this.current() && state.entries.length > 0) {
      // Había «nada que poner» o servicio cerrado y llegó algo: pedirlo es empezarlo (idempotente).
      this.run(this.api.next());
    } else if (!this.current() && this.phase() === 'closed') {
      // Sesión recién abierta: la lista por defecto puede sonar aunque no haya cola.
      this.run(this.api.next());
    }
  }

  private run(call: Observable<NowPlaying | null>): void {
    call.subscribe({
      next: (track) => this.apply(track),
      error: (e: ApiError) => {
        if (e.code === NO_OPEN_SESSION) this.close();
        else this.failure.set(e.message);
      },
    });
  }

  /** `null` es «no hay nada que poner», no un error: se espera al siguiente `queue:state`. */
  private apply(track: NowPlaying | null): void {
    this.failure.set(null);
    if (!track) {
      this.surface?.stop();
      this.current.set(null);
      this.phase.set('idle');
      return;
    }
    if (this.current()?.playbackId === track.playbackId) return;
    this.current.set(track);
    this.loadedAt.set(Date.now());
    this.phase.set('playing');
    this.surface?.load(track.youtubeVideoId, track.elapsedSeconds);
  }

  private close(): void {
    this.surface?.stop();
    this.current.set(null);
    this.phase.set('closed');
  }
}
