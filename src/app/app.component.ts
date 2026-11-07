import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { SessionStore } from './core/session.store';
import { ConfirmHostComponent, ToastHostComponent } from './shared/feedback';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastHostComponent, ConfirmHostComponent],
  template: `
    <router-outlet />
    <app-toast-host />
    <app-confirm-host />
  `,
})
export class AppComponent implements OnInit {
  private readonly store = inject(SessionStore);
  private readonly auth = inject(AuthService);

  ngOnInit(): void {
    // Con un token guardado, se confirma y se refrescan los roles por local.
    if (this.store.isLoggedIn()) this.auth.restore().subscribe({ error: () => undefined });
  }
}
