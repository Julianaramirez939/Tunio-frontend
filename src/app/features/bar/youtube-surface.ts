export interface PlayerSurface {
  /** Resuelve cuando el reproductor puede recibir órdenes. */
  ready(): Promise<void>;
  load(youtubeVideoId: string, startSeconds: number): void;
  stop(): void;
}

export interface SurfaceEvents {
  ended(): void;
  /** Código de error de YouTube (2, 5, 100, 101, 150). */
  failed(code: number): void;
}

interface YtPlayer {
  loadVideoById(options: { videoId: string; startSeconds: number }): void;
  stopVideo(): void;
  destroy(): void;
}
interface YtNamespace {
  Player: new (
    el: HTMLElement,
    options: {
      width: string; height: string; videoId?: string;
      playerVars: Record<string, number>;
      events: { onReady: () => void; onStateChange: (e: { data: number }) => void; onError: (e: { data: number }) => void };
    },
  ) => YtPlayer;
  PlayerState: { ENDED: number };
}
type YtWindow = Window & { YT?: YtNamespace; onYouTubeIframeAPIReady?: () => void };

const API_SRC = 'https://www.youtube.com/iframe_api';
let apiLoading: Promise<YtNamespace> | undefined;

/** Carga el script oficial una sola vez. */
function loadApi(): Promise<YtNamespace> {
  const w = window as YtWindow;
  if (w.YT?.Player) return Promise.resolve(w.YT);
  apiLoading ??= new Promise<YtNamespace>((resolve, reject) => {
    w.onYouTubeIframeAPIReady = () => resolve(w.YT as YtNamespace);
    const script = document.createElement('script');
    script.src = API_SRC;
    script.onerror = () => {
      apiLoading = undefined;
      reject(new Error('No se pudo cargar el reproductor de YouTube.'));
    };
    document.head.appendChild(script);
  });
  return apiLoading;
}

export class YouTubeSurface implements PlayerSurface {
  private player?: YtPlayer;
  private yt?: YtNamespace;
  private readyPromise?: Promise<void>;

  constructor(private readonly host: HTMLElement, private readonly events: SurfaceEvents) {}

  ready(): Promise<void> {
    this.readyPromise ??= loadApi().then((yt) => { this.yt = yt; });
    return this.readyPromise;
  }

  load(youtubeVideoId: string, startSeconds: number): void {
    const start = Math.max(0, Math.floor(startSeconds));
    if (this.player) {
      this.player.loadVideoById({ videoId: youtubeVideoId, startSeconds: start });
      return;
    }
    // YouTube reemplaza el elemento por un iframe: se le da uno propio para no perder el contenedor.
    const target = document.createElement('div');
    this.host.appendChild(target);
    const yt = this.yt!;
    this.player = new yt.Player(target, {
      width: '100%',
      height: '100%',
      videoId: youtubeVideoId,
      playerVars: { autoplay: 1, controls: 0, rel: 0, playsinline: 1, start },
      events: {
        onReady: () => undefined,
        onStateChange: (e) => { if (e.data === yt.PlayerState.ENDED) this.events.ended(); },
        onError: (e) => this.events.failed(e.data),
      },
    });
  }

  stop(): void {
    this.player?.stopVideo();
  }

  destroy(): void {
    this.player?.destroy();
    this.player = undefined;
  }
}
