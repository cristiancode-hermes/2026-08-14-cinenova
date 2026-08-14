import { Component, computed, input } from '@angular/core';

/**
 * Arte de póster generado (SVG): degradado por hue de género + tipografía.
 * Sin imágenes externas → siempre carga, offline-safe.
 */
@Component({
  selector: 'app-poster',
  standalone: true,
  template: `
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" role="img" [attr.aria-label]="'Póster de ' + title()">
      <defs>
        <linearGradient id="pg-{{ id() }}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" [attr.stop-color]="hueLight()" />
          <stop offset="55%" [attr.stop-color]="hue()" />
          <stop offset="100%" [attr.stop-color]="hueDark()" />
        </linearGradient>
        <radialGradient id="pg-glow-{{ id() }}" cx="0.5" cy="0.25" r="0.9">
          <stop offset="0%" stop-color="rgba(255,255,255,0.28)" />
          <stop offset="60%" stop-color="rgba(255,255,255,0)" />
        </radialGradient>
        <pattern id="pg-noise-{{ id() }}" width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.7" fill="rgba(255,255,255,0.05)" />
          <circle cx="3" cy="3" r="0.5" fill="rgba(0,0,0,0.12)" />
        </pattern>
      </defs>
      <rect width="200" height="300" [attr.fill]="'url(#pg-' + id() + ')'" />
      <rect width="200" height="300" [attr.fill]="'url(#pg-glow-' + id() + ')'" />
      <rect width="200" height="300" [attr.fill]="'url(#pg-noise-' + id() + ')'" />

      <!-- anillo central -->
      <circle cx="100" cy="118" r="52" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="1.4" />
      <circle cx="100" cy="118" r="38" fill="rgba(8,9,12,0.55)" />

      <!-- tipografía -->
      <text x="100" y="86" text-anchor="middle" font-family="Sora, sans-serif" font-weight="800" font-size="15" letter-spacing="2" fill="rgba(255,255,255,0.92)">{{ titleLines()[0] }}</text>
      @if (titleLines()[1]) {
        <text x="100" y="104" text-anchor="middle" font-family="Sora, sans-serif" font-weight="800" font-size="15" letter-spacing="2" fill="rgba(255,255,255,0.92)">{{ titleLines()[1] }}</text>
      }

      <!-- año -->
      <text x="100" y="122" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="600" font-size="11" letter-spacing="3" fill="rgba(255,255,255,0.85)">{{ year() }}</text>

      <!-- marca de género -->
      <text x="100" y="158" text-anchor="middle" font-family="Sora, sans-serif" font-weight="600" font-size="8.5" letter-spacing="3" fill="rgba(255,255,255,0.65)" text-transform="uppercase">{{ genre() }}</text>

      <!-- franja inferior -->
      <rect x="0" y="252" width="200" height="48" fill="rgba(8,9,12,0.6)" />
      <rect x="0" y="252" width="200" height="2" fill="rgba(255,255,255,0.25)" />
      <text x="100" y="276" text-anchor="middle" font-family="Sora, sans-serif" font-weight="700" font-size="9" letter-spacing="2" fill="rgba(255,255,255,0.9)">CINE NOVA</text>
      <text x="100" y="290" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="7.5" letter-spacing="1" fill="rgba(255,255,255,0.45)">PRESENTA</text>
    </svg>
  `,
})
export class PosterArtComponent {
  readonly id = input<number>(0);
  readonly title = input('Película');
  readonly genre = input('');
  readonly year = input(2026);
  readonly hue = input('e11d48');

  readonly titleLines = computed(() => {
    const t = this.title();
    if (t.length <= 16) return [t.toUpperCase(), ''];
    const words = t.split(' ');
    let line1 = '';
    let i = 0;
    while (i < words.length && (line1 + ' ' + words[i]).trim().length <= 13) {
      line1 = (line1 + ' ' + words[i]).trim();
      i++;
    }
    return [line1.toUpperCase(), words.slice(i).join(' ').toUpperCase()];
  });

  readonly hueLight = computed(() => this.shade(this.hue(), 1.45));
  readonly hueDark = computed(() => this.shade(this.hue(), 0.55));

  private shade(hex: string, f: number): string {
    const h = hex.replace('#', '');
    const r = Math.min(255, Math.round(parseInt(h.slice(0, 2), 16) * f));
    const g = Math.min(255, Math.round(parseInt(h.slice(2, 4), 16) * f));
    const b = Math.min(255, Math.round(parseInt(h.slice(4, 6), 16) * f));
    return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
  }
}
