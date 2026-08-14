import { NotFoundException } from '@nestjs/common';
import { ShowtimesService, HOLD_MINUTES } from './showtimes.service';
import { Booking, Seat, Showtime } from '../entities/entities';

const makeShowtime = (over: Partial<Showtime> = {}): Showtime =>
  ({
    id: 10,
    movieId: 1,
    screenId: 2,
    startTime: new Date(Date.now() + 5 * 3600 * 1000),
    basePrice: 11.5,
    language: 'ES',
    format: '2D',
    status: 'active',
    screen: { id: 2, name: 'Sala 1', rows: 9, cols: 14, premiumRows: 2, premiumSurcharge: 4, screenSurcharge: 3 },
    movie: { id: 1, title: 'Nébula Roja', genre: 'Sci-Fi', durationMin: 138, ratingAge: '12', posterHue: 'e11d48', releaseYear: 2026, tagline: 'x' },
    ...over,
  }) as Showtime;

describe('ShowtimesService', () => {
  let showtimesRepo: any;
  let seatsRepo: any;
  let bookingsRepo: any;
  let service: ShowtimesService;

  beforeEach(() => {
    showtimesRepo = {
      find: jest.fn(async () => []),
      findOne: jest.fn(),
    };
    seatsRepo = { find: jest.fn(async () => []) };
    bookingsRepo = {
      find: jest.fn(async () => []),
      save: jest.fn(async (x: any) => x),
    };
    service = new ShowtimesService(showtimesRepo, seatsRepo, bookingsRepo);
  });

  it('filters out showtimes that already started', async () => {
    showtimesRepo.find.mockResolvedValue([
      makeShowtime({ id: 1, startTime: new Date(Date.now() - 3600 * 1000) }),
      makeShowtime({ id: 2, startTime: new Date(Date.now() + 3600 * 1000) }),
    ]);
    const list = await service.findAll();
    expect(list.map((s) => s.id)).toEqual([2]);
  });

  it('filters by movieId', async () => {
    const all = [makeShowtime({ id: 1, movieId: 1 }), makeShowtime({ id: 2, movieId: 2 })];
    showtimesRepo.find.mockImplementation(async (opts: any) =>
      opts?.where?.movieId ? all.filter((s) => s.movieId === opts.where.movieId) : all,
    );
    const list = await service.findAll({ movieId: 2 });
    expect(list.map((s) => s.id)).toEqual([2]);
  });

  it('seatPrice = base + screenSurcharge (+ premium)', () => {
    const st = makeShowtime();
    expect(service.seatPrice(st, false)).toBe(14.5);
    expect(service.seatPrice(st, true)).toBe(18.5);
  });

  it('getSeatMap marks booked seats occupied and pending held', async () => {
    showtimesRepo.findOne.mockResolvedValue(makeShowtime());
    seatsRepo.find.mockResolvedValue([makeSeat(100, 1, 1), makeSeat(101, 1, 2), makeSeat(102, 3, 3)]);
    bookingsRepo.find.mockResolvedValue([
      { seatIds: [100], status: 'confirmed' },
      { seatIds: [101], status: 'pending', expiresAt: new Date(Date.now() + 60000) },
    ]);
    const map = await service.getSeatMap(10);
    const byId = Object.fromEntries(map.seats.map((s: any) => [s.id, s]));
    expect(byId[100].status).toBe('occupied');
    expect(byId[101].status).toBe('held');
    expect(byId[101].heldUntil).toBeTruthy();
    expect(byId[102].status).toBe('available');
  });

  it('getSeatMap throws 404 for unknown showtime', async () => {
    showtimesRepo.findOne.mockResolvedValue(null);
    await expect(service.getSeatMap(999)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('expireStale cancels expired pending bookings', async () => {
    bookingsRepo.find.mockResolvedValue([
      { id: 1, status: 'pending', expiresAt: new Date(Date.now() - 1000) },
      { id: 2, status: 'pending', expiresAt: new Date(Date.now() + 60000) },
    ]);
    const n = await service.expireStale();
    expect(n).toBe(1);
    const saved = bookingsRepo.save.mock.calls[0][0];
    expect(saved.id).toBe(1);
    expect(saved.status).toBe('cancelled');
  });

  it('view returns screen + movie summary', () => {
    const v = service.view(makeShowtime());
    expect(v.screen).not.toBeNull();
    expect(v.movie).not.toBeNull();
    expect(v.screen!.name).toBe('Sala 1');
    expect(v.movie!.title).toBe('Nébula Roja');
    expect(v.startTime).toBeTruthy();
  });

  it('HOLD_MINUTES is 10', () => {
    expect(HOLD_MINUTES).toBe(10);
  });
});

function makeSeat(id: number, row: number, number: number): Seat {
  return { id, screenId: 2, row, number, isWheelchair: false } as Seat;
}
