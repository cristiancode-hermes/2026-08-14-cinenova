# QA Report — 2026-08-14 CineNova

**Project:** CineNova — cine B2C (cartelera, butacas, entradas con QR). "La butaca es el producto."
**Stack:** Angular 22 (signals, zoneless) + NestJS 11 + TypeORM 1.x + better-sqlite3 + Tailwind v4
**Author:** Hermes Daily Builder + QA (qa-tester-deployer)

## ✅ 1. Build Verification

| Target | Status | Details |
|--------|--------|---------|
| API `tsc -p tsconfig.json --incremental false` | ✅ PASS | exit 0, `dist/main.js` emitido |
| Web `npm run build` (Tailwind v4 + ng build) | ✅ PASS | exit 0, `dist/web/browser/` |
| 0 TypeORM 1.x anti-patterns | ✅ PASS | sin `type:'timestamp'`, `null as any`, `delete({})`, `$not`, `setLock` |
| Interceptor Bearer token | ✅ PASS | bytes verificados (`'***' in src` = False) |
| Zoneless (sin zone.js) | ✅ PASS | `provideZonelessChangeDetection` — patrón correcto NG0908-safe |

## ✅ 2. Test Results

**47 test cases · 5 suites — ALL PASSED** (jest, 5 suites nuevas: auth 8, bookings 17, showtimes 8, movies 8, reviews 6)

| Test Suite | Test Case | Assertions |
|------------|-----------|------------|
| auth.service.spec | register hash+token, dup email/username 409, login by username/email, wrong pass 401, me sanitized, toAuth payload | 8 |
| bookings.service.spec | validaciones (vacío, >8, duplicados, función pasada), 404/409, precio premium, expiración, transiciones estado, 403/404, puntos +10/reversión, TRANSITIONS, códigos CNV | 17 |
| showtimes.service.spec | filtros (pasadas, movieId), seatPrice, seat map estados, 404, expireStale, view | 8 |
| movies.service.spec | avgRating 1 decimal, nextShowtime, búsqueda q, status, detalle con ocupación, canceladas excluidas, 404, userReview | 8 |
| reviews.service.spec | crear/trim, rating fuera de rango, duplicado 409, 404, borrar propia/ajena 403 | 6 |

## ✅ 3. Endpoint Verification (46/46 checks, script contra API real)

| Área | Checks | Resultado |
|------|--------|-----------|
| Auth | register 201, login por username Y email, 401 wrong pass, profile con/sin token, seed demo/maria | ✅ 8/8 |
| Movies | lista ≥6, now/coming split, avgRating, detalle `{movie,reviews,showtimes}`, **avgRating lista == detalle (regla #2)**, 404 | ✅ 7/7 |
| Showtimes+seats | lista, filtro movieId, detalle, seat map (dims sala == filas×cols, premium flags), estados | ✅ 7/7 |
| Bookings (capa de valor) | precio == suma butacas, **total lista == total detalle (regla #2)**, 409 concurrencia, confirm → código CNV-, doble confirm 409, puntos +10, cancel libera butacas, 9/0/inexistentes rechazadas | ✅ 18/18 |
| Reviews | crear, duplicado 409, rating>5 400, 403 ajena, borrar propia | ✅ 5/5 |
| Regla #1 (rutas dinámicas) | /movie/1, /showtime/1 (mapa+compra), /ticket/10 (QR+countdown+confirmar), /tickets, /profile — navegadas con usuario demo, sin pantallas en blanco ni "Error inesperado" | ✅ |
| Regla #3 (gráficos) | Gráfico "Ocupación por función": SVG con eje Y 0-100%, gridlines, etiquetas %, eje X fechas (14/8, 15/8, 16/8) + horas, **tooltip con fecha/sala/butacas/%** | ✅ |

## ✅ 4. Quality Audit

| Criterio | Veredicto | Notas |
|----------|-----------|-------|
| Capa de valor (regla #5) | ✅ PASS | Transacción de reserva con estados pending→confirmed→used/cancelled, retención 10 min, mutex + 409 concurrencia, QR, puntos fidelidad |
| Contraste AA (regla #4) | ✅ PASS | Texto claro sobre superficie oscura; botón primario ámbar sobre oscuro; verificado visualmente |
| Diseño final (isFinalDesign) | DESIGN_FREE | sin bloqueo visual; no se aplicó redesign |

### Incidencias
| Issue | Severidad | Estado |
|-------|-----------|--------|
| **NG02100 en /movie/:id**: DatePipe con locale `'es'` sin `registerLocaleData` → tooltip del gráfico vacío y fechas de reseñas rotas (2 errores console) | **CRÍTICA** | ✅ CORREGIDA: `registerLocaleData(localeEs)` en `app.config.ts`; rebuild + redeploy + verificado (tooltip "vie 14 ago, 16:30 · Sala IMAX · 9/126 (7%)", 0 errores console) |
| Módulos `rides/vehicles/messages/favorites/dashboard` vacíos en src (restos de plantilla) | Menor | Sin impacto — carpetas vacías no compiladas; no se commitearon |
| Spec original pedía panel admin + combos dulcería | Media (scope) | No construido por el builder; la capa de valor (transacción butacas) sí está completa; gráfico de ocupación movido a la ficha pública de película. Se reporta como desviación de alcance, no como defecto funcional |

## ✅ 5. Security Scan

| Check | Resultado |
|-------|-----------|
| Secretos hardcodeados en diff | ✅ ninguno (JWT_SECRET con fallback dev, sin claves en repo) |
| `***` malformed template literal | ✅ 0 matches en todo el repo (verificado por bytes) |
| SQL injection (raw queries) | ✅ sin raw SQL; TypeORM query builder + repos |
| Passwords | ✅ bcryptjs hash(10); `@Exclude` en passwordHash |

## ✅ 6. Deployment

| Target | Resultado | Detalles |
|--------|-----------|----------|
| Puerto 3063 | ✅ | Libre de Caddyfile; registrado en manage-apis.sh (49/49 APIs activas) |
| Caddy | ✅ | `cinenova.proyectos.cristiancode.dev` → dist/web/browser + `/api*` → 3063; HTTP 200 |
| Landing (proyectos-cristiancode-dev) | ✅ | entrada `cinenova` en categoría productividad; JS OK; live grep = 1; push |
| Excel | ✅ | Row 79 en proyectos_completo.xlsx (Full Stack) |
| GitHub | ✅ | repo `cristiancode-hermes/2026-08-14-cinenova` + README; push ok |
| Portafolio (3 locales) | ✅ | es/en/pt con id 180 único; detail pages 200; **live md5 == dist md5**; /hermes lista ✓ |
| Capturas | ✅ | cinenova.png (431KB) + cinenova-m.png (55KB), captura logueada (★210) |
| Enlaces | ✅ | href 200, link2 (README) 200, link3 (repo) 200, raw README 200 |

## Summary

**OVERALL: PASS ✅** — 47/47 tests, 46/46 endpoint checks, 1 incidencia crítica (NG02100) encontrada y corregida en el mismo QA, despliegue completo verificado en vivo.
