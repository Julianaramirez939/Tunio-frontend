import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminAction, AnalyticsSummary, Block, MusicSession, NowPlaying, Page, QueueState } from './models';
import { VenueApi } from './venue-api';

/** Sesión de la noche, cola, bloqueos y bitácora: lo que opera el personal. */
@Injectable({ providedIn: 'root' })
export class OperationApi extends VenueApi {
  currentSession(): Observable<MusicSession | null> {
    return this.http.get<MusicSession | null>(this.url('/sessions/current'));
  }
  openSession(eventName?: string): Observable<MusicSession> {
    return this.http.post<MusicSession>(this.url('/sessions'), eventName ? { eventName } : {});
  }
  pause(sessionId: string): Observable<MusicSession> {
    return this.http.post<MusicSession>(this.url(`/sessions/${sessionId}/pause`), null);
  }
  resume(sessionId: string): Observable<MusicSession> {
    return this.http.post<MusicSession>(this.url(`/sessions/${sessionId}/resume`), null);
  }
  close(sessionId: string): Observable<MusicSession> {
    return this.http.post<MusicSession>(this.url(`/sessions/${sessionId}/close`), null);
  }

  queue(): Observable<QueueState> {
    return this.http.get<QueueState>(this.url('/queue'));
  }
  skip(playbackId: string): Observable<NowPlaying | null> {
    return this.http.post<NowPlaying | null>(this.url(`/player/playbacks/${playbackId}/skip`), null);
  }
  removeEntry(queueItemId: string): Observable<void> {
    return this.http.post<void>(this.url(`/queue/items/${queueItemId}/remove`), null);
  }
  clearQueue(): Observable<{ removedCount: number }> {
    return this.http.post<{ removedCount: number }>(this.url('/queue/clear'), null);
  }

  blocks(): Observable<Block[]> {
    return this.http.get<Block[]>(this.url('/blocks'));
  }
  block(songId: string, reason?: string): Observable<Block> {
    return this.http.post<Block>(this.url('/blocks'), reason ? { songId, reason } : { songId });
  }
  lift(blockId: string): Observable<Block> {
    return this.http.post<Block>(this.url(`/blocks/${blockId}/lift`), null);
  }

  nightSummary(sessionId: string): Observable<AnalyticsSummary> {
    return this.http.get<AnalyticsSummary>(this.url('/analytics/summary'), { params: this.params({ sessionId }) });
  }

  adminActions(filter: { from?: string; to?: string; page: number; limit: number }): Observable<Page<AdminAction>> {
    return this.http.get<Page<AdminAction>>(this.url('/admin-actions'), { params: this.params(filter) });
  }
}
