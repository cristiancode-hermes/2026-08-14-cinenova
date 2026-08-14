import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RouterLink } from '@angular/router';
import type { Movie } from '../../interfaces/models';
import { PosterArtComponent } from '../../shared/poster-art.component';
import { StarsComponent } from '../../shared/stars.component';
import { fmtDateShort, fmtTime } from '../../utils/errors';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink, PosterArtComponent, StarsComponent],
  template: `
    <section class="hero">
      <div class="container hero-inner">
        <div>
          <p class="hero-kicker">El cine de tu barrio · Estreno de la semana</p>
          @if (featured(); as f) {
            <h1>Esta noche, <em>{{ f.title }}</em>.</h1>
            <p>{{ f.tagline }}</p>
            <div class="hero-actions">
              <a [routerLink]="['/movie', f.id]" class="btn btn-primary">Ver funciones</a>
              <a routerLink="/" class="btn btn-outline">Toda la cartelera</a>
            </div>
          } @else {
            <h1>Luces, cámara, <em>butacas</em>.</h1>
            <p>Compra tus entradas online y llega directo a tu asiento.</p>
            <div class="hero-actions">
              <a routerLink="/" class="btn btn-primary">Ver cartelera</a>
            </div>
          }
        </div>
        @if (featured(); as f) {
          <div class="hero-poster">
            <div class="poster poster-hover">
              <app-poster [id]="f.id" [title]="f.title" [genre]="f.genre" [year]="f.releaseYear" [hue]="f.posterHue" />
              <span class="poster-age">{{ f.ratingAge }}</span>
              <span class="poster-rating">★ {{ f.avgRating }}</span>
            </div>
          </div>
        }
      </div>
    </section>

    <main class="container page">
      <div class="section-head">
        <div>
          <h2 class="section-title">En cartelera</h2>
          <p class="section-sub">Elige película y función, y reserva tu butaca.</p>
        </div>
      </div>

      @if (loading()) {
        <div class="movie-grid">
          @for (i of [].constructor(6); track $index) {
            <div>
              <div class="poster poster-skel skeleton"></div>
              <div style="height:16px;margin-top:10px;width:70%" class="skeleton"></div>
            </div>
          }
        </div>
      } @else {
        <div class="movie-grid">
          @for (m of nowShowing(); track m.id) {
            <article class="movie-card">
              <a [routerLink]="['/movie', m.id]" class="poster poster-hover">
                <app-poster [id]="m.id" [title]="m.title" [genre]="m.genre" [year]="m.releaseYear" [hue]="m.posterHue" />
                <span class="poster-age">{{ m.ratingAge }}</span>
                @if (m.avgRating > 0) {
                  <span class="poster-rating">★ {{ m.avgRating }}</span>
                }
              </a>
              <h3><a [routerLink]="['/movie', m.id]">{{ m.title }}</a></h3>
              <div class="meta">
                <span class="chip chip-accent">{{ m.genre }}</span>
                @if (m.nextShowtime) {
                  <span class="chip">hoy {{ fmtTime(m.nextShowtime) }}</span>
                }
              </div>
            </article>
          }
        </div>
      }

      @if (comingSoon().length > 0) {
        <div class="section-head" style="margin-top:44px">
          <div>
            <h2 class="section-title">Próximos estrenos</h2>
            <p class="section-sub">Lo que está por venir a las salas.</p>
          </div>
        </div>
        <div class="movie-grid">
          @for (m of comingSoon(); track m.id) {
            <article class="movie-card">
              <a [routerLink]="['/movie', m.id]" class="poster poster-hover">
                <app-poster [id]="m.id" [title]="m.title" [genre]="m.genre" [year]="m.releaseYear" [hue]="m.posterHue" />
                <span class="poster-age">{{ m.ratingAge }}</span>
              </a>
              <h3><a [routerLink]="['/movie', m.id]">{{ m.title }}</a></h3>
              <div class="meta"><span class="chip chip-soon">Muy pronto</span></div>
            </article>
          }
        </div>
      }
    </main>
  `,
})
export class HomePageComponent {
  private readonly http = inject(HttpClient);
  readonly loading = signal(true);
  readonly movies = signal<Movie[]>([]);

  readonly featured = signal<Movie | null>(null);
  readonly nowShowing = signal<Movie[]>([]);
  readonly comingSoon = signal<Movie[]>([]);

  constructor() {
    void this.load();
  }

  async load() {
    try {
      const movies = await firstValueFrom(this.http.get<Movie[]>('/api/movies'));
      this.movies.set(movies);
      this.featured.set(movies.find((m) => m.featured && m.status === 'now_showing') ?? null);
      this.nowShowing.set(movies.filter((m) => m.status === 'now_showing'));
      this.comingSoon.set(movies.filter((m) => m.status === 'coming_soon'));
    } finally {
      this.loading.set(false);
    }
  }

  readonly fmtTime = fmtTime;
  readonly fmtDateShort = fmtDateShort;
}
