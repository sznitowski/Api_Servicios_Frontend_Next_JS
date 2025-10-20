// src/lib/config.ts
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:5000/api';

type ApiInit = RequestInit & {
  /** Si pasás `json`, se serializa y se setea Content-Type automáticamente */
  json?: unknown;
};

/**
 * Pequeño helper para llamar a la API del backend.
 * - Preprende API_BASE si pasás ruta relativa ("/...").
 * - Agrega Authorization Bearer si viene `token`.
 * - Maneja JSON (request y response).
 */
export async function api<T = any>(
  path: string,
  init: ApiInit = {},
  token?: string | null,
): Promise<T> {
  const url = path.startsWith('http')
    ? path
    : `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };

  // Si se usa `json`, serializamos y seteamos content-type si falta.
  let body = init.body;
  if (init.json !== undefined) {
    body = JSON.stringify(init.json);
    if (!('Content-Type' in headers)) headers['Content-Type'] = 'application/json';
  }

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...init, headers, body });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      message = j?.message || j?.error || message;
    } catch {
      try {
        const txt = await res.text();
        if (txt) message = txt;
      } catch {}
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return (await res.json()) as T;
  return (await res.text()) as any as T;
}
