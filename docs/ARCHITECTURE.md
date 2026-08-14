# CineNova — Arquitectura

**Proyecto diario 2026-08-14** · Cine de barrio online: cartelera → butacas → compra de entradas.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Angular 22 (standalone, zoneless, signals), CSS puro con design system propio |
| Backend | NestJS + TypeORM, JWT (passport-jwt), bcryptjs |
| Base de datos | better-sqlite3 (local) · Neon Postgres (producción, config comentada en `.env.example`) |
| Docs API | @nestjs/swagger en `http://<host>:3063/api/docs` |

## Estructura del monorepo

```
2026-08-14-cinenova/
├── apps/
│   ├── api/                 # NestJS API (puerto 3063, prefijo /api)
│   │   └── src/
│   │       ├── auth/        # register/login/me, JWT strategy + guard
│   │       ├── movies/      # cartelera + detalle + reseñas
│   │       ├── showtimes/   # funciones + mapa de butacas + ocupación
│   │       ├── bookings/    # máquina de estados de la compra (núcleo)
│   │       ├── reviews/     # reseñas (1 por usuario y película)
│   │       ├── users/       # perfil + fidelidad (Nova Club)
│   │       ├── seed/        # seed de datos demo (SEED_DB=true)
│   │       ├── entities/    # 7 entidades TypeORM
│   │       └── common/      # DTOs + tipos compartidos
│   └── web/                 # Angular 22 (dist/web/browser)
│       └── src/app/
│           ├── pages/       # home, movie-detail, showtime, ticket, tickets, profile, login, register
│           ├── layouts/     # auth-layout (panel lateral de marca)
│           ├── shared/      # poster-art (SVG), stars, qr-code, status-badge, empty-state
│           ├── services/    # auth, toast
│           └── guards/      # authGuard (canActivate)
├── scripts/
│   ├── smoke-test.py        # 35 checks E2E de API (login→compra→estados→puntos)
│   └── serve-proxy.cjs      # sirve dist + proxya /api (verificación local)
└── docs/
    ├── ARCHITECTURE.md
    ├── API.md
    └── FRONTEND.md
```

## Núcleo de valor: la máquina de estados de la compra

El diferenciador de CineNova frente a un CRUD con gráficas es la **transacción con estados**:

```
pending ──confirm──▶ confirmed ──use──▶ used
   │                    │
   └──cancel──▶ cancelled   └──cancel──▶ cancelled
```

- **Bloqueo de butacas**: al crear la reserva se validan las butacas contra TODAS las reservas activas (pending/confirmed/used) de esa función mediante un `Set` de seatIds. Duplicado → 409.
- **Expiración**: las reservas pending expiran a los 10 minutos (`expireStale()` en showtimes.service, ejecutado en cada consulta de mapa/lista). Al expirar pasan a `cancelled` y las butacas vuelven a estar libres.
- **Mutex por booking**: `mutex.run()` serializa transiciones sobre la misma reserva (evita doble confirmación).
- **Código de entrada**: se genera en el confirm (`CNV-XXXXXXXX`, alfabeto sin ambiguos), único en BD.
- **Puntos de fidelidad (Nova Club)**: +10 puntos por butaca confirmada; se revierten al cancelar una confirmada. Niveles: bronce (0), plata (100), oro (250). El total de la lista de reservas y el detalle se calculan siempre con los mismos datos (regla Cristian: totales consistentes).

## Decisiones clave

- **Regla de oro**: proyecto 100% nuevo — verificado contra repositorios/, kimi3/, landings, subdominios desplegados y slugs del portafolio (`cinenova` libre).
- **B2C**: el usuario principal es el cliente (cartelera → butacas → entrada). Sin panel de administración.
- **Login panel lateral de marca** (distinto a ridepals=centered card, scanforge=split, gridgauge=centered).
- **Credenciales demo visibles** bajo el formulario, inputs vacíos con autocomplete off/new-password.
- **Gráfico real**: ocupación por función con ejes (%), fechas/horas y tooltip al pasar el cursor (SVG + señal `chartTip`).
- **Pósters generados en SVG** (hue por película): sin imágenes externas → nunca 404, offline-safe.
- **better-sqlite3 13.x** para Node 26 (prebuilds).
- **Build de TS con `--incremental false`**: el tsbuildinfo stale hace que `tsc` emita un dist incompleto (documentado; ver skill impeccable).

## Bugs resueltos durante el build (lecciones)

1. **NG0908 al bootstrap** (Angular 22): `provideZoneChangeDetection` crea un ciclo en la fábrica de NgZone → usar `provideZonelessChangeDetection()`.
2. **NG0908 interceptor**: inyectar `AuthService` en el interceptor crea ciclo (AuthService → HttpClient → interceptor → AuthService). El interceptor lee el token de localStorage directamente.
3. **`@Column` nullable string → better-sqlite3** requiere `type: 'varchar'` explícito (`Booking.code`).
4. **whitelist del ValidationPipe** elimina campos sin decoradores class-validator → todos los DTOs llevan `@IsString()`, `@IsInt()` etc.
5. **Ids globales de butaca**: el resolver de etiquetas asumía ids por sala; ahora lee la entidad Seat (los ids son globales entre salas).
6. **Relaciones no cargadas tras save()**: re-fetch con `findOne(relations)` en vez de usar la instancia guardada.
