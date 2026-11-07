import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { NowPlaying } from './models';
import { VenueApi } from './venue-api';

/** Extremos del reproductor. Todos devuelven ya la siguiente canción, o null. */
@Injectable({ providedIn: 'root' })
export class PlayerApi extends VenueApi {
  next(): Observable<NowPlaying | null> {
    return this.http.post<NowPlaying | null>(this.url('/player/next'), null);
  }
  complete(playbackId: string): Observable<NowPlaying | null> {
    return this.http.post<NowPlaying | null>(this.url(`/player/playbacks/${playbackId}/complete`), null);
  }
  unavailable(playbackId: string, errorMessage: string): Observable<NowPlaying | null> {
    return this.http.post<NowPlaying | null>(this.url(`/player/playbacks/${playbackId}/unavailable`), { errorMessage });
  }
  error(playbackId: string, errorMessage: string): Observable<NowPlaying | null> {
    return this.http.post<NowPlaying | null>(this.url(`/player/playbacks/${playbackId}/error`), { errorMessage });
  }
}
