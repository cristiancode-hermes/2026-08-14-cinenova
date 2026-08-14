import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Booking, Movie, Review, Showtime } from '../entities/entities';

export interface MovieListItem extends Movie {
  avgRating: number;
  reviewCount: number;
  nextShowtime: string | null;
}

@Injectable()
export class MoviesService {
  constructor(
    @InjectRepository(Movie) private readonly moviesRepo: Repository<Movie>,
    @InjectRepository(Showtime) private readonly showtimesRepo: Repository<Showtime>,
    @InjectRepository(Review) private readonly reviewsRepo: Repository<Review>,
    @InjectRepository(Booking) private readonly bookingsRepo: Repository<Booking>,
  ) {}

  async findAll(opts: { status?: string; genre?: string; q?: string } = {}) {
    const where: Record<string, unknown> = {};
    if (opts.status) where.status = opts.status;
    if (opts.genre) where.genre = opts.genre;
    const movies = await this.moviesRepo.find({
      where,
      order: { featured: 'DESC', releaseYear: 'DESC' },
    });

    const movieIds = movies.map((m) => m.id);
    const reviews = movieIds.length
      ? await this.reviewsRepo.find({ where: { movieId: In(movieIds) } })
      : [];
    const now = new Date();
    const showtimes = movieIds.length
      ? await this.showtimesRepo.find({
          where: { movieId: In(movieIds), status: 'active' },
          relations: { movie: false, screen: true },
        })
      : [];

    const reviewMap = new Map<number, { sum: number; count: number }>();
    for (const r of reviews) {
      const agg = reviewMap.get(r.movieId) ?? { sum: 0, count: 0 };
      agg.sum += r.rating;
      agg.count += 1;
      reviewMap.set(r.movieId, agg);
    }

    const list: MovieListItem[] = movies
      .filter((m) => {
        if (!opts.q) return true;
        const q = opts.q!.toLowerCase();
        return (
          m.title.toLowerCase().includes(q) ||
          m.genre.toLowerCase().includes(q) ||
          m.director.toLowerCase().includes(q)
        );
      })
      .map((m) => {
        const agg = reviewMap.get(m.id);
        const upcoming = showtimes
          .filter((s) => s.movieId === m.id && new Date(s.startTime) >= now)
          .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
        return {
          ...m,
          avgRating: agg && agg.count ? Math.round((agg.sum / agg.count) * 10) / 10 : 0,
          reviewCount: agg?.count ?? 0,
          nextShowtime: upcoming.length ? upcoming[0].startTime.toISOString() : null,
        };
      });

    return list;
  }

  async findOne(id: number) {
    const movie = await this.moviesRepo.findOne({ where: { id } });
    if (!movie) throw new NotFoundException('Película no encontrada');
    return movie;
  }

  async getDetail(id: number) {
    const movie = await this.findOne(id);

    const reviews = await this.reviewsRepo.find({
      where: { movieId: id },
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
    const agg = reviews.reduce(
      (acc, r) => ({ sum: acc.sum + r.rating, count: acc.count + 1 }),
      { sum: 0, count: 0 },
    );

    const now = new Date();
    const showtimes = await this.showtimesRepo.find({
      where: { movieId: id, status: 'active' },
      relations: { screen: true },
    });
    const future = showtimes
      .filter((s) => new Date(s.startTime) >= now)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    // Ocupación real por función (misma fuente de verdad que el mapa de butacas)
    const stIds = future.map((s) => s.id);
    const bookings = stIds.length
      ? await this.bookingsRepo.find({ where: { showtimeId: In(stIds) } })
      : [];
    const soldMap = new Map<number, number>();
    for (const b of bookings) {
      if (b.status === 'cancelled') continue;
      soldMap.set(b.showtimeId, (soldMap.get(b.showtimeId) ?? 0) + b.seatIds.length);
    }

    const showtimeView = future.map((s) => {
      const sold = soldMap.get(s.id) ?? 0;
      const total = s.screen.rows * s.screen.cols;
      return {
        id: s.id,
        startTime: s.startTime.toISOString(),
        screenName: s.screen.name,
        screenId: s.screenId,
        format: s.format,
        language: s.language,
        basePrice: s.basePrice,
        soldTickets: sold,
        totalSeats: total,
        occupancyPct: total ? Math.round((sold / total) * 100) : 0,
      };
    });

    return {
      movie: {
        ...movie,
        avgRating: agg.count ? Math.round((agg.sum / agg.count) * 10) / 10 : 0,
        reviewCount: agg.count,
      },
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        username: r.user?.username ?? 'anon',
        createdAt: r.createdAt.toISOString(),
      })),
      showtimes: showtimeView,
    };
  }

  /** My review for a movie (para saber si el usuario ya votó) */
  async userReview(movieId: number, userId: number) {
    return this.reviewsRepo.findOne({ where: { movieId, userId } });
  }
}
