import { HttpErrorResponse } from '@angular/common/http';

export function apiError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as { message?: string | string[] } | null;
    if (body?.message) {
      return Array.isArray(body.message) ? body.message.join('. ') : body.message;
    }
    if (err.status === 401) return 'Sesión no válida — vuelve a entrar';
    if (err.status === 409) return 'Conflicto: prueba de nuevo';
    if (err.status === 0) return 'No se pudo conectar con el servidor';
    return `Error ${err.status}`;
  }
  return 'Error inesperado';
}

export function eur(v: number): string {
  return `${v.toFixed(2).replace('.', ',')} €`;
}

/** Zona horaria del cine (España) — las horas se muestran siempre en hora local del cine,
 *  no en la del navegador, para que la hora sea estable y correcta para todos. */
const TZ = 'Europe/Madrid';

export function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ });
}

export function fmtDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', timeZone: TZ });
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', timeZone: TZ })} · ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: TZ })}`;
}
