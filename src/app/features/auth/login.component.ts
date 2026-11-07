import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiError } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { SessionStore } from '../../core/session.store';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <main>
      <form class="card" [formGroup]="form" (ngSubmit)="submit()">
        <div class="brand">Tunio</div>
        <h1>Acceso del personal</h1>

        @if (store.expired()) {
          <p class="notice" role="status">Tu sesión venció. Inicia sesión de nuevo para continuar.</p>
        }

        <label class="field">
          Correo
          <input class="input" type="email" formControlName="email" autocomplete="username" />
        </label>
        <label class="field">
          Contraseña
          <input class="input" type="password" formControlName="password" autocomplete="current-password" />
        </label>

        @if (error()) { <p class="error-text" role="alert">{{ error() }}</p> }

        <button class="btn btn-primary" type="submit" [disabled]="form.invalid || loading()">
          {{ loading() ? 'Entrando…' : 'Entrar' }}
        </button>
      </form>
    </main>
  `,
  styles: `
    main { min-height: 100vh; display: grid; place-items: center; padding: 16px; }
    form { width: min(400px, 100%); display: flex; flex-direction: column; gap: 16px; padding: 28px; }
    .brand { font-size: 28px; font-weight: 700; color: var(--primary); }
  `,
})
export class LoginComponent {
  protected readonly store = inject(SessionStore);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.maxLength(72)]],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => void this.router.navigate([this.store.venueId() ? '/admin' : '/select-venue']),
      error: (e: ApiError) => {
        this.error.set(e.message);
        this.loading.set(false);
      },
    });
  }
}
