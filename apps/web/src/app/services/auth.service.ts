import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  name: string;
  points: number;
  role: string;
}

const TOKEN_KEY = 'cn_token';
const USER_KEY = 'cn_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  readonly user = signal<AuthUser | null>(this.loadUser());

  readonly showNav = computed(() => !this.router.url.startsWith('/auth'));

  private loadUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }

  get isAuthed() {
    return this.token() !== null;
  }

  async login(identifier: string, password: string) {
    const res = await firstValueFrom(
      this.http.post<{ token: string; user: AuthUser }>('/api/auth/login', { identifier, password }),
    );
    this.apply(res);
    return res.user;
  }

  async register(username: string, email: string, name: string, password: string) {
    const res = await firstValueFrom(
      this.http.post<{ token: string; user: AuthUser }>('/api/auth/register', { username, email, name, password }),
    );
    this.apply(res);
    return res.user;
  }

  async refreshProfile(): Promise<AuthUser | null> {
    if (!this.token()) return null;
    try {
      const res = await firstValueFrom(
        this.http.get<{ user: AuthUser }>('/api/auth/profile'),
      );
      if (res.user) {
        this.user.set(res.user);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      }
      return res.user;
    } catch {
      return null;
    }
  }

  setPoints(points: number) {
    const u = this.user();
    if (u) {
      const next = { ...u, points };
      this.user.set(next);
      localStorage.setItem(USER_KEY, JSON.stringify(next));
    }
  }

  private apply(res: { token: string; user: AuthUser }) {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this.token.set(res.token);
    this.user.set(res.user);
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.token.set(null);
    this.user.set(null);
  }
}
