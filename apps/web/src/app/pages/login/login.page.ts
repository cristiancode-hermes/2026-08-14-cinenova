import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { apiError } from '../../utils/errors';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-form">
      <h1>Bienvenido de vuelta</h1>
      <p class="auth-sub">Entra con tu usuario o email para comprar tus entradas.</p>

      @if (error()) {
        <p class="form-error" role="alert">{{ error() }}</p>
      }

      <form (ngSubmit)="submit()" autocomplete="off">
        <div class="field">
          <label class="label" for="identifier">Usuario o email</label>
          <input
            id="identifier" name="identifier" type="text" required
            autocomplete="off"
            class="input" [(ngModel)]="identifier"
            placeholder="demo o demo@cinenova.dev"
          />
        </div>
        <div class="field">
          <label class="label" for="password">Contraseña</label>
          <input
            id="password" name="password" type="password" required
            autocomplete="new-password"
            class="input" [(ngModel)]="password"
            placeholder="••••••••"
          />
        </div>
        <button type="submit" class="btn btn-primary btn-block" [disabled]="loading()">
          @if (loading()) {
            <span class="spin" aria-hidden="true"></span> Entrando…
          } @else {
            Entrar
          }
        </button>
      </form>

      <!-- Credenciales demo visibles (regla Cristian: sin autocompletar) -->
      <div class="auth-demo">
        <p><strong>Cuenta de prueba con datos:</strong></p>
        <p style="margin-top:4px"><code>demo@cinenova.dev</code> · <code>demo1234</code></p>
      </div>

      <p class="auth-alt">
        ¿Aún no tienes cuenta?
        <a routerLink="/auth/register">Crea una gratis</a>
      </p>
    </div>
  `,
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  readonly identifier = signal('');
  readonly password = signal('');
  readonly loading = signal(false);
  readonly error = signal('');

  async submit() {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      await this.auth.login(this.identifier(), this.password());
      this.toast.success('¡Bienvenido de vuelta!');
      const next = this.route.snapshot.queryParamMap.get('next');
      await this.router.navigateByUrl(next && next.startsWith('/') ? next : '/');
    } catch (err) {
      this.error.set(apiError(err));
    } finally {
      this.loading.set(false);
    }
  }
}
