import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { BookingsService, POINTS_PER_TICKET, TRANSITIONS } from './bookings.service';
import { Booking, Seat, Showtime, User } from '../entities/entities';

const makeShowtime = (over: Partial<Showtime> = {}): Showtime =>
  ({
    id: 10,
    movieId: 1,
    screenId: 2,
    startTime: new Date(Date.now() + 5 * 3600 * 1000), // futuro
    basePrice: 11.5,
    language: 'ES',
    format: '2D',
    status: 'active',
    screen: { id: 2, name: 'Sala 1', rows: 9, cols: 14, premiumRows: 2, premiumSurcharge: 4, screenSurcharge: 3 },
    movie: { id: 1, title: 'Nébula Roja' },
    ...over,
  }) as Showtime;

const makeSeat = (over: Partial<Seat> = {}): Seat =>
  ({ id: 100, screenId: 2, row: 3, number: 5, isWheelchair: false, ...over }) as Seat;

const makeBooking = (over: Partial<Booking> = {}): Booking =>
  ({
    id: 1,
    userId: 7,
    showtimeId: 10,
    seatIds: [100],
    totalAmount: 14.5,
    status: 'pending',
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    code: null,
    createdAt: new Date(),
    showtime: makeShowtime(),
    ...over,
  }) as Booking;

describe('BookingsService', () => {
  let bookingsRepo: any;
  let seatsRepo: any;
  let showtimesRepo: any;
  let usersRepo: any;
  let showtimes: any;
  let service: BookingsService;

  beforeEach(() => {
    bookingsRepo = {
      find: jest.fn(async () => []),
      findOne: jest.fn(async () => makeBooking()),
      findBy: jest.fn(),
      create: jest.fn((x: any) => x),
      save: jest.fn(async (x: any) => ({ id: 42, ...x })),
    };
    seatsRepo = {
      findBy: jest.fn(async () => [makeSeat({ id: 100 })]),
    };
    showtimesRepo = { findOne: jest.fn(async () => makeShowtime()) };
    usersRepo = {
      findOne: jest.fn(async () => ({ id: 7, points: 100 })),
      save: jest.fn(async (x: any) => x),
    };
    showtimes = {
      expireStale: jest.fn(async () => 0),
      seatPrice: jest.fn((st: Showtime, isPremium: boolean) =>
        st.basePrice + st.screen.screenSurcharge + (isPremium ? st.screen.premiumSurcharge : 0),
      ),
    };
    service = new BookingsService(bookingsRepo, seatsRepo, showtimesRepo, usersRepo, showtimes as any);
  });

  it('rejects empty seat list', async () => {
    await expect(service.create(7, 10, [])).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects more than 8 seats', async () => {
    await expect(service.create(7, 10, [1, 2, 3, 4, 5, 6, 7, 8, 9])).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate seats', async () => {
    await expect(service.create(7, 10, [100, 100])).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a showtime that already started', async () => {
    showtimesRepo.findOne.mockResolvedValue(makeShowtime({ startTime: new Date(Date.now() - 1000) }));
    await expect(service.create(7, 10, [100])).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws 404 for unknown showtime', async () => {
    showtimesRepo.findOne.mockResolvedValue(null);
    await expect(service.create(7, 10, [100])).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws 409 when a seat is already busy', async () => {
    bookingsRepo.find.mockResolvedValue([makeBooking({ seatIds: [100], status: 'confirmed' })]);
    await expect(service.create(7, 10, [100])).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates pending booking with computed total (premium seat)', async () => {
    seatsRepo.findBy.mockResolvedValue([makeSeat({ id: 100, row: 1 })]);
    bookingsRepo.findOne.mockResolvedValue(makeBooking({ totalAmount: 18.5, status: 'pending' }));
    const res = await service.create(7, 10, [100]);
    expect(res.status).toBe('pending');
    // 11.5 + 3 (surcharge sala) + 4 (premium) = 18.5
    expect(res.totalAmount).toBe(18.5);
    const saved = bookingsRepo.save.mock.calls[0][0];
    expect(saved.userId).toBe(7);
    expect(saved.status).toBe('pending');
    expect(saved.expiresAt).toBeInstanceOf(Date);
  });

  it('expires stale pending bookings before creating', async () => {
    await service.create(7, 10, [100]);
    expect(showtimes.expireStale).toHaveBeenCalled();
  });

  it('transition pending→confirmed sets code CNV- and clears expiresAt', async () => {
    bookingsRepo.findOne.mockResolvedValue(makeBooking({ id: 1, userId: 7, status: 'pending' }));
    bookingsRepo.save.mockImplementation(async (b: any) => ({ ...b, id: 1, code: 'CNV-ABC123', expiresAt: null }));
    const res = await service.confirm(7, 1);
    expect(res.status).toBe('confirmed');
    expect(res.code).toMatch(/^CNV-/);
    expect(res.canConfirm).toBe(false);
    expect(res.canUse).toBe(true);
  });

  it('rejects invalid transition pending→used (409)', async () => {
    bookingsRepo.findOne.mockResolvedValue(makeBooking({ id: 1, userId: 7, status: 'pending' }));
    await expect(service.use(7, 1)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects confirming an expired pending booking', async () => {
    bookingsRepo.findOne.mockResolvedValue(
      makeBooking({ id: 1, userId: 7, status: 'pending', expiresAt: new Date(Date.now() - 1000) }),
    );
    await expect(service.confirm(7, 1)).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws 403 when booking belongs to another user', async () => {
    bookingsRepo.findOne.mockResolvedValue(makeBooking({ id: 1, userId: 999 }));
    await expect(service.findOne(7, 1)).rejects.toMatchObject({ status: 403 });
  });

  it('throws 404 for unknown booking', async () => {
    bookingsRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne(7, 1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('awards points on confirm (10 per seat) and reverses on cancel', async () => {
    bookingsRepo.findOne
      .mockResolvedValueOnce(makeBooking({ id: 1, userId: 7, status: 'pending' })) // confirm
      .mockResolvedValueOnce(null) // generateCode busca código libre
      .mockResolvedValueOnce(makeBooking({ id: 1, userId: 7, status: 'confirmed', code: 'CNV-X', expiresAt: null })); // cancel
    bookingsRepo.save.mockImplementation(async (b: any) => ({ ...b, id: 1, code: b.status === 'confirmed' ? 'CNV-X' : null, expiresAt: null }));
    usersRepo.findOne
      .mockResolvedValueOnce({ id: 7, points: 100 }) // confirm: +10 → 110
      .mockResolvedValueOnce({ id: 7, points: 110 }); // cancel: revierte → 100
    await service.confirm(7, 1);
    expect(usersRepo.save).toHaveBeenCalledWith(expect.objectContaining({ points: 100 + POINTS_PER_TICKET }));
    await service.cancel(7, 1);
    const lastSave = usersRepo.save.mock.calls[usersRepo.save.mock.calls.length - 1][0];
    expect(lastSave.points).toBe(100);
  });

  it('TRANSITIONS table encodes the state machine', () => {
    expect(TRANSITIONS.pending).toEqual(['confirmed', 'cancelled']);
    expect(TRANSITIONS.confirmed).toEqual(['used', 'cancelled']);
    expect(TRANSITIONS.used).toEqual([]);
    expect(TRANSITIONS.cancelled).toEqual([]);
  });

  it('generateCode produces unique CNV- codes', async () => {
    bookingsRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    const svc: any = service;
    const c1 = await svc.generateCode();
    const c2 = await svc.generateCode();
    expect(c1).toMatch(/^CNV-[A-Z2-9]{6}$/);
    expect(c1).not.toBe(c2);
  });
});
