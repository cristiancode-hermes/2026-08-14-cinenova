// Interfaces del API CineNova — espejo de los serializers del backend

export interface Movie {
  id: number;
  title: string;
  synopsis: string;
  genre: string;
  durationMin: number;
  releaseYear: number;
  director: string;
  ratingAge: string;
  posterHue: string;
  tagline: string;
  status: 'now_showing' | 'coming_soon';
  featured: boolean;
  avgRating: number;
  reviewCount: number;
  nextShowtime: string | null;
}

export interface MovieDetail {
  movie: Movie;
  reviews: Review[];
  showtimes: ShowtimeSummary[];
}

export interface Review {
  id: number;
  rating: number;
  comment: string;
  username: string;
  createdAt: string;
}

export interface ShowtimeSummary {
  id: number;
  startTime: string;
  screenName: string;
  screenId: number;
  format: string;
  language: string;
  basePrice: number;
  soldTickets: number;
  totalSeats: number;
  occupancyPct: number;
}

export interface ScreenInfo {
  id: number;
  name: string;
  rows: number;
  cols: number;
  premiumRows: number;
  premiumSurcharge: number;
  screenSurcharge: number;
}

export interface SeatInfo {
  id: number;
  row: number;
  number: number;
  isPremium: boolean;
  isWheelchair: boolean;
  status: 'available' | 'selected' | 'held' | 'occupied';
  heldUntil: string | null;
}

export interface SeatMap {
  showtime: ShowtimeView;
  screen: ScreenInfo;
  seats: SeatInfo[];
}

export interface ShowtimeView {
  id: number;
  movieId: number;
  startTime: string;
  basePrice: number;
  language: string;
  format: string;
  status: string;
  movie: {
    id: number;
    title: string;
    genre: string;
    durationMin: number;
    ratingAge: string;
    posterHue: string;
    releaseYear: number;
    tagline: string;
  } | null;
  screen: ScreenInfo | null;
}

export interface Booking {
  id: number;
  showtimeId: number;
  status: 'pending' | 'confirmed' | 'used' | 'cancelled';
  code: string | null;
  totalAmount: number;
  createdAt: string;
  expiresAt: string | null;
  seatCount: number;
  seatLabels: string[];
  seatIds: number[];
  movie: {
    id: number;
    title: string;
    genre: string;
    posterHue: string;
    ratingAge: string;
    durationMin: number;
  } | null;
  startTime: string;
  screenName: string;
  format: string;
  language: string;
  canConfirm: boolean;
  canCancel: boolean;
  canUse: boolean;
}

export interface MeProfile {
  id: number;
  username: string;
  email: string;
  name: string;
  points: number;
  loyalty: {
    points: number;
    tier: 'bronce' | 'plata' | 'oro';
    tickets: number;
    nextTier: 'plata' | 'oro' | null;
    pointsToNext: number;
    progressPct: number;
  };
}
