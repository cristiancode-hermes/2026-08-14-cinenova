import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, User } from '../entities/entities';

export const TIER_BRONZE = 0;
export const TIER_SILVER = 100;
export const TIER_GOLD = 250;

export interface LoyaltyInfo {
  points: number;
  tier: 'bronce' | 'plata' | 'oro';
  tickets: number;
  nextTier: 'plata' | 'oro' | null;
  pointsToNext: number;
  progressPct: number;
}

export function loyaltyFor(points: number, tickets: number): LoyaltyInfo {
  let tier: LoyaltyInfo['tier'] = 'bronce';
  let nextTier: LoyaltyInfo['nextTier'] = 'plata';
  let nextAt = TIER_SILVER;
  if (points >= TIER_GOLD) {
    tier = 'oro';
    nextTier = null;
    nextAt = TIER_GOLD;
  } else if (points >= TIER_SILVER) {
    tier = 'plata';
    nextTier = 'oro';
    nextAt = TIER_GOLD;
  }
  const pointsToNext = nextTier ? Math.max(0, nextAt - points) : 0;
  const prev = tier === 'bronce' ? 0 : tier === 'plata' ? TIER_SILVER : TIER_GOLD;
  const progressPct = nextTier
    ? Math.min(100, Math.round(((points - prev) / (nextAt - prev)) * 100))
    : 100;
  return { points, tier, tickets, nextTier, pointsToNext, progressPct };
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Booking) private readonly bookingsRepo: Repository<Booking>,
  ) {}

  async me(userId: number) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) return null;
    const bookings = await this.bookingsRepo.find({
      where: { userId, status: 'confirmed' },
    });
    // Las usadas también cuentan como entradas vistas
    const used = await this.bookingsRepo.find({ where: { userId, status: 'used' } });
    const tickets =
      bookings.reduce((acc, b) => acc + (b.seatIds?.length ?? 0), 0) +
      used.reduce((acc, b) => acc + (b.seatIds?.length ?? 0), 0);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      points: user.points,
      loyalty: loyaltyFor(user.points, tickets),
    };
  }
}
