import { HttpClient, HttpParams } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { SessionStore } from './session.store';

export abstract class VenueApi {
  protected readonly http = inject(HttpClient);
  private readonly store = inject(SessionStore);

  protected url(path = ''): string {
    return `${environment.apiUrl}/venues/${this.store.venueId()}${path}`;
  }

  protected params(values: Record<string, string | number | null | undefined>): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(values)) {
      if (value !== null && value !== undefined && value !== '') params = params.set(key, String(value));
    }
    return params;
  }
}
