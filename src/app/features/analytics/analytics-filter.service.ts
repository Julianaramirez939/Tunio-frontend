import { Injectable, computed, inject, signal } from '@angular/core';
import { AnalyticsApi, AnalyticsFilter } from '../../core/analytics-api';
import { OperationApi } from '../../core/operation-api';
import { formatNightDate, lastDaysRange, weekdayName } from '../../shared/format';

export type PeriodPreset = 'tonight' | '7' | '30' | 'session';
export interface SessionOption { id: string; label: string }

/**
 * Filtro común del tablero: una sesión o un periodo, nunca los dos.*/
@Injectable()
export class AnalyticsFilterService {
  private readonly operation = inject(OperationApi);
  private readonly analytics = inject(AnalyticsApi);

  readonly loaded = signal(false);
  readonly openSessionId = signal<string | null>(null);
  readonly sessions = signal<SessionOption[]>([]);
  readonly preset = signal<PeriodPreset>('7');
  readonly sessionId = signal<string | null>(null);

  readonly filter = computed<AnalyticsFilter>(() => {
    switch (this.preset()) {
      case 'tonight': return { sessionId: this.openSessionId() ?? undefined };
      case 'session': return { sessionId: this.sessionId() ?? undefined };
      default: return lastDaysRange(Number(this.preset()));
    }
  });

  /** Sin sesión abierta no hay «esta noche»: la opción ni se ofrece. */
  load(): void {
    this.operation.currentSession().subscribe({
      next: (open) => {
        this.openSessionId.set(open?.id ?? null);
        if (open) {
          this.preset.set('tonight');
          this.sessions.set([{ id: open.id, label: `Abierta ahora${open.eventName ? ' · ' + open.eventName : ''}` }]);
        }
        this.loaded.set(true);
        this.loadClosedSessions();
      },
      error: () => this.loaded.set(true),
    });
  }

  choosePreset(preset: PeriodPreset): void {
    this.preset.set(preset);
    if (preset === 'session' && !this.sessionId()) this.sessionId.set(this.sessions()[0]?.id ?? null);
  }

  /** No hay un extremo que liste sesiones: las cerradas salen del comparativo por noche (2.49). */
  private loadClosedSessions(): void {
    this.analytics.nightComparison(lastDaysRange(30)).subscribe({
      next: (nights) => {
        const closed = nights.map((n) => ({
          id: n.sessionId,
          label: `${formatNightDate(n.nightDate)} · ${n.eventName ?? weekdayName(n.weekday)}`,
        }));
        this.sessions.update((open) => [...open, ...closed]);
        if (this.preset() === 'session' && !this.sessionId()) this.sessionId.set(this.sessions()[0]?.id ?? null);
      },
      error: () => undefined,
    });
  }
}
