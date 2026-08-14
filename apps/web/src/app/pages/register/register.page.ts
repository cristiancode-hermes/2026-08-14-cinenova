import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { apiError } from '../../utils/errors';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-form">
      <h1>Crea tu cuenta</h1>
      <p class="auth-sub">Únete a CineNova y acumula puntos con cada entrada.</p>

      @if (error()) {
        <p class="form-error" role="alert">{{ error() }}</p>
      }

      <form (ngSubmit)="submit()" autocomplete="off">
        <div class="field">
          <label class="label" for="name">Nombre</label>
          <input id="name" name="name" type="text" required autocomplete="off" class="input" [(ngModel)]="name" placeholder="Tu nombre" />
        </div>
        <div class="field">
          <label class="label" for="username">Usuario</label>
          <input id="username" name="username" type="text" required autocomplete="off" class="input" [(ngModel)]="username" placeholder="ej. cinelover" />
        </div>
        <div class="field">
          <label class="label" for="email">Email</label>
          <input id="email" name="email" type="email" required autocomplete="off" class="input" [(ngModel)]="email" placeholder="tu@email.com" />
        </div>
        <div class="field">
          <label class="label" for="password">Contraseña</label>
          <input id="password" name="password" type="password" required minlength="6" autocomplete="new-password" class="input" [(ngModel)]="password" placeholder="Mínimo 6 caracteres" />
        </div>
        <button type="submit" class="btn btn-primary btn-block" [disabled]="loading()">
          @if (loading()) {
            <span class="spin" aria-hidden="true"></span> Creando cuenta…
          } @else {
            Crear cuenta
          }
        </button>
      </form>

      <div class="auth-demo">
        <p>¿Solo quieres mirar? Prueba la <strong>cuenta demo</strong>:</p>
        <p style="margin-top:4px"><code>demo@cinenova.dev</code> · <code>demo1234</code></p>
      </div>

      <p class="auth-alt">
        ¿Ya tienes cuenta?
        <a routerLink="/auth/login">Entra</a>
      </p>
    </div>
  `,
})
export class RegisterPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly name = signal('');
  readonly username = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly loading = signal(false);
  readonly error = signal('');

  async submit() {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      await this.auth.register(this.username(), this.email(), this.name(), this.password());
      this.toast.success('¡Cuenta creada! 🎬');
      await this.router.navigate(['/']);
    } catch (err) {
      this.error.set(apiError(err));
    } finally {
      this.loading.set(false);
    }
  }
}
