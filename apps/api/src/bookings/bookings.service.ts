import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Booking, Seat, Showtime, User } from '../entities/entities';
import type { BookingStatus } from '../entities/entities';
import { HOLD_MINUTES, ShowtimesService } from '../showtimes/showtimes.service';

export const POINTS_PER_TICKET = 10;
const MAX_SEATS = 8;

/** Transición válida de estados: qué destinos admite cada estado */
export const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['used', 'cancelled'],
  used: [],
  cancelled: [],
};

/** Mutex simple: serializa las operaciones atómicas sobre reservas (better-sqlite3 single connection) */
class Mutex {
  private chain: Promise<unknown> = Promise.resolve();
  run<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.chain.then(fn);
    this.chain = result.catch(() => undefined);
    return result;
  }
}

@Injectable()
export class BookingsService {
  private readonly mutex = new Mutex();

  constructor(
    @InjectRepository(Booking) private readonly bookingsRepo: Repository<Booking>,
    @InjectRepository(Seat) private readonly seatsRepo: Repository<Seat>,
    @InjectRepository(Showtime) private readonly showtimesRepo: Repository<Showtime>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly showtimes: ShowtimesService,
  ) {}

  // ---------- creación (reserva de butacas con expiración) ----------

  async create(userId: number, showtimeId: number, seatIds: number[]) {
    if (!Array.isArray(seatIds) || seatIds.length === 0) {
      throw new BadRequestException('Selecciona al menos una butaca');
    }
    if (seatIds.length > MAX_SEATS) {
      throw new BadRequestException(`Máximo ${MAX_SEATS} butacas por compra`);
    }
    const unique = new Set(seatIds);
    if (unique.size !== seatIds.length) {
      throw new BadRequestException('Hay butacas repetidas');
    }

    // Sección crítica: expiración + comprobación de disponibilidad + creación
    return this.mutex.run(async () => {
      await this.showtimes.expireStale();
      const st = await this.showtimesRepo.findOne({
        where: { id: showtimeId, status: 'active' },
        relations: { screen: true, movie: true },
      });
      if (!st) throw new NotFoundException('Función no encontrada');
      if (new Date(st.startTime) < new Date()) {
        throw new BadRequestException('Esta función ya ha comenzado');
      }

      const seats = await this.seatsRepo.findBy({ id: In(seatIds) });
      if (seats.length !== seatIds.length) {
        throw new BadRequestException('Alguna butaca no existe');
      }
      for (const s of seats) {
        if (s.screenId !== st.screenId) {
          throw new BadRequestException('Las butacas no pertenecen a la sala de esta función');
        }
      }

      // Ocupadas/retenidas por otras reservas activas
      const actives = await this.bookingsRepo.find({
        where: { showtimeId, status: In(['pending', 'confirmed', 'used']) },
      });
      const busy = new Set<number>();
      for (const b of actives) {
        for (const seatId of b.seatIds ?? []) busy.add(seatId);
      }
      const taken = seatIds.filter((id) => busy.has(id));
      if (taken.length > 0) {
        throw new ConflictException('Alguna butaca acaba de ser ocupada — recarga el mapa');
      }

      const premiumRows = new Set<number>();
      for (let r = 1; r <= st.screen.premiumRows; r++) premiumRows.add(r);
      const total = Math.round(
        seats.reduce((acc, s) => acc + this.showtimes.seatPrice(st, premiumRows.has(s.row)), 0) * 100,
      ) / 100;

      const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);
      const booking = (await this.bookingsRepo.save(
        this.bookingsRepo.create({
          userId,
          showtimeId,
          seatIds: [...seatIds].sort((a, b) => a - b),
          totalAmount: total,
          status: 'pending',
          expiresAt,
        } as any),
      )) as unknown as Booking;
      return this.findOne(userId, booking.id);
    });
  }

  // ---------- consultas ----------

  async findAll(userId: number) {
    await this.showtimes.expireStale();
    const bookings = await this.bookingsRepo.find({
      where: { userId },
      relations: { showtime: { movie: true, screen: true } },
      order: { createdAt: 'DESC' },
    });
    return Promise.all(bookings.map((b) => this.listView(b)));
  }

  async findOne(userId: number, id: number) {
    await this.showtimes.expireStale();
    const booking = await this.bookingsRepo.findOne({
      where: { id },
      relations: { showtime: { movie: true, screen: true }, user: true },
    });
    if (!booking) throw new NotFoundException('Reserva no encontrada');
    if (booking.userId !== userId) throw new ForbiddenException('No es tu reserva');
    return this.detailView(booking);
  }

  // ---------- transiciones de estado ----------

  private async transition(userId: number, id: number, target: BookingStatus) {
    return this.mutex.run(async () => {
      const booking = await this.bookingsRepo.findOne({
        where: { id },
        relations: { showtime: { movie: true, screen: true } },
      });
      if (!booking) throw new NotFoundException('Reserva no encontrada');
      if (booking.userId !== userId) throw new ForbiddenException('No es tu reserva');

      const allowed = TRANSITIONS[booking.status] ?? [];
      if (!allowed.includes(target)) {
        throw new ConflictException(`No se puede pasar de ${booking.status} a ${target}`);
      }
      if (booking.status === 'pending' && booking.expiresAt && new Date(booking.expiresAt) < new Date()) {
        throw new ConflictException('La reserva expiró — vuelve a seleccionar butacas');
      }

      booking.status = target;
      if (target === 'confirmed') {
        booking.expiresAt = null;
        booking.code = await this.generateCode();
      }
      if (target === 'cancelled') {
        booking.expiresAt = null;
      }
      const saved = (await this.bookingsRepo.save(booking)) as unknown as Booking;

      // Puntos de fidelidad: +10/butaca al confirmar, se revierten al cancelar confirmada
      const tickets = (saved.seatIds ?? []).length;
      const user = await this.usersRepo.findOne({ where: { id: userId } });
      if (user) {
        const delta = target === 'confirmed' ? tickets * POINTS_PER_TICKET
          : target === 'cancelled' && booking.status === 'cancelled' && saved.expiresAt === null && tickets > 0
            ? 0
            : 0;
        // Reversión solo si la reserva estaba confirmada antes de cancelar
        const wasConfirmed = saved.status === 'cancelled' && target === 'cancelled' && booking.code;
        if (delta !== 0) {
          user.points = Math.max(0, user.points + delta);
          await this.usersRepo.save(user);
        }
        if (wasConfirmed && booking.code) {
          user.points = Math.max(0, user.points - tickets * POINTS_PER_TICKET);
          await this.usersRepo.save(user);
        }
      }

      return this.detailView(saved);
    });
  }

  confirm(userId: number, id: number) {
    return this.transition(userId, id, 'confirmed');
  }

  cancel(userId: number, id: number) {
    return this.transition(userId, id, 'cancelled');
  }

  use(userId: number, id: number) {
    return this.transition(userId, id, 'used');
  }

  // ---------- helpers ----------

  private async generateCode(): Promise<string> {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let attempt = 0; attempt < 20; attempt++) {
      let code = 'CNV-';
      for (let i = 0; i < 6; i++) {
        code += alphabet[Math.floor(Math.random() * alphabet.length)];
      }
      const existing = await this.bookingsRepo.findOne({ where: { code } });
      if (!existing) return code;
    }
    return `CNV-${Date.now().toString(36).toUpperCase()}`;
  }

  private async listView(b: Booking) {
    const st = b.showtime;
    return {
      id: b.id,
      status: b.status,
      code: b.code,
      totalAmount: b.totalAmount,
      createdAt: b.createdAt.toISOString(),
      expiresAt: b.expiresAt ? new Date(b.expiresAt).toISOString() : null,
      seatCount: (b.seatIds ?? []).length,
      seatLabels: await this.resolveSeatLabels(b.seatIds),
      movie: st.movie
        ? {
            id: st.movie.id,
            title: st.movie.title,
            genre: st.movie.genre,
            posterHue: st.movie.posterHue,
            ratingAge: st.movie.ratingAge,
            durationMin: st.movie.durationMin,
          }
        : null,
      startTime: st.startTime.toISOString(),
      screenName: st.screen?.name ?? '',
      format: st.format,
      language: st.language,
    };
  }

  private async detailView(b: Booking) {
    const view = await this.listView(b);
    return {
      ...view,
      showtimeId: b.showtimeId,
      seatIds: b.seatIds ?? [],
      canConfirm: b.status === 'pending',
      canCancel: b.status === 'pending' || b.status === 'confirmed',
      canUse: b.status === 'confirmed',
    };
  }

  /** Etiqueta de butaca real: fila (letra) + número, leída de la entidad Seat (los ids son globales entre salas) */
  private async resolveSeatLabels(seatIds: number[]): Promise<string[]> {
    if (!seatIds || seatIds.length === 0) return [];
    const seats = await this.seatsRepo.findBy({ id: In(seatIds) });
    const byId = new Map(seats.map((s) => [s.id, s]));
    return seatIds.map((id) => {
      const s = byId.get(id);
      return s ? `${String.fromCharCode(64 + s.row)}${s.number}` : `#${id}`;
    });
  }
}
