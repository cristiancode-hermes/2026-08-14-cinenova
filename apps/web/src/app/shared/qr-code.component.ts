import { Component, computed, input } from '@angular/core';

/**
 * Código QR determinista a partir del código de entrada (CNV-XXXXXX):
 * matriz 21×21 con patrones de localización — visual de ticket, no escaneable.
 */
@Component({
  selector: 'app-qr',
  standalone: true,
  template: `
    <svg viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg" [attr.aria-label]="'Código de entrada ' + code()">
      <rect width="21" height="21" fill="#ffffff" />
      @for (cell of cells(); track cell[0] + '-' + cell[1]) {
        <rect [attr.x]="cell[0]" [attr.y]="cell[1]" width="1" height="1" fill="#0b0c10" />
      }
    </svg>
  `,
})
export class QrCodeComponent {
  readonly code = input('CNV-000000');

  readonly cells = computed(() => {
    const seedStr = this.code() + 'cinenova';
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) {
      seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
    }
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const size = 21;
    const out: Array<[number, number]> = [];

    // Finder patterns (esquinas)
    const finder = (ox: number, oy: number) => {
      for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 7; x++) {
          const border = x === 0 || y === 0 || x === 6 || y === 6;
          const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
          if (border || core) out.push([ox + x, oy + y]);
        }
      }
    };
    finder(0, 0);
    finder(size - 7, 0);
    finder(0, size - 7);

    // Timing patterns
    for (let i = 8; i < size - 8; i++) {
      if (i % 2 === 0) {
        out.push([i, 6]);
        out.push([6, i]);
      }
    }

    // Datos pseudoaleatorios
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (out.some(([cx, cy]) => cx === x && cy === y)) continue;
        if (rand() > 0.48) out.push([x, y]);
      }
    }
    return out;
  });
}
