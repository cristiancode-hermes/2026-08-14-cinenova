import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Movie, Review } from '../entities/entities';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private readonly reviewsRepo: Repository<Review>,
    @InjectRepository(Movie) private readonly moviesRepo: Repository<Movie>,
  ) {}

  async create(movieId: number, userId: number, rating: number, comment: string) {
    if (!rating || rating < 1 || rating > 5) {
      throw new BadRequestException('La puntuación debe estar entre 1 y 5');
    }
    const movie = await this.moviesRepo.findOne({ where: { id: movieId } });
    if (!movie) throw new NotFoundException('Película no encontrada');

    const existing = await this.reviewsRepo.findOne({ where: { movieId, userId } });
    if (existing) {
      throw new ConflictException('Ya has valorado esta película — puedes borrar tu reseña y volver a votar');
    }
    const review = (await this.reviewsRepo.save(
      this.reviewsRepo.create({ movieId, userId, rating, comment: comment?.trim() || '' } as any),
    )) as unknown as Review;
    return { id: review.id, rating: review.rating, comment: review.comment };
  }

  async remove(userId: number, reviewId: number) {
    const review = await this.reviewsRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Reseña no encontrada');
    if (review.userId !== userId) throw new ForbiddenException('No es tu reseña');
    await this.reviewsRepo.remove(review);
    return { ok: true };
  }
}
