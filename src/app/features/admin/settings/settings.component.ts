import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../../core/admin-api';
import { ApiError } from '../../../core/api-error';
import { QrAccess } from '../../../core/models';
import { OperationApi } from '../../../core/operation-api';
import { ConfirmService, ToastService } from '../../../shared/feedback';
import { PageHeaderComponent } from '../../../shared/ui';

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, PageHeaderComponent],
  template: `
    <app-page-header title="Configuración" subtitle="Datos del establecimiento, código QR y mantenimiento" />

    <div class="split">
      <section class="card stack" aria-labelledby="venue-title">
        <h2 id="venue-title">Establecimiento</h2>
        <form class="cluster" (ngSubmit)="rename()">
          <label class="field grow">
            Nombre
            <input class="input" name="name" [(ngModel)]="name" maxlength="100" required />
          </label>
          <button class="btn btn-primary" type="submit" [disabled]="busy() || !name.trim()">Guardar nombre</button>
        </form>
      </section>

      <div class="stack">
        <section class="card stack" aria-labelledby="qr-title">
          <h2 id="qr-title">Código QR de acceso</h2>
          @if (qr(); as access) {
            <div class="qr-row">
              @if (qrUrl(); as url) {
                <img [src]="url" alt="Código QR del establecimiento" width="140" height="140" />
              }
              <div class="stack">
                <p class="small">
                  Estado: <strong [class.ok]="access.isEnabled" [class.danger]="!access.isEnabled">{{ access.isEnabled ? 'Activo' : 'Desactivado' }}</strong>
                </p>
                <p class="muted small">
                  El QR activo no basta: para pedir y votar también tiene que haber una <strong>sesión abierta</strong>.
                </p>
                <div class="cluster">
                  <button class="btn btn-small" type="button" [disabled]="busy()" (click)="toggleQr(!access.isEnabled)">
                    {{ access.isEnabled ? 'Desactivar QR' : 'Activar QR' }}
                  </button>
                  <button class="btn btn-small btn-primary" type="button" [disabled]="!qrUrl()" (click)="download()">Descargar QR</button>
                </div>
                <button class="btn btn-small btn-danger" type="button" [disabled]="busy()" (click)="regenerate()">Regenerar QR</button>
              </div>
            </div>
          } @else if (qrError()) {
            <p class="error-text" role="alert">{{ qrError() }}</p>
          }
        </section>

        <section class="card stack" aria-labelledby="maint-title">
          <h2 id="maint-title">Modo mantenimiento</h2>
          <p class="muted small">
            Vacía la cola de la sesión abierta sin cerrarla. Lo que suena sigue sonando y el histórico para la analítica se conserva:
            las entradas quedan como retiradas, no se borran.
          </p>
          <button class="btn" type="button" [disabled]="busy()" (click)="clearQueue()">Limpiar cola ahora</button>
        </section>
      </div>
    </div>
  `,
  styles: `
    .grow { flex: 1; min-width: 200px; }
    .qr-row { display: flex; gap: 18px; align-items: flex-start; flex-wrap: wrap; }
    .qr-row img { background: #fff; border-radius: 12px; }
  `,
})
export class SettingsComponent implements OnInit, OnDestroy {
  private readonly admin = inject(AdminApi);
  private readonly operation = inject(OperationApi);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly qr = signal<QrAccess | null>(null);
  protected readonly qrUrl = signal<string | null>(null);
  protected readonly qrError = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected name = '';
  private slug = 'tunio';

  ngOnInit(): void {
    this.admin.venue().subscribe({
      next: (venue) => {
        this.name = venue.name;
        this.slug = venue.slug;
      },
      error: (e: ApiError) => this.toast.error(e.message),
    });
    this.loadQr();
  }

  ngOnDestroy(): void {
    this.revoke();
  }

  protected rename(): void {
    this.busy.set(true);
    this.admin.rename(this.name.trim()).subscribe({
      next: (venue) => {
        this.busy.set(false);
        this.name = venue.name;
        this.toast.success('Nombre guardado.');
      },
      error: (e: ApiError) => this.fail(e),
    });
  }

  protected toggleQr(enabled: boolean): void {
    this.busy.set(true);
    this.admin.setQrEnabled(enabled).subscribe({
      next: (access) => {
        this.busy.set(false);
        this.qr.set(access);
        this.toast.success(enabled ? 'QR activado.' : 'QR desactivado: nadie podrá entrar con él.');
      },
      error: (e: ApiError) => this.fail(e),
    });
  }

  protected async regenerate(): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Regenerar el código QR',
      message: 'Los QR impresos con el código actual dejarán de funcionar y habrá que imprimir el nuevo.',
      confirmLabel: 'Regenerar',
      danger: true,
    });
    if (!ok) return;
    this.busy.set(true);
    this.admin.regenerateQr().subscribe({
      next: (access) => {
        this.busy.set(false);
        this.qr.set(access);
        this.toast.success('QR regenerado. Descarga e imprime el nuevo.');
        this.loadQrImage();
      },
      error: (e: ApiError) => this.fail(e),
    });
  }

  protected download(): void {
    const url = this.qrUrl();
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = `tunio-qr-${this.slug}.png`;
    link.click();
  }

  protected async clearQueue(): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Limpiar la cola',
      message: 'Se retiran todas las canciones pendientes de la sesión abierta. Lo que suena no se toca y el histórico se conserva.',
      confirmLabel: 'Limpiar cola',
      danger: true,
    });
    if (!ok) return;
    this.busy.set(true);
    this.operation.clearQueue().subscribe({
      next: ({ removedCount }) => {
        this.busy.set(false);
        this.toast.success(removedCount === 0 ? 'La cola ya estaba vacía.' : `Cola limpiada: ${removedCount} entradas retiradas.`);
      },
      error: (e: ApiError) => this.fail(e),
    });
  }

  private loadQr(): void {
    this.admin.qr().subscribe({
      next: (access) => {
        this.qr.set(access);
        this.loadQrImage();
      },
      error: (e: ApiError) => this.qrError.set(e.message),
    });
  }

  private loadQrImage(): void {
    this.admin.qrImage().subscribe({
      next: (blob) => {
        this.revoke();
        this.qrUrl.set(URL.createObjectURL(blob));
      },
      error: (e: ApiError) => this.qrError.set(e.message),
    });
  }

  private revoke(): void {
    const url = this.qrUrl();
    if (url) URL.revokeObjectURL(url);
    this.qrUrl.set(null);
  }

  private fail(e: ApiError): void {
    this.busy.set(false);
    this.toast.error(e.message);
  }
}
