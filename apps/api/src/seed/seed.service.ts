import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Booking, Movie, Review, Screen, Seat, Showtime, User } from '../entities/entities';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Seed');

  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Movie) private readonly moviesRepo: Repository<Movie>,
    @InjectRepository(Screen) private readonly screensRepo: Repository<Screen>,
    @InjectRepository(Seat) private readonly seatsRepo: Repository<Seat>,
    @InjectRepository(Showtime) private readonly showtimesRepo: Repository<Showtime>,
    @InjectRepository(Booking) private readonly bookingsRepo: Repository<Booking>,
    @InjectRepository(Review) private readonly reviewsRepo: Repository<Review>,
  ) {}

  async onApplicationBootstrap() {
    if (process.env.SEED_DB !== 'false') {
      await this.seed();
    }
  }

  async seed() {
    if ((await this.usersRepo.count()) > 0) {
      this.logger.log('DB ya tiene datos — seed omitido');
      return;
    }
    this.logger.log('Sembrando CineNova…');

    const demo = (await this.usersRepo.save(
      this.usersRepo.create({
        username: 'demo',
        email: 'demo@cinenova.dev',
        name: 'Demo CineNova',
        passwordHash: await bcrypt.hash('demo1234', 10),
        points: 0,
      } as any),
    )) as unknown as User;
    const maria = (await this.usersRepo.save(
      this.usersRepo.create({
        username: 'maria',
        email: 'maria@cinenova.dev',
        name: 'María Soto',
        passwordHash: await bcrypt.hash('demo1234', 10),
        points: 0,
      } as any),
    )) as unknown as User;
    const lucas = (await this.usersRepo.save(
      this.usersRepo.create({
        username: 'lucas',
        email: 'lucas@cinenova.dev',
        name: 'Lucas Ferreiro',
        passwordHash: await bcrypt.hash('demo1234', 10),
        points: 0,
      } as any),
    )) as unknown as User;

    // ---- Películas (ficción, cartelera + próximos estrenos) ----
    const movieData = [
      {
        title: 'Nébula Roja', genre: 'Ciencia ficción', durationMin: 138, releaseYear: 2026,
        director: 'Alba Marqués', ratingAge: '12', posterHue: 'e11d48', status: 'now_showing', featured: true,
        tagline: 'La señal llegó de un lugar imposible.',
        synopsis: 'En una estación orbital al borde del sistema, la astrofísica Vera Okada capta una señal que no puede explicar la física conocida. Cuando la señal empieza a responder a sus preguntas, la tripulación descubre que la Nebulosa Roja no es un fenómeno: es una puerta que lleva mil años abierta.',
      },
      {
        title: 'Vector', genre: 'Thriller', durationMin: 112, releaseYear: 2026,
        director: 'Iván Cuesta', ratingAge: '16', posterHue: '3b82f6', status: 'now_showing', featured: true,
        tagline: 'Nadie la vio llegar. Nadie puede pararla.',
        synopsis: 'Una analista de transporte público encuentra un patrón imposible en las cámaras del metro: una misma figura aparece en cada incidente de la ciudad, siempre un minuto antes. Perseguir a Vector la llevará a una red de vigilancia que la vigila a ella también.',
      },
      {
        title: 'El Último Faro', genre: 'Drama', durationMin: 121, releaseYear: 2025,
        director: 'Carmen Duarte', ratingAge: '7', posterHue: 'f59e0b', status: 'now_showing', featured: false,
        tagline: 'Hay luces que solo se apagan cuando alguien las recuerda.',
        synopsis: 'Tras décadas de servicio, el farero Antón recibe la orden de automatizar el último faro habitado de la costa cantábrica. Durante su última semana, un temporal le obliga a refugiarse con una joven geóloga que guarda un secreto sobre la isla.',
      },
      {
        title: 'Kawaii Robots', genre: 'Animación', durationMin: 96, releaseYear: 2026,
        director: 'Pablo Ríos', ratingAge: 'TP', posterHue: '22c55e', status: 'now_showing', featured: false,
        tagline: 'Tres robots de juguete. Una aventura gigante.',
        synopsis: 'En el taller de una fábrica de juguetes, tres robots descatalogados cobran vida cada noche para cumplir el último deseo de una niña: recuperar el robot más antiguo del mundo antes de que lo desguacen.',
      },
      {
        title: 'Medianoche en Oporto', genre: 'Romance', durationMin: 104, releaseYear: 2025,
        director: 'Rita Vázquez', ratingAge: '7', posterHue: 'ec4899', status: 'now_showing', featured: false,
        tagline: 'El tren sale a medianoche. Ella no quiere subir.',
        synopsis: 'Dos desconocidos coinciden cada noche en el último tranvía de Oporto. Él escribe guiones que nadie rueda; ella restaura azulejos antiguos. Durante siete noches, la ciudad se convierte en el decorado de una historia que ninguno se atreve a escribir.',
      },
      {
        title: 'La Casa de las Mareas', genre: 'Misterio', durationMin: 117, releaseYear: 2026,
        director: 'Sofía Landa', ratingAge: '12', posterHue: '8b5cf6', status: 'now_showing', featured: false,
        tagline: 'La casa aparece dos veces al día.',
        synopsis: 'Una restauradora llega a una casa señorial gallega que solo es accesible con la marea baja. Pronto descubre que la casa cambia con cada marea: puertas que no estaban, pasillos que se alargan, y un diario que narra su propia llegada, día a día, antes de que ocurriera.',
      },
      {
        title: 'Tierra de Ceniza', genre: 'Western', durationMin: 129, releaseYear: 2026,
        director: 'Gonzalo Mir', ratingAge: '16', posterHue: '78716c', status: 'coming_soon', featured: false,
        tagline: 'El polvo lo cubre todo. Menos la deuda.',
        synopsis: 'Tras el incendio que arrasó su valle, una ganadera debe cruzar el territorio de una compañía ferroviaria que reclama sus tierras. Western crepuscular sobre deudas que no se pagan con balas.',
      },
      {
        title: 'El Enigma Kepler', genre: 'Documental', durationMin: 89, releaseYear: 2026,
        director: 'Nora Prado', ratingAge: 'TP', posterHue: '0ea5e9', status: 'coming_soon', featured: false,
        tagline: 'Cuatro siglos después, Kepler sigue teniendo razón.',
        synopsis: 'Documental que sigue a un equipo de astrofísicos mientras verifican en el telescopio espacial las predicciones que Johannes Kepler escribió a mano en 1619.',
      },
    ];
    const movies: Movie[] = [];
    for (const m of movieData) {
      movies.push(
        (await this.moviesRepo.save(this.moviesRepo.create(m as any))) as unknown as Movie,
      );
    }

    // ---- Salas ----
    const screenDefs = [
      { name: 'Sala 1', rows: 8, cols: 12, premiumRows: 2, premiumSurcharge: 2.5, screenSurcharge: 0 },
      { name: 'Sala 2', rows: 7, cols: 10, premiumRows: 1, premiumSurcharge: 2, screenSurcharge: 0 },
      { name: 'Sala 3', rows: 6, cols: 9, premiumRows: 1, premiumSurcharge: 1.5, screenSurcharge: 0 },
      { name: 'Sala IMAX', rows: 9, cols: 14, premiumRows: 2, premiumSurcharge: 4, screenSurcharge: 3 },
    ];
    const screens: Screen[] = [];
    for (const s of screenDefs) {
      const screen = (await this.screensRepo.save(this.screensRepo.create(s as any))) as unknown as Screen;
      screens.push(screen);
      // Butacas: id secuencial = (row-1)*cols + number
      const seats: Seat[] = [];
      for (let row = 1; row <= screen.rows; row++) {
        for (let num = 1; num <= screen.cols; num++) {
          seats.push({ screenId: screen.id, row, number: num, isWheelchair: false } as Seat);
        }
      }
      await this.seatsRepo.save(seats as any);
    }

    // ---- Funciones: próximos 3 días para las 6 en cartelera ----
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const times = [
      { hour: 16, min: 30 }, { hour: 19, min: 0 }, { hour: 21, min: 45 }, { hour: 23, min: 30 },
    ];
    const showtimes: Showtime[] = [];
    for (let day = 0; day < 3; day++) {
      for (let mi = 0; mi < movies.length; mi++) {
        const movie = movies[mi];
        if (movie.status !== 'now_showing') continue;
        const start = new Date(now.getTime() + day * dayMs);
        start.setHours(times[mi % 4].hour, times[mi % 4].min, 0, 0);
        if (start.getTime() <= now.getTime()) start.setTime(start.getTime() + dayMs);
        const screen = screens[mi % screens.length];
        const isImax = movie.genre === 'Ciencia ficción' && mi === 0;
        const st = (await this.showtimesRepo.save(
          this.showtimesRepo.create({
            movieId: movie.id,
            screenId: isImax ? screens[3].id : screen.id,
            startTime: start,
            basePrice: isImax ? 11.5 : 7.5 + (mi % 3) * 0.5,
            language: mi % 3 === 0 ? 'ES' : mi % 3 === 1 ? 'VOSE' : 'VO',
            format: isImax ? 'IMAX' : mi % 2 === 0 ? '2D' : '3D',
            status: 'active',
          } as any),
        )) as unknown as Showtime;
        showtimes.push(st);
      }
    }

    // ---- Reservas seed (consistentes: misma fuente de verdad que el mapa) ----
    // ids globales de butaca: offset por salas anteriores + (fila-1)*cols + num
    const seatIdFor = (screen: Screen, row: number, num: number) => {
      let offset = 0;
      for (const s of screens) {
        if (s.id === screen.id) break;
        offset += s.rows * s.cols;
      }
      return offset + (row - 1) * screen.cols + num;
    };

    const st1 = showtimes[0]; // Nébula Roja IMAX
    const imax = screens[3];
    await this.saveBooking(demo, st1, [seatIdFor(imax, 5, 6), seatIdFor(imax, 5, 7)], 'confirmed');
    await this.saveBooking(demo, st1, [seatIdFor(imax, 4, 1)], 'used');
    await this.saveBooking(maria, st1, [seatIdFor(imax, 6, 4), seatIdFor(imax, 6, 5), seatIdFor(imax, 6, 6)], 'confirmed');

    // Función 2 (Vector): demo confirmed
    if (showtimes.length > 1) {
      const st2 = showtimes[1];
      const screen2 = screens[st2.screenId - 1] ?? (await this.screensRepo.findOne({ where: { id: st2.screenId } }))!;
      await this.saveBooking(demo, st2, [seatIdFor(screen2, 3, 5), seatIdFor(screen2, 3, 6)], 'confirmed');
    }
    // Una pendiente que expira en 9 minutos para que el demo pueda confirmarla o ver la expiración
    if (showtimes.length > 2) {
      const st3 = showtimes[2];
      const screen3 = screens[st3.screenId - 1] ?? (await this.screensRepo.findOne({ where: { id: st3.screenId } }))!;
      const pending = await this.saveBooking(demo, st3, [seatIdFor(screen3, 2, 3), seatIdFor(screen3, 2, 4)], 'pending');
      this.logger.log(`Reserva pendiente demo #${pending.id} (expira en 9 min)`);
    }

    // ---- Reseñas ----
    const reviewData: Array<[Movie, User, number, string]> = [
      [movies[0], maria, 5, 'Visualmente impresionante y con una banda sonora que se te queda dentro. La escena de la puerta en el tercer acto es de lo mejor que he visto este año.'],
      [movies[0], lucas, 4, 'Buen sci-fi de suspense, aunque el final se resuelve demasiado rápido. La fotografía de la estación orbital merece la pantalla IMAX.'],
      [movies[1], maria, 4, 'Thriller urbano muy bien medido. El ritmo no decae en ningún momento y la protagonista lo borda.'],
      [movies[1], demo, 5, 'Me enganchó desde el primer plano. El uso de las cámaras de metro como narrador es una idea excelente.'],
      [movies[2], lucas, 4, 'Una película pequeña con un corazón enorme. La relación entre Antón y la geóloga está escrita con mucha delicadeza.'],
      [movies[2], demo, 5, 'Salí del cine con lágrimas. El faro es un personaje más.'],
      [movies[3], demo, 4, 'Mis hijos no pararon de reírse. Los robots tienen mucho carisma y el mensaje final es precioso.'],
      [movies[3], maria, 5, 'La animación es una pasada y la historia es más profunda de lo que parece. Perfecta para ver en familia.'],
      [movies[4], lucas, 3, 'Bonita pero predecible. Aun así, Oporto está tan bien retratada que merece la pena.'],
      [movies[5], maria, 4, 'Misterio gallego con atmósfera de novela gótica. La premisa de la casa que cambia con las mareas es originalísima.'],
    ];
    for (const [movie, user, rating, comment] of reviewData) {
      await this.reviewsRepo.save(
        this.reviewsRepo.create({ movieId: movie.id, userId: user.id, rating, comment } as any) as any,
      );
    }

    this.logger.log(`Seed completo: ${movies.length} películas, ${screens.length} salas, ${showtimes.length} funciones, ${screenDefs.reduce((a, s) => a + s.rows * s.cols, 0)} butacas`);
  }

  private async saveBooking(user: User, st: Showtime, seatIds: number[], status: 'confirmed' | 'used' | 'pending') {
    const screen = (await this.screensRepo.findOne({ where: { id: st.screenId } }))!;
    const seats = await this.seatsRepo.findBy({ id: seatIds[0] as number });
    const seatRow = seats[0]?.row ?? 1;
    const isPremiumSeat = seatRow <= screen.premiumRows;
    const perSeat = st.basePrice + screen.screenSurcharge + (isPremiumSeat ? screen.premiumSurcharge : 0);
    const total = seatIds.reduce((acc) => acc + perSeat, 0);
    const booking = (await this.bookingsRepo.save(
      this.bookingsRepo.create({
        userId: user.id,
        showtimeId: st.id,
        seatIds,
        totalAmount: Math.round(total * 100) / 100,
        status,
        expiresAt: status === 'pending' ? new Date(Date.now() + 9 * 60 * 1000) : null,
        code: status === 'confirmed' || status === 'used' ? this.codeFor(st.id, seatIds[0]) : null,
      } as any),
    )) as unknown as Booking;
    // Puntos consistentes con la regla de negocio: 10 pts por butaca confirmada/usada
    if (status !== 'pending') {
      user.points += seatIds.length * 10;
      await this.usersRepo.save(user);
    }
    return booking;
  }

  private codeFor(showtimeId: number, seatId: number): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let seed = showtimeId * 7919 + seatId * 104729;
    let code = 'CNV-';
    for (let i = 0; i < 6; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      code += chars[Math.floor((seed / 233280) * chars.length)];
    }
    return code;
  }
}
