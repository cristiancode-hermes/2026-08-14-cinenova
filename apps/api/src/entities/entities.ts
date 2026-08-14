import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Exclude } from 'class-transformer';

export type MovieStatus = 'now_showing' | 'coming_soon';
export type BookingStatus = 'pending' | 'confirmed' | 'used' | 'cancelled';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Exclude()
  @Column()
  passwordHash: string;

  @Column({ default: 'customer' })
  role: string;

  /** Puntos de fidelidad: 10 por butaca confirmada */
  @Column({ type: 'integer', default: 0 })
  points: number;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('movies')
export class Movie {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  synopsis: string;

  @Column()
  genre: string;

  @Column({ type: 'integer' })
  durationMin: number;

  @Column({ type: 'integer' })
  releaseYear: number;

  @Column()
  director: string;

  /** Clasificación por edades: TP, 7, 12, 16, 18 */
  @Column({ default: 'TP' })
  ratingAge: string;

  /** Hue base para el arte del póster (generado) — hex sin # */
  @Column({ default: 'e11d48' })
  posterHue: string;

  @Column({ type: 'text', default: '' })
  tagline: string;

  @Column({ default: 'now_showing' })
  status: MovieStatus;

  @Column({ default: false })
  featured: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('screens')
export class Screen {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'integer' })
  rows: number;

  @Column({ type: 'integer' })
  cols: number;

  /** Filas premium (reclinables) — recargo por butaca */
  @Column({ type: 'integer', default: 0 })
  premiumRows: number;

  @Column({ type: 'real', default: 2.5 })
  premiumSurcharge: number;

  /** Recargo por entrada de sala (base price del showtime + este recargo) */
  @Column({ type: 'real', default: 0 })
  screenSurcharge: number;
}

@Entity('seats')
@Unique(['screenId', 'row', 'number'])
export class Seat {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  screenId: number;

  @Column({ type: 'integer' })
  row: number;

  @Column({ type: 'integer' })
  number: number;

  @Column({ default: false })
  isWheelchair: boolean;
}

@Entity('showtimes')
export class Showtime {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  movieId: number;

  @Column()
  screenId: number;

  @Column({ type: 'datetime' })
  startTime: Date;

  @Column({ type: 'real' })
  basePrice: number;

  @Column({ default: 'ES' })
  language: string; // ES | VOSE | VO

  @Column({ default: '2D' })
  format: string; // 2D | 3D | IMAX

  @Column({ default: 'active' })
  status: string; // active | cancelled

  @ManyToOne(() => Movie, { eager: true })
  @JoinColumn({ name: 'movieId' })
  movie: Movie;

  @ManyToOne(() => Screen, { eager: true })
  @JoinColumn({ name: 'screenId' })
  screen: Screen;
}

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  userId: number;

  @Column()
  showtimeId: number;

  /** IDs de butacas (Seat.id) reservadas — simple-json para SQLite y Postgres */
  @Column({ type: 'simple-json' })
  seatIds: number[];

  @Column({ type: 'real' })
  totalAmount: number;

  @Column({ default: 'pending' })
  status: BookingStatus;

  /** Si status === 'pending': fecha de expiración de la reserva (10 min) */
  @Column({ type: 'datetime', nullable: true })
  expiresAt: Date | null;

  /** Código de entrada asignado al confirmar (ej. CNV-4F3K2Q) */
  @Column({ type: 'varchar', unique: true, nullable: true })
  code: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Showtime, { eager: true })
  @JoinColumn({ name: 'showtimeId' })
  showtime: Showtime;
}

@Entity('reviews')
@Unique(['movieId', 'userId'])
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  movieId: number;

  @Column()
  userId: number;

  @Column({ type: 'integer' })
  rating: number; // 1-5

  @Column({ type: 'text' })
  comment: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;
}
