import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/entities';
import type { AuthenticatedUser } from '../common/types';
import { LoginDto, RegisterDto } from '../common/types';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersRepo.findOne({
      where: [{ email: dto.email }, { username: dto.username }],
    });
    if (existing) {
      throw new ConflictException(
        existing.email === dto.email
          ? 'Ya existe una cuenta con ese email'
          : 'Ya existe una cuenta con ese usuario',
      );
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = (await this.usersRepo.save(
      this.usersRepo.create({
        username: dto.username.trim(),
        email: dto.email.trim().toLowerCase(),
        name: dto.name.trim(),
        passwordHash,
      } as any),
    )) as unknown as User;
    return this.toAuth(user);
  }

  async login(dto: LoginDto) {
    const identifier = dto.identifier.trim().toLowerCase();
    const user = await this.usersRepo.findOne({
      where: [{ email: identifier }, { username: dto.identifier.trim() }],
    });
    if (!user) throw new UnauthorizedException('Credenciales incorrectas');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciales incorrectas');
    return this.toAuth(user);
  }

  async me(userId: number): Promise<AuthenticatedUser | null> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      points: user.points,
      role: user.role,
    };
  }

  toAuth(user: User) {
    const payload = { sub: user.id, username: user.username };
    return {
      token: this.jwt.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        points: user.points,
        role: user.role,
      },
    };
  }
}
