import { ChangeDetectionStrategy, Component, ElementRef, Injectable, effect, inject, signal, viewChild } from '@angular/core';

export interface Toast { id: number; kind: 'ok' | 'error'; text: string }

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private nextId = 1;

  success(text: string): void { this.push('ok', text, 4000); }
  /** Los errores se quedan más tiempo: el usuario tiene que alcanzar a leerlos. */
  error(text: string): void { this.push('error', text, 8000); }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private push(kind: Toast['kind'], text: string, ms: number): void {
    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, kind, text }]);
    setTimeout(() => this.dismiss(id), ms);
  }
}

@Component({
  selector: 'app-toast-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="host" aria-live="polite">
      @for (t of toasts.toasts(); track t.id) {
        <div class="toast" [class.error]="t.kind === 'error'" [attr.role]="t.kind === 'error' ? 'alert' : 'status'">
          <span>{{ t.text }}</span>
          <button type="button" class="close" aria-label="Cerrar aviso" (click)="toasts.dismiss(t.id)">×</button>
        </div>
      }
    </div>
  `,
  styles: `
    .host { position: fixed; right: 20px; bottom: 20px; z-index: 50; display: flex; flex-direction: column; gap: 10px; max-width: min(420px, calc(100vw - 40px)); }
    .toast { display: flex; gap: 12px; align-items: flex-start; justify-content: space-between; background: var(--surface-2); border-left: 4px solid var(--ok); border-radius: 10px; padding: 12px 14px; box-shadow: 0 6px 24px rgb(0 0 0 / 0.5); }
    .toast.error { border-left-color: var(--danger); }
    .close { background: none; border: 0; cursor: pointer; font-size: 20px; line-height: 1; padding: 0 4px; color: var(--muted); }
  `,
})
export class ToastHostComponent {
  protected readonly toasts = inject(ToastService);
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  inputLabel?: string;
  inputMaxLength?: number;
}

interface ConfirmRequest extends ConfirmOptions { resolve: (answer: { ok: boolean; text: string }) => void }

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly request = signal<ConfirmRequest | null>(null);
  readonly text = signal('');

  ask(options: ConfirmOptions): Promise<boolean> {
    return this.open(options).then((answer) => answer.ok);
  }

  askText(options: ConfirmOptions): Promise<string | null> {
    return this.open(options).then((answer) => (answer.ok ? answer.text.trim() : null));
  }

  answer(ok: boolean): void {
    this.request()?.resolve({ ok, text: this.text() });
    this.request.set(null);
  }

  private open(options: ConfirmOptions): Promise<{ ok: boolean; text: string }> {
    this.text.set('');
    return new Promise((resolve) => this.request.set({ ...options, resolve }));
  }
}

@Component({
  selector: 'app-confirm-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialog (cancel)="$event.preventDefault(); confirm.answer(false)" aria-labelledby="confirm-title">
      @if (confirm.request(); as req) {
        <h2 id="confirm-title">{{ req.title }}</h2>
        <p class="muted">{{ req.message }}</p>
        @if (req.inputLabel) {
          <label class="field">
            {{ req.inputLabel }}
            <input class="input" type="text" [maxLength]="req.inputMaxLength ?? 200" [value]="confirm.text()" (input)="confirm.text.set($any($event.target).value)" />
          </label>
        }
        <div class="actions">
          <button type="button" class="btn" (click)="confirm.answer(false)">Cancelar</button>
          <button type="button" class="btn" [class.btn-danger]="req.danger" [class.btn-primary]="!req.danger" (click)="confirm.answer(true)">
            {{ req.confirmLabel }}
          </button>
        </div>
      }
    </dialog>
  `,
  styles: `
    dialog { background: var(--surface); color: var(--text); border: 1px solid var(--line-strong); border-radius: var(--radius); padding: 24px; max-width: 460px; width: calc(100vw - 40px); }
    dialog::backdrop { background: rgb(0 0 0 / 0.7); }
    h2 { margin-bottom: 10px; }
    .field { margin-top: 14px; }
    .actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
  `,
})
export class ConfirmHostComponent {
  protected readonly confirm = inject(ConfirmService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const el = this.dialog().nativeElement;
      if (this.confirm.request()) {
        if (!el.open) el.showModal();
      } else if (el.open) {
        el.close();
      }
    });
  }
}
