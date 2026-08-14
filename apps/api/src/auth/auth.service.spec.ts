import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User } from '../entities/entities';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(async (pw: string) => `$2a$10$hashed_${pw}`),
  compare: jest.fn(async (pw: string, hash: string) => hash === `$2a$10$hashed_${pw}`),
}));

const makeUser = (over: Partial<User> = {}): User =>
  ({
    id: 1,
    username: 'demo',
    email: 'demo@cinenova.dev',
    name: 'Demo',
    passwordHash: '$2a$10$hashed_demo1234',
    role: 'customer',
    points: 150,
    createdAt: new Date(),
    ...over,
  }) as User;

describe('AuthService', () => {
  let usersRepo: any;
  let jwt: any;
  let service: AuthService;

  beforeEach(() => {
    usersRepo = {
      findOne: jest.fn(),
      create: jest.fn((x: any) => x),
      save: jest.fn(async (x: any) => ({ id: 7, ...x })),
    };
    jwt = { sign: jest.fn(() => 'jwt-token') };
    service = new AuthService(usersRepo, jwt);
  });

  it('register hashes password and returns token + user', async () => {
    usersRepo.findOne.mockResolvedValue(null);
    const res = await service.register({
      username: 'nuevo',
      email: 'nuevo@cinenova.dev',
      name: 'Nuevo User',
      password: 'secret123',
    });
    expect(res.token).toBe('jwt-token');
    expect(res.user.username).toBe('nuevo');
    expect(res.user.email).toBe('nuevo@cinenova.dev');
    const saved = usersRepo.save.mock.calls[0][0];
    expect(saved.passwordHash).not.toBe('secret123'); // hasheado
    expect(saved.passwordHash.startsWith('$2')).toBe(true);
  });

  it('register rejects duplicate email with 409', async () => {
    usersRepo.findOne.mockResolvedValue(makeUser());
    await expect(
      service.register({ username: 'x', email: 'demo@cinenova.dev', name: 'X', password: 'secret123' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('register rejects duplicate username with 409', async () => {
    usersRepo.findOne.mockResolvedValue(makeUser());
    await expect(
      service.register({ username: 'demo', email: 'other@cinenova.dev', name: 'X', password: 'secret123' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('login by username works and lowercases identifier for email lookup', async () => {
    usersRepo.findOne.mockResolvedValue(makeUser());
    const res = await service.login({ identifier: 'demo', password: 'demo1234' });
    expect(res.token).toBe('jwt-token');
    expect(res.user.email).toBe('demo@cinenova.dev');
    // buscar primero por email lowercased, luego por username
    const first = usersRepo.findOne.mock.calls[0][0];
    expect(first.where[0]).toEqual({ email: 'demo' });
    expect(first.where[1]).toEqual({ username: 'demo' });
  });

  it('login with wrong password → 401', async () => {
    usersRepo.findOne.mockResolvedValue(makeUser());
    await expect(service.login({ identifier: 'demo', password: 'wrong' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('login with unknown user → 401', async () => {
    usersRepo.findOne.mockResolvedValue(null);
    await expect(service.login({ identifier: 'ghost', password: 'x' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('me returns sanitized user without passwordHash', async () => {
    usersRepo.findOne.mockResolvedValue(makeUser());
    const me = await service.me(1);
    expect(me).not.toBeNull();
    expect(me!.username).toBe('demo');
    expect((me as any).passwordHash).toBeUndefined();
  });

  it('toAuth signs payload with sub and username', () => {
    const u = makeUser();
    service.toAuth(u);
    expect(jwt.sign).toHaveBeenCalledWith({ sub: 1, username: 'demo' });
  });
});
