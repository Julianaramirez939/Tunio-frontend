import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { Socket, io } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { translateMessage } from './api-error';
import { QueueState } from './models';
import { SessionStore } from './session.store';

export interface LiveQueue {
  data: QueueState;
  receivedAt: number;
}

@Injectable()
export class LiveQueueService implements OnDestroy {
  private readonly store = inject(SessionStore);
  private socket?: Socket;
  private readonly updatesSubject = new Subject<QueueState>();

  readonly state = signal<LiveQueue | null>(null);
  readonly connected = signal(false);
  /** Motivo (en español) por el que el servidor rechazó la conexión; null si todo va bien. */
  readonly failure = signal<string | null>(null);
  /** Cada estado recibido, sin colapsar: lo usa quien debe reaccionar a cada cambio. */
  readonly updates$ = this.updatesSubject.asObservable();

  connect(): void {
    if (this.socket) return;
    const socket = io(`${environment.apiUrl}/live`, {
      // Función: en cada reconexión lee el token vigente. Va en el handshake, nunca en la URL.
      auth: (send) => send({ accessToken: this.store.accessToken(), venueId: this.store.venueId() }),
    });
    this.socket = socket;

    socket.on('connect', () => {
      this.connected.set(true);
      this.failure.set(null);
    });
    socket.on('disconnect', () => this.connected.set(false));
    socket.on('queue:state', (data: QueueState) => {
      this.state.set({ data, receivedAt: Date.now() });
      this.updatesSubject.next(data);
    });
    socket.on('connect_error', (error: Error) => this.onConnectError(socket, error));
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = undefined;
    this.connected.set(false);
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.updatesSubject.complete();
  }

  private onConnectError(socket: Socket, error: Error): void {
    if (error.message === 'Unauthorized') {
      // Token vencido: reintentar en bucle no sirve, hay que volver a entrar.
      socket.disconnect();
      this.store.handleUnauthorized();
      return;
    }
    // Si el servidor rechazó la conexión, Socket.IO no reintenta: hay un motivo que mostrar.
    // Si fue un corte de red, `active` sigue en true y reconecta solo.
    if (!socket.active) {
      this.failure.set(translateMessage(error.message) ?? 'No se pudo abrir la conexión en vivo.');
    }
  }
}
