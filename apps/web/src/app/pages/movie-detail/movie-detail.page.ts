import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import type { MovieDetail, Review, ShowtimeSummary } from '../../interfaces/models';
import { PosterArtComponent } from '../../shared/poster-art.component';
import { StarsComponent } from '../../shared/stars.component';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { apiError, fmtDate, fmtDateShort, fmtTime } from '../../utils/errors';

@Component({
  selector: 'app-movie-detail-page',
  standalone: true,
  imports: [RouterLink, PosterArtComponent, StarsComponent, FormsModule, DatePipe],
  template: `
    <main class="container page">
      <a routerLink="/" class="back-link">← Volver a la cartelera</a>

      @if (detail(); as d) {
        <div class="movie-hero">
          <div class="poster">
            <app-poster [id]="d.movie.id" [title]="d.movie.title" [genre]="d.movie.genre" [year]="d.movie.releaseYear" [hue]="d.movie.posterHue" />
            <span class="poster-age">{{ d.movie.ratingAge }}</span>
            @if (d.movie.avgRating > 0) {
              <span class="poster-rating">★ {{ d.movie.avgRating }}</span>
            }
          </div>
          <div>
            <div class="meta" style="margin-bottom:4px">
              <span class="chip chip-accent">{{ d.movie.genre }}</span>
              <span class="chip">{{ d.movie.releaseYear }}</span>
              @if (d.movie.status === 'now_showing') {
                <span class="chip chip-now">En cartelera</span>
              } @else {
                <span class="chip chip-soon">Próximo estreno</span>
              }
            </div>
            <h1>{{ d.movie.title }}</h1>
            <p class="movie-tagline">«{{ d.movie.tagline }}»</p>
            <p class="movie-synopsis">{{ d.movie.synopsis }}</p>
            <div class="movie-facts">
              <div class="fact"><div class="k">Duración</div><div class="v">{{ d.movie.durationMin }} min</div></div>
              <div class="fact"><div class="k">Dirección</div><div class="v">{{ d.movie.director }}</div></div>
              <div class="fact"><div class="k">Público</div><div class="v">+{{ d.movie.ratingAge }}</div></div>
              <div class="fact">
                <div class="k">Valoración</div>
                <div class="v" style="display:flex;align-items:center;gap:8px">
                  <app-stars [rating]="d.movie.avgRating" />
                  @if (d.movie.reviewCount > 0) {
                    <span class="muted" style="font-size:0.8rem">{{ d.movie.avgRating }} ({{ d.movie.reviewCount }})</span>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        @if (d.showtimes.length > 0) {
          <div style="margin-top:32px">
            <h2 class="section-title">Funciones</h2>
            <p class="section-sub">Selecciona una sesión para elegir butaca.</p>
            <div class="day-tabs">
              @for (day of days(); track day.key) {
                <button class="day-tab" [class.active]="day.key === activeDay()" (click)="activeDay.set(day.key)">
                  <span class="dow">{{ day.dow }}</span>{{ day.label }}
                </button>
              }
            </div>
            <div class="showtime-list">
              @for (st of visibleShowtimes(); track st.id) {
                <a [routerLink]="['/showtime', st.id]" class="showtime-row">
                  <span class="showtime-time">{{ fmtTime(st.startTime) }}</span>
                  <span class="showtime-info">
                    <span class="chip chip-accent">{{ st.format }}</span>
                    <span class="chip">{{ st.language }}</span>
                    <span class="chip">{{ st.screenName }}</span>
                  </span>
                  <span class="showtime-price">{{ st.basePrice.toFixed(2).replace('.', ',') }} €</span>
                  <span class="showtime-occ" [class.occ-full]="st.occupancyPct >= 85">
                    <span class="occ-bar"><i [style.width.%]="st.occupancyPct"></i></span>
                    {{ st.soldTickets }}/{{ st.totalSeats }}
                  </span>
                </a>
              } @empty {
                <div class="empty">No hay funciones para este día.</div>
              }
            </div>
          </div>

          <!-- Gráfico real: ocupación por función (ejes + fechas + tooltip) -->
          <div class="chart-box" style="position:relative">
            <h3>Ocupación por función</h3>
            <p class="muted" style="font-size:0.82rem;margin-bottom:12px">Butacas vendidas sobre el total de cada sala · pasa el cursor sobre las barras</p>
            <svg class="chart-svg" viewBox="0 0 720 240" xmlns="http://www.w3.org/2000/svg" (mousemove)="chartMove($event)" (mouseleave)="chartTip.set(null)">
              <!-- grid -->
              @for (gy of gridYs(); track gy) {
                <line x1="46" [attr.y1]="gy" x2="690" [attr.y2]="gy" stroke="#262a38" stroke-width="1" />
                <text x="38" [attr.y]="gy + 12" text-anchor="end" font-size="11" fill="#6f7385">{{ gridLabel(gy) }}</text>
              }
              <!-- barras -->
              @for (st of d.showtimes; track st.id; let i = $index) {
                <g>
                  <rect
                    [attr.x]="barX(i)" y="204" [attr.width]="barW()" [attr.height]="0" fill="rgba(245,179,1,0.2)"
                    rx="4" [attr.data-idx]="i"
                  />
                  <rect
                    [attr.x]="barX(i)" [attr.y]="barY(st)" [attr.width]="barW()" [attr.height]="barH(st)" fill="#f5b301" rx="4"
                    [attr.data-idx]="i"
                  />
                  <!-- etiqueta de valor sobre la barra -->
                  <text [attr.x]="barX(i) + barW() / 2" [attr.y]="barY(st) - 6" text-anchor="middle" font-size="10.5" font-weight="600" fill="#a2a5b4">{{ st.occupancyPct }}%</text>
                </g>
              }
              <!-- eje X: fecha + hora -->
              @for (st of d.showtimes; track st.id; let i = $index) {
                <g>
                  <text [attr.x]="barX(i) + barW() / 2" y="222" text-anchor="middle" font-size="10" fill="#6f7385">{{ fmtDateShort(st.startTime) }}</text>
                  <text [attr.x]="barX(i) + barW() / 2" y="236" text-anchor="middle" font-size="10" fill="#6f7385">{{ fmtTime(st.startTime) }}</text>
                </g>
              }
              <text x="46" y="26" font-size="11" fill="#6f7385">% ocupación</text>
            </svg>
            @if (chartTip(); as tip) {
              <div class="chart-tip" [style.left.px]="tip.x" [style.top.px]="tip.y">
                <strong>{{ tip.st.startTime | date: 'EEE d MMM, HH:mm' : '' : 'es' }}</strong><br />
                {{ tip.st.screenName }} · {{ tip.st.soldTickets }}/{{ tip.st.totalSeats }} butacas ({{ tip.st.occupancyPct }}%)
              </div>
            }
          </div>
        }

        <!-- Reseñas -->
        <section class="reviews">
          <div class="section-head">
            <div>
              <h2 class="section-title">Reseñas</h2>
              <p class="section-sub">{{ d.reviews.length }} opiniones de la comunidad</p>
            </div>
          </div>

          @if (auth.user(); as u) {
            <div class="review-form">
              <h4>Tu valoración</h4>
              <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
                <div class="stars">
                  @for (i of [].constructor(5); track $index) {
                    <button type="button" class="star-btn" [class.on]="$index < rating()" (click)="rating.set($index + 1)" [attr.aria-label]="($index + 1) + ' estrellas'">★</button>
                  }
                </div>
                <span class="muted" style="font-size:0.85rem">{{ rating() || 'Pulsa una estrella' }}</span>
              </div>
              <div class="field" style="margin-top:14px">
                <textarea class="input" [(ngModel)]="comment" placeholder="Cuéntale a los demás qué te pareció…" maxlength="600"></textarea>
              </div>
              <button class="btn btn-primary" [disabled]="sendingReview() || rating() === 0" (click)="sendReview()">
                @if (sendingReview()) { <span class="spin"></span> Enviando… } @else { Publicar reseña }
              </button>
            </div>
          }

          @for (r of d.reviews; track r.id) {
            <div class="review-item">
              <div class="review-head">
                <span class="review-author">{{ r.username }}</span>
                <app-stars [rating]="r.rating" />
                <span class="review-date">{{ r.createdAt | date: 'd MMM yyyy' : '' : 'es' }}</span>
              </div>
              <p class="review-comment">{{ r.comment }}</p>
            </div>
          } @empty {
            <div class="empty">Todavía no hay reseñas. ¡Sé la primera persona en opinar!</div>
          }
        </section>
      } @else if (loading()) {
        <div class="skeleton" style="height:320px;border-radius:16px"></div>
      } @else {
        <div class="empty">
          <div class="big">🎬</div>
          <p><strong>Película no encontrada</strong></p>
          <p style="margin-top:8px"><a routerLink="/" class="btn btn-outline btn-sm">Volver a la cartelera</a></p>
        </div>
      }
    </main>
  `,
})
export class MovieDetailPageComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  public readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly detail = signal<MovieDetail | null>(null);
  readonly activeDay = signal('');
  readonly rating = signal(0);
  readonly comment = signal('');
  readonly sendingReview = signal(false);

  readonly chartTip = signal<{ x: number; y: number; st: ShowtimeSummary } | null>(null);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    void this.load(id);
  }

  async load(id: number) {
    try {
      const d = await firstValueFrom(this.http.get<MovieDetail>(`/api/movies/${id}`));
      this.detail.set(d);
      const days = [...new Set(d.showtimes.map((s) => s.startTime.slice(0, 10)))].slice(0, 3);
      this.activeDay.set(days[0] ?? '');
    } finally {
      this.loading.set(false);
    }
  }

  readonly days = computed(() => {
    const d = this.detail();
    if (!d) return [];
    const map = new Map<string, { key: string; label: string; dow: string }>();
    for (const st of d.showtimes) {
      const key = st.startTime.slice(0, 10);
      if (!map.has(key)) {
        const dt = new Date(st.startTime);
        map.set(key, {
          key,
          label: dt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
          dow: dt.toLocaleDateString('es-ES', { weekday: 'short' }),
        });
      }
    }
    return [...map.values()];
  });

  readonly visibleShowtimes = computed(() => {
    const d = this.detail();
    if (!d) return [];
    return d.showtimes.filter((s) => s.startTime.slice(0, 10) === this.activeDay());
  });

  async sendReview() {
    const d = this.detail();
    if (!d || this.rating() === 0 || this.sendingReview()) return;
    this.sendingReview.set(true);
    try {
      await firstValueFrom(
        this.http.post(`/api/reviews/movies/${d.movie.id}`, { rating: this.rating(), comment: this.comment() }),
      );
      this.toast.success('¡Reseña publicada!');
      this.rating.set(0);
      this.comment.set('');
      await this.load(d.movie.id);
    } catch (err) {
      this.toast.error(apiError(err));
    } finally {
      this.sendingReview.set(false);
    }
  }

  // ---- gráfico ----
  readonly chartH = 204;
  readonly chartMax = 100;
  barX(i: number): number {
    const d = this.detail();
    const n = d?.showtimes.length ?? 1;
    const slot = 640 / Math.max(n, 1);
    return 46 + slot * i + slot * 0.18;
  }
  barW(): number {
    const d = this.detail();
    const n = d?.showtimes.length ?? 1;
    return Math.max(10, Math.min(34, (640 / Math.max(n, 1)) * 0.64));
  }
  barY(st: ShowtimeSummary): number {
    return this.chartH - this.barH(st);
  }
  barH(st: ShowtimeSummary): number {
    return Math.max(2, (st.occupancyPct / this.chartMax) * (this.chartH - 8));
  }
  readonly gridYs = computed(() => [0, 51, 102, 153, 204]);
  gridLabel(y: number): string {
    return `${Math.round(100 - (y / this.chartH) * 100)}%`;
  }
  chartMove(ev: MouseEvent) {
    const d = this.detail();
    if (!d) return;
    const svg = ev.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const slot = 640 / Math.max(d.showtimes.length, 1);
    const idx = Math.floor((x - 46) / slot);
    if (idx >= 0 && idx < d.showtimes.length) {
      const st = d.showtimes[idx];
      this.chartTip.set({ x: ev.clientX - rect.left, y: 60, st });
    } else {
      this.chartTip.set(null);
    }
  }

  readonly fmtTime = fmtTime;
  readonly fmtDateShort = fmtDateShort;
  readonly fmtDate = fmtDate;
}
