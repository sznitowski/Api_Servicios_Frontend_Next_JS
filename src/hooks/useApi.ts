"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { API_BASE } from "@/lib/config";

/**
 * Construye una URL absoluta a la API:
 * - Si path ya es absoluta (http/https) la devuelve tal cual.
 * - Si el path empieza con /api, concatena al host.
 * - Si el host ya termina en /api, evita duplicarlo.
 */
function buildApiUrl(base: string, path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const cleanBase = base.replace(/\/$/, "");
  const endsWithApi = /\/api$/i.test(cleanBase);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (cleanPath.startsWith("/api")) return `${cleanBase}${cleanPath}`;
  return endsWithApi ? `${cleanBase}${cleanPath}` : `${cleanBase}/api${cleanPath}`;
}

export function useApi() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const { token, logout } = useAuth();

  /**
   * apiFetch: igual que fetch, pero:
   * - agrega base URL y (si hace falta) /api
   * - setea Authorization si hay token (o overrideToken)
   * - Content-Type JSON por defecto (excepto FormData)
   */
  const apiFetch = useCallback(
    async (
      path: string,
      init: RequestInit = {},
      overrideToken?: string | null
    ) => {
      const url = buildApiUrl(API_BASE, path);

      const headers = new Headers(init.headers || {});
      // Content-Type por defecto sólo si NO es FormData y NO está seteado
      const isFormData =
        typeof FormData !== "undefined" && init.body instanceof FormData;
      if (!isFormData && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      if (!headers.has("Accept")) headers.set("Accept", "application/json");

      const t = overrideToken ?? token ?? null;
      if (t && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${t}`);
      }

      return fetch(url, {
        credentials: "omit",
        ...init,
        headers,
      });
    },
    [token]
  );

  /**
   * api: wrapper typed con manejo de errores:
   * - 401 => hace logout y redirige a /login?next=pathname
   * - 204 => devuelve undefined
   * - intenta devolver JSON tipado
   */
  const api = useCallback(
    async <T>(path: string, init: RequestInit = {}, overrideToken?: string | null): Promise<T> => {
      const res = await apiFetch(path, init, overrideToken);

      if (res.status === 401) {
        // sesión vencida: limpiar y mandar a login con next
        await logout();
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        throw new Error("No autorizado");
      }

      if (!res.ok) {
        let msg = `${res.status} ${res.statusText}`;
        try {
          const text = await res.text();
          msg = text || msg;
        } catch {}
        throw new Error(msg);
      }

      if (res.status === 204) return undefined as T;
      // Si el body viene vacío, evitar error de json()
      const ct = res.headers.get("Content-Type") || "";
      if (!ct.toLowerCase().includes("json")) {
        // devuelve texto si no es JSON

        return (await res.text()) as T;
      }
      return (await res.json()) as T;
    },
    [apiFetch, logout, router, pathname]
  );

  // Helpers opcionales, por si te gustan (no son obligatorios)
  const get = useCallback(<T>(path: string) => api<T>(path), [api]);
  const post = useCallback(<T>(path: string, body?: any) => api<T>(path, { method: "POST", body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }), [api]);
  const put = useCallback(<T>(path: string, body?: any) => api<T>(path, { method: "PUT", body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }), [api]);
  const del = useCallback(<T>(path: string): Promise<T> => api<T>(path, { method: "DELETE" }), [api]);

  return { apiFetch, api, get, post, put, del };
}
