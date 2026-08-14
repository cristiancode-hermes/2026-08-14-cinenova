import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking, Movie, Review, Screen, Seat, Showtime, User } from '../entities/entities';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Movie, Screen, Seat, Showtime, Booking, Review]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
