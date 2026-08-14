import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { Movie, Review } from '../entities/entities';

describe('ReviewsService', () => {
  let reviewsRepo: any;
  let moviesRepo: any;
  let service: ReviewsService;

  beforeEach(() => {
    reviewsRepo = {
      findOne: jest.fn(),
      create: jest.fn((x: any) => x),
      save: jest.fn(async (x: any) => ({ id: 9, ...x })),
      remove: jest.fn(async () => undefined),
    };
    moviesRepo = { findOne: jest.fn(async () => ({ id: 1, title: 'Nébula Roja' }) as Movie) };
    service = new ReviewsService(reviewsRepo, moviesRepo);
  });

  it('creates a review with trimmed comment', async () => {
    reviewsRepo.findOne.mockResolvedValue(null);
    const res = await service.create(1, 7, 5, '  Me encantó  ');
    expect(res.rating).toBe(5);
    expect(res.comment).toBe('Me encantó');
    const saved = reviewsRepo.save.mock.calls[0][0];
    expect(saved.movieId).toBe(1);
    expect(saved.userId).toBe(7);
  });

  it('rejects rating outside 1-5', async () => {
    await expect(service.create(1, 7, 0, 'x')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create(1, 7, 6, 'x')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate review for same movie+user with 409', async () => {
    reviewsRepo.findOne.mockResolvedValue({ id: 3, movieId: 1, userId: 7 } as Review);
    await expect(service.create(1, 7, 4, 'dup')).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws 404 when movie does not exist', async () => {
    moviesRepo.findOne.mockResolvedValue(null);
    await expect(service.create(999, 7, 4, 'x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('removes own review', async () => {
    reviewsRepo.findOne.mockResolvedValue({ id: 3, movieId: 1, userId: 7 } as Review);
    const res = await service.remove(7, 3);
    expect(res.ok).toBe(true);
    expect(reviewsRepo.remove).toHaveBeenCalled();
  });

  it('throws 403 removing someone elses review', async () => {
    reviewsRepo.findOne.mockResolvedValue({ id: 3, movieId: 1, userId: 99 } as Review);
    await expect(service.remove(7, 3)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws 404 removing unknown review', async () => {
    reviewsRepo.findOne.mockResolvedValue(null);
    await expect(service.remove(7, 999)).rejects.toBeInstanceOf(NotFoundException);
  });
});
