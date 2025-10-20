// src/lib/api.ts
import { API_BASE } from './config';

export type FetchOpts = RequestInit & {
  token?: string;
  /** Si pasás `json`, se serializa y se setea Content-Type automáticamente */
  json?: unknown;
};

/**
 * Wrapper liviano (compatible con tu firma anterior) que:
 * - arma la URL completa con API_BASE,
 * - agrega Authorization si pasás `token`,
 * - soporta `json` para serialización automática,
 * - maneja respuestas JSON o texto,
 * - y mantiene `cache: 'no-store'` por defecto.
 */
export async function apiFetch<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const { token, headers, json, ...rest } = opts;

  const url = path.startsWith('http')
    ? path
    : `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;

  const hdrs: Record<string, string> = {
    Accept: 'application/json',
    ...(headers as Record<string, string> | undefined),
  };

  let body = rest.body;
  if (json !== undefined) {
    body = JSON.stringify(json);
    if (!('Content-Type' in hdrs)) hdrs['Content-Type'] = 'application/json';
  }

  if (token) hdrs.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    ...rest,
    headers: hdrs,
    body,
    cache: 'no-store',
  });

  if (!res.ok) {
    let msg = `API ${res.status}`;
    try {
      const j = await res.json();
      msg = j?.message || j?.error || msg;
    } catch {
      try {
        const txt = await res.text();
        if (txt) msg = txt;
      } catch {}
    }
    throw new Error(msg);
  }

  if (res.status === 204) return undefined as T;

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return (await res.json()) as T;
  return (await res.text()) as any as T;
}
