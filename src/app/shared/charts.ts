import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface BarDatum { label: string; value: number; display: string; muted?: boolean }

/** Barras horizontales con etiqueta y valor (géneros, canciones más pedidas) */
@Component({
  selector: 'app-bar-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul>
      @for (bar of bars(); track bar.label) {
        <li>
          <span class="label" [title]="bar.label">{{ bar.label }}</span>
          <span class="track" aria-hidden="true"><span class="fill" [class.muted-fill]="bar.muted" [style.width.%]="percentOf(bar.value)"></span></span>
          <span class="value">{{ bar.display }}</span>
        </li>
      }
    </ul>
  `,
  styles: `
    ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
    li { display: flex; align-items: center; gap: 10px; }
    .label { width: 130px; flex: none; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .track { flex: 1; height: 10px; background: var(--line); border-radius: 5px; }
    .fill { display: block; height: 100%; background: var(--primary); border-radius: 5px; }
    .muted-fill { background: var(--line-strong); }
    .value { width: 64px; flex: none; text-align: right; font-weight: 700; font-size: 14px; font-variant-numeric: tabular-nums; }
  `,
})
export class BarListComponent {
  readonly bars = input.required<BarDatum[]>();
  private readonly max = computed(() => Math.max(1, ...this.bars().map((b) => b.value)));
  percentOf(value: number): number { return (value / this.max()) * 100; }
}

export interface ColumnDatum { label: string; value: number; highlight?: boolean }

@Component({
  selector: 'app-column-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chart" role="img" [attr.aria-label]="ariaLabel()">
      @for (col of columns(); track col.label) {
        <div class="col">
          <span class="num">{{ col.value }}</span>
          <span class="bar" [class.peak]="col.highlight" [style.height.%]="heightOf(col.value)"></span>
          <span class="muted small">{{ col.label }}</span>
        </div>
      }
    </div>
  `,
  styles: `
    .chart { display: flex; align-items: flex-end; gap: 8px; height: 190px; }
    .col { flex: 1; min-width: 0; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 4px; }
    .num { font-size: 13px; font-weight: 700; }
    .bar { width: 100%; max-width: 44px; background: var(--primary); border-radius: 6px 6px 0 0; min-height: 3px; }
    .peak { background: var(--accent); }
  `,
})
export class ColumnChartComponent {
  readonly columns = input.required<ColumnDatum[]>();
  readonly ariaLabel = input('Gráfica de columnas');
  private readonly max = computed(() => Math.max(1, ...this.columns().map((c) => c.value)));
  heightOf(value: number): number { return (value / this.max()) * 78; }
}
