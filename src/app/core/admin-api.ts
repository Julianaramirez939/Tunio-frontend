import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Genre, GenreCoverage, Page, Playlist, PlaylistTrack, QrAccess, SearchResponse, UnclassifiedSong, Venue,
} from './models';
import { VenueApi } from './venue-api';

/** Lo que solo configura el administrador: local, QR, lista por defecto y géneros */
@Injectable({ providedIn: 'root' })
export class AdminApi extends VenueApi {
  venue(): Observable<Venue> {
    return this.http.get<Venue>(this.url());
  }
  rename(name: string): Observable<Venue> {
    return this.http.patch<Venue>(this.url(), { name });
  }

  qr(): Observable<QrAccess> {
    return this.http.get<QrAccess>(this.url('/qr'));
  }
  setQrEnabled(isEnabled: boolean): Observable<QrAccess> {
    return this.http.patch<QrAccess>(this.url('/qr'), { isEnabled });
  }
  regenerateQr(): Observable<QrAccess> {
    return this.http.post<QrAccess>(this.url('/qr/regenerate'), null);
  }
  /** PNG sin sobre que exige `Authorization`: se pide como blob, no con `<img src>`. */
  qrImage(): Observable<Blob> {
    return this.http.get(this.url('/qr/image'), { responseType: 'blob' });
  }

  search(q: string): Observable<SearchResponse> {
    return this.http.get<SearchResponse>(this.url('/search'), { params: this.params({ q }) });
  }
  playlist(): Observable<Playlist> {
    return this.http.get<Playlist>(this.url('/playlist'));
  }
  addTrack(youtubeVideoId: string): Observable<PlaylistTrack> {
    return this.http.post<PlaylistTrack>(this.url('/playlist/tracks'), { youtubeVideoId });
  }
  removeTrack(trackId: string): Observable<void> {
    return this.http.delete<void>(this.url(`/playlist/tracks/${trackId}`));
  }

  genres(): Observable<Genre[]> {
    return this.http.get<Genre[]>(this.url('/genres'));
  }
  setGenre(songId: string, genre: string): Observable<unknown> {
    return this.http.put(this.url(`/songs/${songId}/genre`), { genre });
  }
  unclassified(filter: { from?: string; to?: string; page: number; limit: number }): Observable<Page<UnclassifiedSong>> {
    return this.http.get<Page<UnclassifiedSong>>(this.url('/genres/unclassified-songs'), { params: this.params(filter) });
  }
  coverage(filter: { from?: string; to?: string }): Observable<GenreCoverage> {
    return this.http.get<GenreCoverage>(this.url('/genres/coverage'), { params: this.params(filter) });
  }
}
