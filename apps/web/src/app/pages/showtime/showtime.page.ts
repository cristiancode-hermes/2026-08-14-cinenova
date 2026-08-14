import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { Booking, SeatInfo, SeatMap } from '../../interfaces/models';
import { PosterArtComponent } from '../../shared/poster-art.component';
import { ToastService } from '../../services/toast.service';
import { apiError, eur, fmtDateTime } from '../../utils/errors';

@Component({
  selector: 'app-showtime-page',
  standalone: true,
  imports: [RouterLink, PosterArtComponent],
  template: `
    <main class="container seat-page">
      <div class="seat-stage">
        <a routerLink="/" class="back-link" style="margin-bottom:14px">← Cartelera</a>

        @if (map(); as m) {
          <div style="display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:6px">
            <h1 style="font-size:1.35rem">{{ m.showtime.movie?.title }}</h1>
            <span class="chip chip-accent">{{ m.showtime.format }} · {{ m.showtime.language }}</span>
          </div>
          <p class="muted" style="font-size:0.92rem;margin-bottom:22px">
            {{ fmtDateTime(m.showtime.startTime) }} · {{ m.screen.name }}
          </p>

          <div class="screen-arc">Pantalla</div>

          <div class="seat-map" role="group" aria-label="Mapa de butacas">
            @for (row of rows(); track row.label) {
              <div class="seat-row">
                <span class="seat-row-label">{{ row.label }}</span>
                @for (seat of row.seats; track seat.id) {
                  <button
                    type="button"
                    class="seat"
                    [class.premium]="seat.isPremium"
                    [class.wa]="seat.isWheelchair"
                    [class.selected]="seat.status === 'selected'"
                    [class.held]="seat.status === 'held'"
                    [class.taken]="seat.status === 'occupied'"
                    [disabled]="seat.status === 'occupied' || seat.status === 'held'"
                    (click)="toggle(seat)"
                    [attr.aria-label]="'Fila ' + row.label + ' butaca ' + seat.number + (seat.status === 'selected' ? ' seleccionada' : '')"
                  >
                    <span class="seat-num">{{ seat.number }}</span>
                  </button>
                }
              </div>
            }
          </div>

          <div class="seat-legend">
            <span class="legend-item"><span class="swatch swatch-free"></span> Libre</span>
            <span class="legend-item"><span class="swatch swatch-premium"></span> Premium</span>
            <span class="legend-item"><span class="swatch swatch-selected"></span> Tu selección</span>
            <span class="legend-item"><span class="swatch swatch-held"></span> Retenida</span>
            <span class="legend-item"><span class="swatch swatch-occupied"></span> Ocupada</span>
          </div>
        } @else if (loading()) {
          <div class="skeleton" style="height:420px;border-radius:16px"></div>
        } @else {
          <div class="empty">Función no encontrada o ya comenzó.</div>
        }
      </div>

      <aside class="seat-side">
        <div class="card seat-summary">
          <div class="title">Tu selección</div>
          <div class="sub">Máximo 8 butacas por compra</div>

          @if (selectedSeats().length > 0) {
            <div class="seat-pick">
              @for (s of selectedSeats(); track s.id) {
                <span class="chip chip-accent">{{ label(s) }}</span>
              }
            </div>
            <div class="price-line"><span>Butaca estándar × {{ standardCount() }}</span><span>{{ eur(standardTotal()) }}</span></div>
            @if (premiumCount() > 0) {
              <div class="price-line"><span>Butaca premium × {{ premiumCount() }}</span><span>{{ eur(premiumTotal()) }}</span></div>
            }
            <div class="price-line total"><span>Total</span><span class="amount">{{ eur(total()) }}</span></div>

            <button class="btn btn-primary btn-block" style="margin-top:14px" [disabled]="booking()" (click)="reserve()">
              @if (booking()) {
                <span class="spin"></span> Reservando…
              } @else {
                Reservar butacas
              }
            </button>
            <p class="muted" style="font-size:0.8rem;margin-top:10px;text-align:center">
              Las butacas quedan retenidas 10 minutos mientras pagas.
            </p>
          } @else {
            <div class="empty" style="padding:24px 12px">
              <div class="big" style="font-size:1.5rem">🪑</div>
              <p style="font-size:0.9rem">Toca las butacas libres para seleccionarlas.</p>
            </div>
          }
        </div>

        @if (error()) {
          <p class="form-error" role="alert">{{ error() }}</p>
        }
      </aside>
    </main>
  `,
})
export class ShowtimePageComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly map = signal<SeatMap | null>(null);
  readonly selected = signal<number[]>([]);
  readonly booking = signal(false);
  readonly error = signal('');

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    void this.load(id);
  }

  async load(id: number) {
    try {
      const m = await firstValueFrom(this.http.get<SeatMap>(`/api/showtimes/${id}/seats`));
      this.map.set(m);
    } catch (err) {
      this.error.set(apiError(err));
    } finally {
      this.loading.set(false);
    }
  }

  readonly rows = computed(() => {
    const m = this.map();
    if (!m) return [];
    const byRow = new Map<number, SeatInfo[]>();
    for (const s of m.seats) {
      const arr = byRow.get(s.row) ?? [];
      arr.push(s);
      byRow.set(s.row, arr);
    }
    return [...byRow.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([row, seats]) => ({
        label: String.fromCharCode(64 + row),
        seats: seats.sort((a, b) => a.number - b.number),
      }));
  });

  readonly selectedSeats = computed(() => {
    const m = this.map();
    if (!m) return [];
    return m.seats.filter((s) => this.selected().includes(s.id));
  });

  readonly premiumCount = computed(() => this.selectedSeats().filter((s) => s.isPremium).length);
  readonly standardCount = computed(() => this.selectedSeats().filter((s) => !s.isPremium).length);

  readonly premiumTotal = computed(() => {
    const m = this.map();
    if (!m) return 0;
    const perSeat = m.showtime.basePrice + m.screen.screenSurcharge + m.screen.premiumSurcharge;
    return Math.round(perSeat * this.premiumCount() * 100) / 100;
  });

  readonly standardTotal = computed(() => {
    const m = this.map();
    if (!m) return 0;
    const perSeat = m.showtime.basePrice + m.screen.screenSurcharge;
    return Math.round(perSeat * this.standardCount() * 100) / 100;
  });

  readonly total = computed(() => Math.round((this.premiumTotal() + this.standardTotal()) * 100) / 100);

  toggle(seat: SeatInfo) {
    const sel = this.selected();
    if (sel.includes(seat.id)) {
      this.selected.set(sel.filter((x) => x !== seat.id));
      return;
    }
    if (sel.length >= 8) {
      this.toast.error('Máximo 8 butacas por compra');
      return;
    }
    // Update el estado en el mapa para el render
    this.map.update((m) => {
      if (!m) return m;
      return {
        ...m,
        seats: m.seats.map((s) => (s.id === seat.id ? { ...s, status: 'selected' as const } : s)),
      };
    });
    this.selected.set([...sel, seat.id]);
  }

  label(s: SeatInfo): string {
    return `${String.fromCharCode(64 + s.row)}${s.number}`;
  }

  async reserve() {
    const m = this.map();
    if (!m || this.selected().length === 0 || this.booking()) return;
    this.booking.set(true);
    this.error.set('');
    try {
      const b = await firstValueFrom(
        this.http.post<Booking>('/api/bookings', { showtimeId: m.showtime.id, seatIds: this.selected() }),
      );
      this.toast.success('Butacas reservadas — confirma el pago para obtener tu entrada');
      await this.router.navigate(['/ticket', b.id]);
    } catch (err) {
      this.error.set(apiError(err));
      this.toast.error('No se pudo reservar: recarga el mapa de butacas');
      await this.load(m.showtime.id);
      this.selected.set([]);
    } finally {
      this.booking.set(false);
    }
  }

  readonly eur = eur;
  readonly fmtDateTime = fmtDateTime;
}
