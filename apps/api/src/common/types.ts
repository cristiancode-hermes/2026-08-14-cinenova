import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export interface AuthenticatedUser {
  id: number;
  username: string;
  email: string;
  name: string;
  points: number;
  role: string;
}

export class BookingSeatDto {
  @ApiProperty({ description: 'Seat.id' })
  id: number;

  @ApiProperty({ example: 5 })
  row: number;

  @ApiProperty({ example: 3 })
  number: number;

  @ApiProperty({ example: false })
  isPremium: boolean;

  @ApiProperty({ example: false })
  isWheelchair: boolean;

  @ApiProperty({ enum: ['available', 'selected', 'held', 'occupied'] })
  status: 'available' | 'selected' | 'held' | 'occupied';

  @ApiProperty({ required: false, description: 'Hasta cuándo está retenida (si held)' })
  heldUntil?: string | null;
}

export class CreateBookingDto {
  @ApiProperty({ example: 12 })
  @IsInt()
  showtimeId: number;

  @ApiProperty({ example: [241, 242], description: 'Seat.id a reservar (máx 8)' })
  @IsArray()
  @IsInt({ each: true })
  seatIds: number[];
}

export class CreateReviewDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ example: 'Me encantó, banda sonora brutal.' })
  @IsString()
  @MaxLength(600)
  comment: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'demo' })
  @IsString()
  @MinLength(3)
  @MaxLength(24)
  username: string;

  @ApiProperty({ example: 'demo@cinenova.dev' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Demo CineNova' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @ApiProperty({ example: 'demo1234', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: 'demo', description: 'Usuario o email' })
  @IsString()
  @IsOptional()
  identifier: string;

  @ApiProperty({ example: 'demo1234' })
  @IsString()
  @IsOptional()
  password: string;
}
