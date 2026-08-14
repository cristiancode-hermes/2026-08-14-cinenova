import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { Booking } from '../../interfaces/models';
import { QrCodeComponent } from '../../shared/qr-code.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { apiError, eur, fmtDate, fmtDateTime, fmtTime } from '../../utils/errors';

@Component({
  selector: 'app-ticket-page',
  standalone: true,
  imports: [RouterLink, QrCodeComponent, StatusBadgeComponent, DatePipe],
  template: `
    <main class="ticket-wrap">
      <a routerLink="/tickets" class="back-link">← Mis entradas</a>

      @if (ticket(); as t) {
        <div class="ticket">
          <div class="ticket-top">
            <h2>Entrada CineNova</h2>
            <span class="t-code">{{ t.code ?? '—' }}</span>
          </div>

          <div class="ticket-body">
            <div>
              <div class="ticket-title">{{ t.movie?.title }}</div>
              <div class="ticket-movie-sub">{{ t.movie?.genre }} · {{ t.format }} · {{ t.language }}</div>

              <div class="ticket-row"><span class="k">Fecha</span><span class="v">{{ fmtDate(t.startTime) }}</span></div>
              <div class="ticket-row"><span class="k">Hora</span><span class="v">{{ fmtTime(t.startTime) }}</span></div>
              <div class="ticket-row"><span class="k">Sala</span><span class="v">{{ t.screenName }}</span></div>
              <div class="ticket-row"><span class="k">Butacas</span><span class="v ticket-seats">@for (s of t.seatLabels; track $index) { <span class="chip chip-accent">{{ s }}</span> }</span></div>
              <div class="ticket-row"><span class="k">Importe</span><span class="v">{{ eur(t.totalAmount) }}</span></div>
              <div class="ticket-row"><span class="k">Comprada</span><span class="v">{{ fmtDateTime(t.createdAt) }}</span></div>
            </div>
            <div class="qr-box">
              <app-qr [code]="t.code ?? 'CNV-' + t.id" />
            </div>
          </div>

          <div class="ticket-status">
            <app-status-badge [status]="t.status" />
            @if (t.status === 'pending' && t.expiresAt) {
              <span class="countdown">⏱ expira en {{ countdown() }}</span>
            }
            <div class="ticket-actions">
              @if (t.canConfirm) {
                <button class="btn btn-success btn-sm" [disabled]="acting()" (click)="act('confirm')">
                  @if (acting()) { <span class="spin"></span> } Confirmar pago · +{{ t.seatCount * 10 }} pts
                </button>
              }
              @if (t.canUse) {
                <button class="btn btn-primary btn-sm" [disabled]="acting()" (click)="act('use')">
                  @if (acting()) { <span class="spin"></span> } Usar entrada
                </button>
              }
              @if (t.canCancel) {
                <button class="btn btn-danger btn-sm" [disabled]="acting()" (click)="act('cancel')">Cancelar</button>
              }
            </div>
          </div>
        </div>

        <p class="muted" style="font-size:0.82rem;margin-top:14px;text-align:center">
          Muestra este código en la entrada de la sala. No es necesario imprimirlo.
        </p>
      } @else if (loading()) {
        <div class="skeleton" style="height:420px;border-radius:18px"></div>
      } @else {
        <div class="empty">
          <div class="big">🎟️</div>
          <p><strong>Entrada no encontrada</strong></p>
        </div>
      }
    </main>
  `,
})
export class TicketPageComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly ticket = signal<Booking | null>(null);
  readonly acting = signal(false);
  readonly countdown = signal('');

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    void this.load(id);
  }

  async load(id: number) {
    try {
      const t = await firstValueFrom(this.http.get<Booking>(`/api/bookings/${id}`));
      this.ticket.set(t);
      if (t.status === 'pending') this.startCountdown(t.expiresAt);
      void this.auth.refreshProfile();
    } finally {
      this.loading.set(false);
    }
  }

  startCountdown(expiresAt: string | null) {
    if (!expiresAt) return;
    const target = new Date(expiresAt).getTime();
    const tick = () => {
      const left = Math.max(0, target - Date.now());
      const m = Math.floor(left / 60000);
      const s = Math.floor((left % 60000) / 1000);
      this.countdown.set(`${m}:${String(s).padStart(2, '0')}`);
      if (left <= 0 && this.timer) {
        clearInterval(this.timer);
        void this.load(this.ticket()?.id ?? 0);
      }
    };
    tick();
    this.timer = setInterval(tick, 1000);
  }

  async act(action: 'confirm' | 'use' | 'cancel') {
    const t = this.ticket();
    if (!t || this.acting()) return;
    this.acting.set(true);
    try {
      await firstValueFrom(this.http.post(`/api/bookings/${t.id}/${action}`, {}));
      const msg =
        action === 'confirm'
          ? '¡Pago confirmado! Tu entrada está lista 🎟️'
          : action === 'use'
            ? '¡Disfruta de la película! 🍿'
            : 'Reserva cancelada';
      this.toast.success(msg);
      await this.load(t.id);
    } catch (err) {
      this.toast.error(apiError(err));
      await this.load(t.id);
    } finally {
      this.acting.set(false);
    }
  }

  readonly eur = eur;
  readonly fmtDate = fmtDate;
  readonly fmtTime = fmtTime;
  readonly fmtDateTime = fmtDateTime;
}
