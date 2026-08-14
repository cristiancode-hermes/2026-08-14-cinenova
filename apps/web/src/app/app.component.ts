import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { ToastService } from './services/toast.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (auth.showNav()) {
      <header class="nav">
        <div class="container nav-inner">
          <a routerLink="/" class="brand"><span class="brand-mark">N</span>Cine<em>Nova</em></a>
          <nav class="nav-links">
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Cartelera</a>
            <a routerLink="/tickets" routerLinkActive="active">Mis entradas</a>
            <a routerLink="/profile" routerLinkActive="active">Perfil</a>
          </nav>
          <div class="nav-spacer"></div>
          <div class="nav-user">
            @if (auth.user(); as u) {
              <span class="nav-pts" title="Puntos de fidelidad">★ {{ u.points }}</span>
              <button class="btn-ghost btn-sm" (click)="auth.logout(); goHome()">Salir</button>
            } @else {
              <a routerLink="/auth/login" class="btn-login">Entrar</a>
            }
          </div>
        </div>
      </header>
    }
    <router-outlet />
    <div class="toast-wrap" aria-live="polite">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast {{ t.kind }}" (click)="toast.dismiss(t.id)">{{ t.text }}</div>
      }
    </div>
  `,
})
export class AppComponent {
  public auth = inject(AuthService);
  public toast = inject(ToastService);

  goHome() {
    window.location.href = '/';
  }
}
