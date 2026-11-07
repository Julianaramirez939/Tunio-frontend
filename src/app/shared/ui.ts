import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DurationPipe } from './pipes';

@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="spread">
      <div>
        <h1>{{ title() }}</h1>
        @if (subtitle()) { <p class="muted small">{{ subtitle() }}</p> }
      </div>
      <div class="cluster"><ng-content /></div>
    </header>
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}

export type BadgeTone = 'ok' | 'warn' | 'off' | 'danger';

/** Insignia de estado. Lleva siempre texto: el color solo no comunica. */
@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class]="tone()">{{ label() }}</span>`,
  styles: `
    .badge { display: inline-flex; align-items: center; min-height: 44px; padding: 0 20px; border-radius: 22px; font-weight: 700; }
    .compact .badge { min-height: 28px; padding: 0 12px; font-size: 13px; }
    .ok { background: var(--ok); color: var(--bg); }
    .warn { background: var(--accent); color: var(--bg); }
    .off { background: var(--line-strong); color: var(--text); }
    .danger { background: var(--danger); color: var(--bg); }
  `,
  host: { '[class.compact]': 'compact()' },
})
export class StatusBadgeComponent {
  readonly tone = input<BadgeTone>('off');
  readonly label = input.required<string>();
  readonly compact = input(false);
}

@Component({
  selector: 'app-stat-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <div class="muted small">{{ label() }}</div>
      <div class="value">{{ value() }}</div>
      @if (hint()) { <div class="small hint">{{ hint() }}</div> }
    </div>
  `,
  styles: `
    .value { font-size: clamp(22px, 2.4vw, 32px); font-weight: 700; line-height: 1.2; overflow-wrap: anywhere; }
    .hint { color: var(--ok); margin-top: 2px; }
  `,
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly hint = input<string>();
}

/** Miniatura de canción*/
@Component({
  selector: 'app-thumb',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (src()) { <img [src]="src()" alt="" loading="lazy" /> } @else { <span class="blank" aria-hidden="true"></span> }
  `,
  styles: `
    :host { display: block; flex: none; width: var(--thumb, 44px); height: var(--thumb, 44px); }
    img, .blank { width: 100%; height: 100%; border-radius: 10px; object-fit: cover; background: #5b4b8a; display: block; }
  `,
})
export class ThumbComponent {
  readonly src = input<string | null | undefined>();
}

@Component({
  selector: 'app-vote-count',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="count" [attr.aria-label]="count() + ' votos'">{{ count() }}</span>
  `,
  styles: `
    .count { display: inline-block; min-width: 2ch; text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; }
  `,
})
export class VoteCountComponent {
  readonly count = input.required<number>();
}

@Component({
  selector: 'app-song-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThumbComponent],
  template: `
    @if (position() !== null) { <div class="pos accent">{{ position() }}</div> }
    <app-thumb [src]="thumbnail()" />
    <div class="text">
      <div class="title">{{ title() }}</div>
      <div class="muted small">{{ artist() }}<ng-content select="[meta]" /></div>
    </div>
    <ng-content />
  `,
  styles: `
    :host { display: flex; align-items: center; gap: 14px; padding: 10px 0; border-top: 1px solid var(--line); }
    :host(:first-child) { border-top: 0; }
    .pos { width: 28px; font-weight: 700; text-align: center; }
    .text { flex: 1; min-width: 0; }
    .title { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .text .muted { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  `,
})
export class SongRowComponent {
  readonly title = input.required<string>();
  readonly artist = input.required<string>();
  readonly thumbnail = input<string | null>();
  readonly position = input<number | null>(null);
}

/** Barra de progreso de la canción que suena. */
@Component({
  selector: 'app-progress-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DurationPipe],
  template: `
    <div class="track" role="progressbar" [attr.aria-valuenow]="percent()" aria-valuemin="0" aria-valuemax="100" aria-label="Progreso de la canción">
      <div class="fill" [style.width.%]="percent()"></div>
    </div>
    <div class="time">{{ elapsed() | duration }} / {{ duration() | duration }}</div>
  `,
  styles: `
    .track { height: var(--bar-height, 8px); background: var(--line); border-radius: 4px; }
    .fill { height: 100%; background: var(--accent); border-radius: 4px; transition: width 0.4s linear; }
    .time { color: var(--muted); margin-top: 8px; font-variant-numeric: tabular-nums; font-size: var(--time-size, 14px); }
  `,
})
export class ProgressBarComponent {
  readonly elapsed = input.required<number>();
  readonly duration = input.required<number>();
  readonly percent = computed(() => (this.duration() > 0 ? Math.min(100, (this.elapsed() / this.duration()) * 100) : 0));
}

/** Paginación de las listas `{ items, meta }`. */
@Component({
  selector: 'app-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (totalPages() > 1) {
      <nav class="cluster" aria-label="Paginación">
        <button class="btn btn-small" type="button" [disabled]="page() <= 1" (click)="go.emit(page() - 1)">Anterior</button>
        <span class="muted small">Página {{ page() }} de {{ totalPages() }}</span>
        <button class="btn btn-small" type="button" [disabled]="page() >= totalPages()" (click)="go.emit(page() + 1)">Siguiente</button>
      </nav>
    }
  `,
})
export class PaginationComponent {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly go = output<number>();
}
