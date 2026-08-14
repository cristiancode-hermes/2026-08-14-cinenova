import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export function authGuard() {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthed) return true;
  return router.createUrlTree(['/auth/login'], { queryParams: { next: router.url } });
}
