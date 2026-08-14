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

export function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function fmtDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} · ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
}
