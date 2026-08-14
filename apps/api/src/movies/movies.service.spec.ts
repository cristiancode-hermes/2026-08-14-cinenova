import { NotFoundException } from '@nestjs/common';
import { MoviesService } from './movies.service';
import { Booking, Movie, Review, Showtime } from '../entities/entities';

const makeMovie = (over: Partial<Movie> = {}): Movie =>
  ({
    id: 1,
    title: 'Nébula Roja',
    genre: 'Ciencia ficción',
    durationMin: 138,
    releaseYear: 2026,
    director: 'Alba Marqués',
    ratingAge: '12',
    posterHue: 'e11d48',
    tagline: 'x',
    status: 'now_showing',
    featured: true,
    createdAt: new Date(),
    ...over,
  }) as Movie;

describe('MoviesService', () => {
  let moviesRepo: any;
  let showtimesRepo: any;
  let reviewsRepo: any;
  let bookingsRepo: any;
  let service: MoviesService;

  beforeEach(() => {
    moviesRepo = {
      find: jest.fn(async () => []),
      findOne: jest.fn(),
    };
    showtimesRepo = { find: jest.fn(async () => []) };
    reviewsRepo = { find: jest.fn(async () => []) };
    bookingsRepo = { find: jest.fn(async () => []) };
    service = new MoviesService(moviesRepo, showtimesRepo, reviewsRepo, bookingsRepo);
  });

  it('findAll computes avgRating rounded to 1 decimal and reviewCount', async () => {
    moviesRepo.find.mockResolvedValue([makeMovie()]);
    reviewsRepo.find.mockResolvedValue([
      { movieId: 1, rating: 4 },
      { movieId: 1, rating: 5 },
      { movieId: 1, rating: 4 },
    ]);
    const list = await service.findAll();
    expect(list[0].avgRating).toBe(4.3);
    expect(list[0].reviewCount).toBe(3);
  });

  it('findAll computes nextShowtime from future showtimes only', async () => {
    moviesRepo.find.mockResolvedValue([makeMovie()]);
    showtimesRepo.find.mockResolvedValue([
      makeShowtime(1, new Date(Date.now() - 1000)),
      makeShowtime(2, new Date(Date.now() + 7200 * 1000)),
    ]);
    const list = await service.findAll();
    expect(list[0].nextShowtime).toBeTruthy();
    expect(new Date(list[0].nextShowtime as string).getTime()).toBeGreaterThan(Date.now());
  });

  it('findAll filters by search query q', async () => {
    moviesRepo.find.mockResolvedValue([makeMovie(), makeMovie({ id: 2, title: 'Vector', genre: 'Thriller' })]);
    const list = await service.findAll({ q: 'vector' });
    expect(list.map((m) => m.id)).toEqual([2]);
  });

  it('findAll filters by status', async () => {
    const all = [makeMovie(), makeMovie({ id: 2, title: 'Tierra de Ceniza', status: 'coming_soon' })];
    moviesRepo.find.mockImplementation(async (opts: any) =>
      opts?.where?.status ? all.filter((m) => m.status === opts.where.status) : all,
    );
    const list = await service.findAll({ status: 'coming_soon' });
    expect(list.map((m) => m.id)).toEqual([2]);
  });

  it('getDetail wraps movie with reviews and showtime occupancy', async () => {
    moviesRepo.findOne.mockResolvedValue(makeMovie());
    reviewsRepo.find.mockResolvedValue([{ rating: 5, comment: 'ok', user: { username: 'demo' }, createdAt: new Date() }]);
    showtimesRepo.find.mockResolvedValue([makeShowtime(10, new Date(Date.now() + 3600 * 1000))]);
    bookingsRepo.find.mockResolvedValue([{ showtimeId: 10, status: 'confirmed', seatIds: [1, 2, 3] }]);
    const detail = await service.getDetail(1);
    expect(detail.movie.title).toBe('Nébula Roja');
    expect(detail.movie.avgRating).toBe(5);
    expect(detail.reviews[0].username).toBe('demo');
    expect(detail.showtimes[0].soldTickets).toBe(3);
    expect(detail.showtimes[0].totalSeats).toBe(126); // 9x14
    expect(detail.showtimes[0].occupancyPct).toBe(2); // round(3/126*100)
  });

  it('getDetail excludes cancelled bookings from occupancy', async () => {
    moviesRepo.findOne.mockResolvedValue(makeMovie());
    showtimesRepo.find.mockResolvedValue([makeShowtime(10, new Date(Date.now() + 3600 * 1000))]);
    bookingsRepo.find.mockResolvedValue([
      { showtimeId: 10, status: 'cancelled', seatIds: [1, 2, 3, 4] },
      { showtimeId: 10, status: 'pending', seatIds: [5] },
    ]);
    const detail = await service.getDetail(1);
    expect(detail.showtimes[0].soldTickets).toBe(1);
  });

  it('getDetail throws 404 for unknown movie', async () => {
    moviesRepo.findOne.mockResolvedValue(null);
    await expect(service.getDetail(999)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('userReview returns existing review for the user', async () => {
    reviewsRepo.findOne = jest.fn(async () => ({ id: 3, movieId: 1, userId: 7 }));
    const r = await service.userReview(1, 7);
    expect(r).not.toBeNull();
  });
});

function makeShowtime(id: number, startTime: Date): Showtime {
  return {
    id,
    movieId: 1,
    screenId: 2,
    startTime,
    basePrice: 11.5,
    language: 'ES',
    format: '2D',
    status: 'active',
    screen: { id: 2, name: 'Sala 1', rows: 9, cols: 14, premiumRows: 2, premiumSurcharge: 4, screenSurcharge: 3 },
  } as Showtime;
}
