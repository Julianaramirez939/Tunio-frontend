import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { apiInterceptor } from '../../core/api.interceptor';
import { NowPlaying, QueueState } from '../../core/models';
import { SessionStore } from '../../core/session.store';
import { BarPlayerService } from './bar-player.service';
import { PlayerSurface } from './youtube-surface';

const BASE = `${environment.apiUrl}/venues/v1/player`;

function track(id: string, over: Partial<NowPlaying> = {}): NowPlaying {
  return {
    playbackId: id, songId: `song-${id}`, youtubeVideoId: `yt-${id}`, title: `Canción ${id}`, artistDisplay: 'Artista',
    thumbnailUrl: null, durationSeconds: 200, source: 'QUEUE', startedAt: '2026-11-07T22:00:00.000Z', elapsedSeconds: 0, ...over,
  };
}

function state(over: Partial<QueueState> = {}): QueueState {
  return { session: { id: 's1', status: 'ACTIVE' }, nowPlaying: null, entries: [], ...over };
}

/** Pasos que el servidor documenta para el reproductor (docs/07, 2.26 a 2.30), con un doble de YouTube. */
describe('reproductor de la pantalla del bar', () => {
  let player: BarPlayerService;
  let backend: HttpTestingController;
  let loaded: [string, number][];
  let stops: number;

  const reply = (url: string, data: NowPlaying | null) =>
    backend.expectOne(`${BASE}${url}`).flush({ success: true, data });

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]), provideHttpClient(withInterceptors([apiInterceptor])), provideHttpClientTesting(), BarPlayerService,
      ],
    });
    TestBed.inject(SessionStore).start({
      accessToken: 't', expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      staff: { id: 's', displayName: 'A', email: 'a@x.test', venues: [{ venueId: 'v1', venueName: 'Faro', role: 'ADMIN' }] },
    });
    backend = TestBed.inject(HttpTestingController);
    player = TestBed.inject(BarPlayerService);
    loaded = [];
    stops = 0;
    const surface: PlayerSurface = {
      ready: () => Promise.resolve(),
      load: (id, start) => loaded.push([id, start]),
      stop: () => stops++,
    };
    player.attach(surface);
  });

  afterEach(() => backend.verify());

  it('espera un gesto antes de empezar', () => {
    expect(player.phase()).toBe('waiting-gesture');
    player.onQueueState(state({ nowPlaying: track('1') }));
    expect(loaded).toEqual([]);
  });

  it('al iniciar pide `next` y retoma donde iba tras una recarga', async () => {
    await player.start();
    reply('/next', track('1', { elapsedSeconds: 73 }));
    expect(loaded).toEqual([['yt-1', 73]]);
    expect(player.phase()).toBe('playing');
  });

  it('al terminar avisa y carga la respuesta, sin volver a llamar a `next`', async () => {
    await player.start();
    reply('/next', track('1'));

    player.onEnded();
    reply('/playbacks/1/complete', track('2'));

    expect(loaded.map((l) => l[0])).toEqual(['yt-1', 'yt-2']);
    backend.expectNone(`${BASE}/next`);
  });

  it('`data: null` es «nada que poner», no un error', async () => {
    await player.start();
    reply('/next', null);
    expect(player.phase()).toBe('idle');
    expect(player.failure()).toBeNull();
  });

  it('los códigos 100, 101 y 150 avisan que el vídeo no está disponible', async () => {
    for (const code of [100, 101, 150]) {
      player.current.set(track('9'));
      player.onYoutubeError(code);
      const req = backend.expectOne(`${BASE}/playbacks/9/unavailable`);
      expect(req.request.body).toEqual({ errorMessage: `YouTube error ${code}` });
      req.flush({ success: true, data: null });
    }
  });

  it('cualquier otro error avisa como fallo pasajero', () => {
    player.current.set(track('9'));
    player.onYoutubeError(5);
    const req = backend.expectOne(`${BASE}/playbacks/9/error`);
    expect(req.request.body).toEqual({ errorMessage: 'YouTube error 5' });
    req.flush({ success: true, data: track('10') });
    expect(loaded).toEqual([['yt-10', 0]]);
  });

  it('si el DJ salta, carga el nowPlaying nuevo que llega por el socket', async () => {
    await player.start();
    reply('/next', track('1'));

    player.onQueueState(state({ nowPlaying: track('2') }));

    expect(loaded.map((l) => l[0])).toEqual(['yt-1', 'yt-2']);
  });

  it('la misma reproducción por HTTP y por socket no se carga dos veces', async () => {
    await player.start();
    reply('/next', track('1'));
    player.onEnded();
    player.onQueueState(state({ nowPlaying: track('2') })); // el socket gana la carrera
    reply('/playbacks/1/complete', track('2'));

    expect(loaded.map((l) => l[0])).toEqual(['yt-1', 'yt-2']);
  });

  it('un 409 «sin sesión abierta» muestra el cartel de servicio cerrado', async () => {
    await player.start();
    backend.expectOne(`${BASE}/next`).flush(
      { success: false, error: { statusCode: 409, message: 'The venue has no open session' } },
      { status: 409, statusText: 'Conflict' },
    );
    expect(player.phase()).toBe('closed');
  });

  it('al abrirse la sesión, pide qué suena aunque no haya cola', async () => {
    await player.start();
    backend.expectOne(`${BASE}/next`).flush(
      { success: false, error: { statusCode: 409, message: 'The venue has no open session' } },
      { status: 409, statusText: 'Conflict' },
    );

    player.onQueueState(state());
    reply('/next', track('1'));

    expect(player.phase()).toBe('playing');
  });

  it('si llega una solicitud y no suena nada, la pide al servidor', async () => {
    await player.start();
    reply('/next', null);

    player.onQueueState(state({ entries: [{ queueItemId: 'q' } as never] }));
    reply('/next', track('1'));

    expect(loaded.map((l) => l[0])).toEqual(['yt-1']);
  });

  it('si la sesión se cierra, detiene la música y muestra servicio cerrado', async () => {
    await player.start();
    reply('/next', track('1'));

    player.onQueueState(state({ session: null }));

    expect(player.phase()).toBe('closed');
    expect(player.current()).toBeNull();
    expect(stops).toBe(1);
  });

  it('un fallo de red se muestra y no se reintenta en silencio', async () => {
    await player.start();
    backend.expectOne(`${BASE}/next`).error(new ProgressEvent('error'));
    expect(player.failure()).toContain('No hay conexión');
    backend.expectNone(`${BASE}/next`);
  });
});
