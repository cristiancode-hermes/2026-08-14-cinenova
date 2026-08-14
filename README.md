# CineNova 🎬

**Tu cine, tu butaca, tu película.** Cartelera → butacas → compra de entradas, con programa de fidelidad.

Proyecto diario del Daily Builder — 2026-08-14. Stack: **Angular 22** + **NestJS** + TypeORM + better-sqlite3.

## Arranque local

```bash
npm install

# API (puerto 3063, seed automático con SEED_DB=true)
cd apps/api
npm run build
PORT=3063 SEED_DB=true DATABASE_PATH=data/cinenova.db JWT_SECRET=dev-secret node dist/main.js

# Web (build + servir)
cd apps/web
npm run build
# servir apps/web/dist/web/browser (o: node ../../scripts/serve-proxy.cjs desde la raíz)
```

## Cuenta demo

| Campo | Valor |
|---|---|
| Usuario | `demo` |
| Email | `demo@cinenova.dev` |
| Contraseña | `demo1234` |

El seed crea 8 películas, 4 salas (incl. IMAX), 18 funciones, 346 butacas, reseñas y reservas en distintos estados (pendiente a punto de expirar, confirmada con código, usada, cancelada).

## Smoke test

```bash
python3 scripts/smoke-test.py   # 35 checks: auth, cartelera, butacas, compra, estados, puntos, reseñas
```

## Docs

- `docs/ARCHITECTURE.md` — stack, estructura, máquina de estados de la compra, lecciones
- `docs/API.md` — endpoints y códigos de error
- `docs/FRONTEND.md` — rutas, design system, flujo del cliente
