import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { Booking } from '../../interfaces/models';
import { PosterArtComponent } from '../../shared/poster-art.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { eur, fmtDateShort, fmtTime } from '../../utils/errors';

@Component({
  selector: 'app-tickets-page',
  standalone: true,
  imports: [RouterLink, PosterArtComponent, StatusBadgeComponent, EmptyStateComponent],
  template: `
    <main class="container page">
      <div class="section-head">
        <div>
          <h2 class="section-title">Mis entradas</h2>
          <p class="section-sub">Todas tus reservas y entradas de CineNova.</p>
        </div>
      </div>

      @if (loading()) {
        @for (i of [].constructor(3); track $index) {
          <div class="skeleton" style="height:110px;border-radius:12px;margin-bottom:14px"></div>
        }
      } @else if (tickets().length === 0) {
        <app-empty-state icon="🎟️" title="Todavía no tienes entradas" text="Elige una película en la cartelera y reserva tu butaca.">
          <div style="margin-top:16px"><a routerLink="/" class="btn btn-primary btn-sm">Ver cartelera</a></div>
        </app-empty-state>
      } @else {
        <div class="ticket-list">
          @for (t of tickets(); track t.id) {
            <a [routerLink]="['/ticket', t.id]" class="ticket-card">
              <div class="poster" style="width:52px">
                <app-poster [id]="t.movie?.id ?? 0" [title]="t.movie?.title ?? ''" [genre]="t.movie?.genre ?? ''" [year]="0" [hue]="t.movie?.posterHue ?? '3b82f6'" />
              </div>
              <div style="min-width:0">
                <h3>{{ t.movie?.title }}</h3>
                <div class="sub">
                  <span>{{ fmtDateShort(t.startTime) }} · {{ fmtTime(t.startTime) }}</span>
                  <span>{{ t.screenName }} · {{ t.format }}</span>
                  <span>{{ t.seatLabels.join(', ') }}</span>
                </div>
                <div style="margin-top:6px"><app-status-badge [status]="t.status" /></div>
              </div>
              <span class="amount">{{ eur(t.totalAmount) }}</span>
            </a>
          }
        </div>
      }
    </main>
  `,
})
export class TicketsPageComponent {
  private readonly http = inject(HttpClient);
  readonly loading = signal(true);
  readonly tickets = signal<Booking[]>([]);

  constructor() {
    void this.load();
  }

  async load() {
    try {
      const list = await firstValueFrom(this.http.get<Booking[]>('/api/bookings'));
      this.tickets.set(list);
    } finally {
      this.loading.set(false);
    }
  }

  readonly eur = eur;
  readonly fmtTime = fmtTime;
  readonly fmtDateShort = fmtDateShort;
}
