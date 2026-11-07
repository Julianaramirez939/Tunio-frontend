import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AnalyticsSummary, GenreDistribution, HourlyParticipation, LowParticipation, NightComparison, Page,
  PlaybackHistoryItem, PopularSong, UnplayedRequests, VoteConcentration,
} from './models';
import { VenueApi } from './venue-api';

/** Filtro común del tablero: una sesión o un periodo */
export interface AnalyticsFilter { sessionId?: string; from?: string; to?: string }
export interface PageRequest { page: number; limit: number }

@Injectable({ providedIn: 'root' })
export class AnalyticsApi extends VenueApi {
  summary(f: AnalyticsFilter): Observable<AnalyticsSummary> {
    return this.get('/summary', f);
  }
  popularity(f: AnalyticsFilter, p: PageRequest): Observable<Page<PopularSong>> {
    return this.get('/popularity', f, p);
  }
  hourly(f: AnalyticsFilter): Observable<HourlyParticipation[]> {
    return this.get('/hourly-participation', f);
  }
  playbacks(f: AnalyticsFilter, p: PageRequest): Observable<Page<PlaybackHistoryItem>> {
    return this.get('/playbacks', f, p);
  }
  genres(f: AnalyticsFilter): Observable<GenreDistribution> {
    return this.get('/genres', f);
  }
  unplayed(f: AnalyticsFilter, p: PageRequest): Observable<UnplayedRequests> {
    return this.get('/unplayed-requests', f, p);
  }
  voteConcentration(f: AnalyticsFilter): Observable<VoteConcentration[]> {
    return this.get('/vote-concentration', f);
  }
  lowParticipation(f: AnalyticsFilter): Observable<LowParticipation[]> {
    return this.get('/low-participation', f);
  }
  nightComparison(f: AnalyticsFilter): Observable<NightComparison[]> {
    return this.get('/night-comparison', f);
  }

  private get<T>(path: string, f: AnalyticsFilter, p?: PageRequest): Observable<T> {
    return this.http.get<T>(this.url(`/analytics${path}`), { params: this.params({ ...f, ...p }) });
  }
}
