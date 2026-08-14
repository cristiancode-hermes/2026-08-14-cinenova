import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="auth-shell">
      <aside class="auth-brand">
        <div class="auth-brand-top">
          <span class="brand-mark">N</span>
          <span>Cine<em>Nova</em></span>
        </div>
        <div class="auth-brand-quote">
          <h2>La sesión de las <em>ocho</em> te espera.</h2>
          <p>Cartelera, butacas y entradas del cine de tu barrio. Sin colas, sin prisas.</p>
        </div>
        <div class="auth-brand-foot">
          <span>4 salas · Dolby IMAX</span>
          <span>·</span>
          <span>Entradas desde 7,50 €</span>
        </div>
      </aside>
      <main class="auth-main">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AuthLayoutComponent {}
