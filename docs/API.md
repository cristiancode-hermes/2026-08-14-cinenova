# CineNova API

Base: `http://localhost:3063/api` (prefijo `/api` en producción vía Caddy). Swagger en `/api/docs`.

Todas las rutas autenticadas requieren `Authorization: Bearer <token>`.

## Autenticación

| Método | Ruta | Body | Descripción |
|---|---|---|---|
| POST | `/auth/register` | `{ username, email, name, password }` | Registro (login automático) → `{ token, user }` |
| POST | `/auth/login` | `{ identifier, password }` | Login por **usuario O email** → `{ token, user }` |
| GET | `/auth/profile` | — | Perfil del token (auth) → `{ user }` |

## Cartelera y películas

| Método | Ruta | Query | Descripción |
|---|---|---|---|
| GET | `/movies` | `status=now_showing\|coming_soon`, `search=` | Lista con avgRating, reviewCount y nextShowtime |
| GET | `/movies/:id` | — | Detalle + `reviews[]` + `showtimes[]` (próximos 3 días) |

`ShowtimeSummary`: `{ id, startTime, screenName, format, language, basePrice, soldTickets, totalSeats, occupancyPct }` — **ocupación calculada sobre reservas activas** (fuente única de verdad).

## Funciones y butacas

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/showtimes/:id` | Función con película y sala |
| GET | `/showtimes/:id/seats` | Mapa: `{ showtime, screen, seats[] }` con `status: available\|held\|occupied`, `isPremium`, `isWheelchair` |

## Reservas (máquina de estados)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/bookings` | Crear reserva pending (auth). Valida función futura, butacas existentes, mismas sala, sin duplicados, máx 8, **conflicto 409 si ocupadas** |
| GET | `/bookings` | Mis reservas (desc por fecha) |
| GET | `/bookings/:id` | Detalle (solo propietario, 403 si no) |
| POST | `/bookings/:id/confirm` | pending → confirmed: genera `code` (CNV-XXXXXX), libera expiresAt, **+10 pts/butaca** |
| POST | `/bookings/:id/use` | confirmed → used |
| POST | `/bookings/:id/cancel` | pending/confirmed → cancelled (revierte puntos si estaba confirmada) |

`BookingView`: `{ id, status, code, totalAmount, createdAt, expiresAt, seatCount, seatLabels[], seatIds[], movie, startTime, screenName, format, language, canConfirm, canCancel, canUse }`.

- `seatLabels` se resuelven leyendo la entidad Seat (fila letra + número, ej. `E8`).
- `totalAmount` = `Σ (basePrice + screenSurcharge [+ premiumSurcharge si fila ≤ premiumRows])`, mismo cálculo en lista, detalle y creación.
- Expiración: pending >10 min → `cancelled` automático (`expireStale()` en cada lectura).

## Reseñas

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/reviews/movies/:movieId` | `{ rating: 1-5, comment }` — **una por usuario y película (409 si duplicada)** |
| DELETE | `/reviews/:id` | Solo el autor |

## Perfil y fidelidad

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/me` | `{ id, username, email, name, points, loyalty: { points, tier, tickets, nextTier, pointsToNext, progressPct } }` |

Niveles Nova Club: bronce 0 pts · plata 100 · oro 250. `tickets` = reservas confirmadas/used.

## Códigos de error

- `400` validación / función comenzada / butacas repetidas
- `401` sin token o credenciales inválidas
- `403` recurso de otro usuario
- `404` película, función, butaca o reserva inexistente
- `409` butaca ocupada, transición no permitida, reserva expirada, reseña duplicada
