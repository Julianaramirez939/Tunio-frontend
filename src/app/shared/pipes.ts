import { Pipe, PipeTransform } from '@angular/core';
import {
  formatDateTime, formatDay, formatDuration, formatHour, formatNightDate, formatTotalDuration, formatWait,
  formatWaitPrecise, weekdayName,
} from './format';


@Pipe({ name: 'duration' })
export class DurationPipe implements PipeTransform {
  transform(seconds: number): string { return formatDuration(seconds); }
}
@Pipe({ name: 'totalDuration' })
export class TotalDurationPipe implements PipeTransform {
  transform(seconds: number): string { return formatTotalDuration(seconds); }
}
@Pipe({ name: 'wait' })
export class WaitPipe implements PipeTransform {
  transform(seconds: number): string { return formatWait(seconds); }
}
@Pipe({ name: 'waitPrecise' })
export class WaitPrecisePipe implements PipeTransform {
  transform(seconds: number): string { return formatWaitPrecise(seconds); }
}
@Pipe({ name: 'dateTime' })
export class DateTimePipe implements PipeTransform {
  transform(iso: string): string { return formatDateTime(iso); }
}
@Pipe({ name: 'day' })
export class DayPipe implements PipeTransform {
  transform(iso: string): string { return formatDay(iso); }
}
@Pipe({ name: 'nightDate' })
export class NightDatePipe implements PipeTransform {
  transform(day: string): string { return formatNightDate(day); }
}
@Pipe({ name: 'weekday' })
export class WeekdayPipe implements PipeTransform {
  transform(isoWeekday: number): string { return weekdayName(isoWeekday); }
}
@Pipe({ name: 'hour' })
export class HourPipe implements PipeTransform {
  transform(hour: number): string { return formatHour(hour); }
}

export const FORMAT_PIPES = [
  DurationPipe, TotalDurationPipe, WaitPipe, WaitPrecisePipe, DateTimePipe, DayPipe, NightDatePipe, WeekdayPipe, HourPipe,
] as const;
