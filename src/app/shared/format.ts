import { environment } from '../../environments/environment';

const TZ = environment.timezone;

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

export function formatTotalDuration(totalSeconds: number): string {
  const minutes = Math.round(Math.max(0, totalSeconds) / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function formatWait(seconds: number): string {
  if (seconds < 30) return 'ahora';
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const m = minutes % 60;
  return m === 0 ? `${Math.floor(minutes / 60)} h` : `${Math.floor(minutes / 60)} h ${m} min`;
}

export function formatWaitPrecise(seconds: number): string {
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  return m === 0 ? `${s} s` : `${m} min ${String(s % 60).padStart(2, '0')} s`;
}

export function elapsedNow(elapsedSeconds: number, receivedAt: number, durationSeconds: number, now = Date.now()): number {
  const advanced = elapsedSeconds + Math.max(0, now - receivedAt) / 1000;
  return Math.min(advanced, durationSeconds);
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: TZ, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  }).format(new Date(iso));
}

export function formatDay(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso));
}

export function formatNightDate(nightDate: string): string {
  return new Intl.DateTimeFormat('es-CO', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(`${nightDate}T00:00:00Z`));
}

const WEEKDAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
export function weekdayName(isoWeekday: number): string {
  return WEEKDAYS[isoWeekday - 1] ?? '';
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')} h`;
}

export function todayInBogota(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function shiftDay(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function lastDaysRange(days: number, now = new Date()): { from: string; to: string } {
  const to = todayInBogota(now);
  return { from: shiftDay(to, -(days - 1)), to };
}
