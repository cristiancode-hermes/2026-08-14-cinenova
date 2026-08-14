# CineNova Frontend

Angular 22 standalone + zoneless (`provideZonelessChangeDetection`) + signals. CSS puro con design system (sin Tailwind): `src/styles.source.css` → `styles.css` vía `scripts/build-css.cjs`.

## Rutas

| Ruta | Página | Guard |
|---|---|---|
| `/` | Cartelera (hero + en cartelera + próximos) | — |
| `/movie/:id` | Detalle: sinopsis, funciones por día, gráfico de ocupación, reseñas | — |
| `/showtime/:id` | Mapa de butacas + panel de compra | auth |
| `/ticket/:id` | Ticket con QR + acciones de estado | auth |
| `/tickets` | Mis entradas | auth |
| `/profile` | Perfil + tarjeta Nova Club | auth |
| `/auth/login`, `/auth/register` | Auth (panel lateral de marca) | guest |

## Design system (dark cinema)

- **Canvas**: `#0b0c10` casi negro · superficies `#15161d`/`#1b1d26` · bordes `#262a38`
- **Acento**: ámbar marquesina `#f5b301` (texto sobre dark ≈ 11:1; botones con ink `#181000`)
- **Tipografía**: Sora (display) + Inter (body) + JetBrains Mono (códigos/precios)
- **Estrategia**: Committed — un acento saturado 30-60%
- **Pósters**: SVG generado por película (degradado por `posterHue` + tipografía), sin assets externos
- **Motion**: transiciones cortas ease-out; `prefers-reduced-motion` global
- **Contraste**: verificado AA en body (≥4.5:1) y botones (3:1 UI); botones nunca pastel (regla Cristian)

## Componentes clave

- `poster-art.component.ts` — SVG de póster parametrizado (id, título, género, año, hue)
- `qr-code.component.ts` — QR determinista 21×21 a partir del código CNV (visual de ticket)
- `status-badge.component.ts` — pending/confirmed/used/cancelled con colores AA
- `star-btn`/`star-static` — selector de valoración y visualización

## Flujo del cliente

1. Cartelera → 2. Detalle (elige día y función) → 3. Mapa (selecciona ≤8 butacas; panel lateral muestra precio desglosado: estándar/premium + total) → 4. Reservar → `/ticket/:id` pending con countdown de 10 min → 5. Confirmar pago (+10 pts/butaca) → ticket con QR y código → 6. Usar entrada en sala.

El guard redirige a `/auth/login?next=/showtime/...`; tras login se vuelve a la ruta original.

## Notas de implementación

- **Interceptor sin DI**: lee el token de `localStorage('cn_token')` directamente (inyectar AuthService crea ciclo NG0908).
- **Zoneless**: todo estado en signals; eventos DOM y respuestas HTTP actualizan signals → CD automática.
- **Gráfico de ocupación**: SVG con ejes (%), grid, fechas/horas en X, % sobre cada barra y tooltip vía `chartTip` signal (mouse events).
- **DatePipe** importado explícitamente en componentes standalone que usan `| date`.
- **Enrutado con `withComponentInputBinding`** — no usado por páginas (usan snapshot), preparado para futuro.
