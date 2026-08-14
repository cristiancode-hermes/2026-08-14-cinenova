import { HttpInterceptorFn } from '@angular/common/http';

const TOKEN_KEY = 'cn_token';

/**
 * Interceptor sin DI: lee el token de localStorage directamente.
 * Inyectar AuthService aquí crea un ciclo (AuthService → HttpClient → interceptor → AuthService) → NG0908.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes('/api/')) return next(req);
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }
  return next(req);
};
