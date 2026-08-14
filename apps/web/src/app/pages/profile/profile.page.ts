import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { MeProfile } from '../../interfaces/models';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  template: `
    <main class="container page">
      <div class="section-head">
        <div>
          <h2 class="section-title">Mi perfil</h2>
          <p class="section-sub">Tu cuenta y tu programa de fidelidad.</p>
        </div>
      </div>

      @if (profile(); as p) {
        <div class="profile-grid">
          <div class="card">
            <h3 style="margin-bottom:16px;font-size:1.05rem">{{ p.name }}</h3>
            <div class="ticket-row"><span class="k">Usuario</span><span class="v">@{{ p.username }}</span></div>
            <div class="ticket-row"><span class="k">Email</span><span class="v">{{ p.email }}</span></div>
            <div class="ticket-row"><span class="k">Entradas confirmadas</span><span class="v">{{ p.loyalty.tickets }}</span></div>
            <div class="ticket-row"><span class="k">Miembro desde</span><span class="v">2026</span></div>
          </div>

          <div class="loyalty-card">
            <div class="loyalty-tier">
              <span class="tier-badge {{ p.loyalty.tier }}">{{ tierIcon(p.loyalty.tier) }}</span>
              <div>
                <h3>{{ tierName(p.loyalty.tier) }}</h3>
                <div class="tier-name">Programa Nova Club</div>
              </div>
            </div>
            <div class="loyalty-points">{{ p.loyalty.points }} <span>puntos</span></div>
            @if (p.loyalty.nextTier) {
              <div class="progress"><i [style.width.%]="p.loyalty.progressPct"></i></div>
              <div class="progress-label">
                Te faltan <strong style="color:var(--accent)">{{ p.loyalty.pointsToNext }}</strong> puntos para el nivel {{ tierName(p.loyalty.nextTier) }}
              </div>
            } @else {
              <div class="progress"><i style="width:100%"></i></div>
              <div class="progress-label">¡Nivel máximo alcanzado! 🏆</div>
            }
            <p class="muted" style="font-size:0.82rem;margin-top:14px">
              Ganas <strong>10 puntos por cada butaca</strong> que confirmas. Plata desde 100 pts y Oro desde 250 pts.
            </p>
          </div>
        </div>
      } @else {
        <div class="skeleton" style="height:260px;border-radius:16px"></div>
      }
    </main>
  `,
})
export class ProfilePageComponent {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  readonly profile = signal<MeProfile | null>(null);

  constructor() {
    void this.load();
  }

  async load() {
    try {
      const me = await firstValueFrom(this.http.get<MeProfile>('/api/me'));
      this.profile.set(me);
      if (me) this.auth.setPoints(me.points);
    } catch {
      /* noop */
    }
  }

  tierIcon(tier: string): string {
    return tier === 'oro' ? '👑' : tier === 'plata' ? '🥈' : '🥉';
  }
  tierName(tier: string): string {
    return tier === 'oro' ? 'Nivel Oro' : tier === 'plata' ? 'Nivel Plata' : 'Nivel Bronce';
  }
}
