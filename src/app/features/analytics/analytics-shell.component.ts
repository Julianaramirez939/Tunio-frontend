import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PageHeaderComponent } from '../../shared/ui';
import { AnalyticsFilterService } from './analytics-filter.service';

@Component({
  selector: 'app-analytics-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, RouterLinkActive, RouterOutlet, PageHeaderComponent],
  providers: [AnalyticsFilterService],
  template: `
    <app-page-header title="Analítica" subtitle="Lo que pidió y votó el público. Cada cifra la calcula el servidor.">
      <label class="field">
        <span class="sr-only">Periodo</span>
        <select class="input" aria-label="Periodo" [ngModel]="filter.preset()" (ngModelChange)="filter.choosePreset($event)">
          @if (filter.openSessionId()) { <option value="tonight">Esta noche</option> }
          <option value="7">Últimos 7 días</option>
          <option value="30">Últimos 30 días</option>
          @if (filter.sessions().length > 0) { <option value="session">Una sesión…</option> }
        </select>
      </label>
      @if (filter.preset() === 'session') {
        <label class="field">
          <span class="sr-only">Sesión</span>
          <select class="input" aria-label="Sesión" [ngModel]="filter.sessionId()" (ngModelChange)="filter.sessionId.set($event)">
            @for (s of filter.sessions(); track s.id) { <option [value]="s.id">{{ s.label }}</option> }
          </select>
        </label>
      }
    </app-page-header>

    <nav class="tabs" aria-label="Secciones del tablero">
      <a routerLink="." routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Descriptivo</a>
      <a routerLink="diagnostico" routerLinkActive="active">Diagnóstico y comparativo</a>
    </nav>

    @if (filter.loaded()) { <router-outlet /> }
  `,
})
export class AnalyticsShellComponent implements OnInit {
  protected readonly filter = inject(AnalyticsFilterService);

  ngOnInit(): void {
    this.filter.load();
  }
}
