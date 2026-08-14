#!/usr/bin/env python3
"""Smoke test CineNova API — flujo completo de cliente: login → cartelera → butacas → compra → ticket."""
import json, sys, urllib.request, urllib.error

BASE = "http://localhost:3063/api"
TOKEN = None
PASS = 0
FAIL = 0

def req(method, path, body=None, token=None):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header("Content-Type", "application/json")
    if token:
        r.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")

def check(name, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  ✅ {name}")
    else:
        FAIL += 1
        print(f"  ❌ {name} — {detail}")

print("== 1. Auth ==")
s, d = req("POST", "/auth/login", {"identifier": "demo", "password": "demo1234"})
check("login por username (demo)", s == 200 and "token" in d, str(d)[:120])
TOKEN = d.get("token", "")
s, d = req("POST", "/auth/login", {"identifier": "demo@cinenova.dev", "password": "demo1234"})
check("login por email", s == 200 and "token" in d, str(d)[:120])
s, d = req("POST", "/auth/login", {"identifier": "demo", "password": "mala"})
check("login fallido → 401", s == 401)

print("== 2. Cartelera y detalle (rutas dinámicas) ==")
s, movies = req("GET", "/movies?status=now_showing")
check("GET /movies?status=now_showing → 200", s == 200 and len(movies) == 6, f"{s} {len(movies)}")
movie = movies[0]
mid = movie["id"]
s, detail = req("GET", f"/movies/{mid}")
check("GET /movies/:id → detalle con showtimes", s == 200 and len(detail.get("showtimes", [])) > 0 and "reviews" in detail, f"{s}")
check("detalle: avgRating coincide con lista", abs(detail["movie"]["avgRating"] - movie["avgRating"]) < 0.01)
s, bad = req("GET", "/movies/99999")
check("GET /movies/99999 → 404", s == 404)

print("== 3. Butacas ==")
st = detail["showtimes"][0]
stid = st["id"]
s, seats = req("GET", f"/showtimes/{stid}/seats")
check("GET /showtimes/:id/seats → 200", s == 200 and len(seats["seats"]) == seats["screen"]["rows"] * seats["screen"]["cols"], f"{s}")
avail = [x for x in seats["seats"] if x["status"] == "available"]
occupied = [x for x in seats["seats"] if x["status"] == "occupied"]
check("mapa tiene libres y ocupadas", len(avail) > 0 and len(occupied) > 0, f"avail={len(avail)} occ={len(occupied)}")
check("ocupadas = seed consistente (Nébula IMAX: 6)", len(occupied) == 6, f"occupied={len(occupied)}")
premium = [x for x in seats["seats"] if x["isPremium"]]
check("hay butacas premium", len(premium) > 0)

print("== 4. Compra: crear reserva (estados) ==")
pick = avail[0:2]
price_est = 2 * (st["basePrice"] + seats["screen"]["screenSurcharge"])
s, b = req("POST", "/bookings", {"showtimeId": stid, "seatIds": [x["id"] for x in pick]}, TOKEN)
check("POST /bookings → 201/200 pending", s in (200, 201) and b["status"] == "pending", f"{s} {str(b)[:150]}")
bid = b["id"]
check("total creado > 0", b["totalAmount"] > 0, str(b["totalAmount"]))
check("expira en ~10 min", b["expiresAt"] is not None)
check("canConfirm=true, canCancel=true", b["canConfirm"] and b["canCancel"])

print("== 5. Totales consistentes lista ↔ detalle ==")
s, lst = req("GET", "/bookings", token=TOKEN)
mine = [x for x in lst if x["id"] == bid]
check("reserva en lista", len(mine) == 1)
s, det = req("GET", f"/bookings/{bid}", token=TOKEN)
check("GET /bookings/:id → 200", s == 200)
check("total lista == total detalle", mine[0]["totalAmount"] == det["totalAmount"] == b["totalAmount"], f"list={mine[0]['totalAmount']} det={det['totalAmount']} create={b['totalAmount']}")
check("seatCount consistente (2)", det["seatCount"] == 2 and len(det["seatLabels"]) == 2, str(det["seatLabels"]))

print("== 6. Conflicto de butacas (reintento) ==")
s, dup = req("POST", "/bookings", {"showtimeId": stid, "seatIds": [x["id"] for x in pick]}, TOKEN)
check("reservar butacas ocupadas → 409", s == 409, f"{s} {str(dup)[:120]}")

print("== 7. Transiciones de estado ==")
s, conf = req("POST", f"/bookings/{bid}/confirm", {}, TOKEN)
check("confirm → 200 confirmed + código", s == 200 and conf["status"] == "confirmed" and conf["code"] and conf["code"].startswith("CNV-"), f"{s} {str(conf)[:120]}")
check("canConfirm=false tras confirmar", conf["canConfirm"] is False)
s, use = req("POST", f"/bookings/{bid}/use", {}, TOKEN)
check("use → used", s == 200 and use["status"] == "used", f"{s}")
s, bad_use = req("POST", f"/bookings/{bid}/use", {}, TOKEN)
check("usar 2 veces → 409", s == 409)
s, bad_cancel = req("POST", f"/bookings/{bid}/cancel", {}, TOKEN)
check("cancelar usada → 409", s == 409)

print("== 8. Cancelación libera butacas ==")
pick2 = avail[2:4]
s, b2 = req("POST", "/bookings", {"showtimeId": stid, "seatIds": [x["id"] for x in pick2]}, TOKEN)
s, c2 = req("POST", f"/bookings/{b2['id']}/cancel", {}, TOKEN)
check("cancel → cancelled", s == 200 and c2["status"] == "cancelled")
s, seats2 = req("GET", f"/showtimes/{stid}/seats")
st2map = {x["id"]: x["status"] for x in seats2["seats"]}
check("butacas canceladas vuelven a libres", all(st2map[x["id"]] == "available" for x in pick2), str([st2map[x["id"]] for x in pick2]))

print("== 9. Puntos de fidelidad ==")
s, me = req("GET", "/me", token=TOKEN)
check("GET /me → loyalty", s == 200 and "loyalty" in me and me["loyalty"]["tier"] in ("bronce", "plata", "oro"), str(me)[:160])
check("tickets >= 6 (2 seed + 2 confirm + 1 use + 1...)", me["loyalty"]["tickets"] >= 6, str(me["loyalty"]["tickets"]))

print("== 10. Reseñas ==")
s, rev = req("POST", "/reviews/movies/1", {"rating": 4, "comment": "Smoke test"}, TOKEN)
check("crear reseña → 201", s == 201, f"{s} {str(rev)[:120]}")
s, revdup = req("POST", "/reviews/movies/1", {"rating": 2, "comment": "dupe"}, TOKEN)
check("reseña duplicada → 409", s == 409)
s, m1 = req("GET", "/movies/1")
check("avgRating se actualiza", m1["movie"]["reviewCount"] >= 3)

print("== 11. Ocupación función ==")
s, det2 = req("GET", f"/movies/{mid}")
st_row = [x for x in det2["showtimes"] if x["id"] == stid][0]
check("soldTickets>0 en ocupación", st_row["soldTickets"] > 0, str(st_row["soldTickets"]))
check("totalSeats = filas*cols", st_row["totalSeats"] == seats["screen"]["rows"] * seats["screen"]["cols"])
check("occupancyPct coherente", 0 <= st_row["occupancyPct"] <= 100)

print(f"\nRESULTADO: {PASS} ✅ / {FAIL} ❌")
sys.exit(1 if FAIL else 0)
