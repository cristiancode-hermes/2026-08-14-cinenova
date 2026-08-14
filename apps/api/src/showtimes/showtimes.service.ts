import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Booking, Seat, Showtime } from '../entities/entities';
import type { BookingStatus } from '../entities/entities';

export const HOLD_MINUTES = 10;
const ACTIVE_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'used'];

@Injectable()
export class ShowtimesService {
  constructor(
    @InjectRepository(Showtime) private readonly showtimesRepo: Repository<Showtime>,
    @InjectRepository(Seat) private readonly seatsRepo: Repository<Seat>,
    @InjectRepository(Booking) private readonly bookingsRepo: Repository<Booking>,
  ) {}

  async findAll(opts: { movieId?: number; date?: string } = {}) {
    const where: Record<string, unknown> = { status: 'active' };
    if (opts.movieId) where.movieId = opts.movieId;
    const showtimes = await this.showtimesRepo.find({ where, relations: { screen: true } });
    const now = new Date();
    let list = showtimes
      .filter((s) => new Date(s.startTime) >= now)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    if (opts.date) {
      const day = opts.date.slice(0, 10);
      list = list.filter((s) => s.startTime.toISOString().slice(0, 10) === day);
    }
    return list.map((s) => this.view(s));
  }

  async findOne(id: number) {
    const st = await this.showtimesRepo.findOne({ where: { id }, relations: { screen: true } });
    if (!st) throw new NotFoundException('Función no encontrada');
    return st;
  }

  /** Expira reservas pendientes vencidas (limpieza lazy, misma fuente de verdad) */
  async expireStale(): Promise<number> {
    const now = new Date();
    const pendings = await this.bookingsRepo.find({ where: { status: 'pending' } });
    let expired = 0;
    for (const b of pendings) {
      if (b.expiresAt && new Date(b.expiresAt) < now) {
        b.status = 'cancelled';
        await this.bookingsRepo.save(b);
        expired += 1;
      }
    }
    return expired;
  }

  /**
   * Mapa de butacas con estado real:
   * - occupied: booking confirmada/usada
   * - held:     booking pendiente sin expirar
   * - available: resto
   */
  async getSeatMap(showtimeId: number) {
    await this.expireStale();
    const st = await this.findOne(showtimeId);
    const screen = st.screen;

    const seats = await this.seatsRepo.find({ where: { screenId: screen.id }, order: { row: 'ASC', number: 'ASC' } });
    const bookings = await this.bookingsRepo.find({
      where: { showtimeId, status: In(ACTIVE_STATUSES) },
    });

    const heldUntil = new Map<number, string>();
    const busy = new Set<number>();
    for (const b of bookings) {
      for (const seatId of b.seatIds ?? []) {
        busy.add(seatId);
        if (b.status === 'pending' && b.expiresAt) {
          heldUntil.set(seatId, new Date(b.expiresAt).toISOString());
        }
      }
    }

    const premiumRows = new Set<number>();
    for (let r = 1; r <= screen.premiumRows; r++) premiumRows.add(r);

    return {
      showtime: this.view(st),
      screen: {
        id: screen.id,
        name: screen.name,
        rows: screen.rows,
        cols: screen.cols,
        premiumRows: screen.premiumRows,
        premiumSurcharge: screen.premiumSurcharge,
        screenSurcharge: screen.screenSurcharge,
      },
      seats: seats.map((seat) => ({
        id: seat.id,
        row: seat.row,
        number: seat.number,
        isPremium: premiumRows.has(seat.row),
        isWheelchair: seat.isWheelchair,
        status: busy.has(seat.id)
          ? (heldUntil.has(seat.id) ? 'held' : 'occupied')
          : 'available',
        heldUntil: heldUntil.get(seat.id) ?? null,
      })),
    };
  }

  /** Precio de una butaca concreta para una función */
  seatPrice(st: Showtime, isPremium: boolean): number {
    const price = st.basePrice + st.screen.screenSurcharge;
    return isPremium ? price + st.screen.premiumSurcharge : price;
  }

  view(st: Showtime) {
    return {
      id: st.id,
      movieId: st.movieId,
      startTime: st.startTime.toISOString(),
      basePrice: st.basePrice,
      language: st.language,
      format: st.format,
      status: st.status,
      movie: st.movie
        ? {
            id: st.movie.id,
            title: st.movie.title,
            genre: st.movie.genre,
            durationMin: st.movie.durationMin,
            ratingAge: st.movie.ratingAge,
            posterHue: st.movie.posterHue,
            releaseYear: st.movie.releaseYear,
            tagline: st.movie.tagline,
          }
        : null,
      screen: st.screen
        ? {
            id: st.screen.id,
            name: st.screen.name,
            rows: st.screen.rows,
            cols: st.screen.cols,
            premiumRows: st.screen.premiumRows,
            premiumSurcharge: st.screen.premiumSurcharge,
            screenSurcharge: st.screen.screenSurcharge,
          }
        : null,
    };
  }
}
