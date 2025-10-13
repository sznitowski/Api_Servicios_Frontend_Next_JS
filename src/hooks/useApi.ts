"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { API_BASE } from "@/lib/config";

function buildApiUrl(base: string, path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const cleanBase = base.replace(/\/$/, "");
  const endsWithApi = /\/api$/i.test(cleanBase);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (cleanPath.startsWith("/api")) return `${cleanBase}${cleanPath}`;
  return endsWithApi ? `${cleanBase}${cleanPath}` : `${cleanBase}/api${cleanPath}`;
}

type RatingTarget = "provider" | "client";

export function useApi() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const { token, logout } = useAuth();

  const apiFetch = useCallback(
    async (path: string, init: RequestInit = {}, overrideToken?: string | null) => {
      const url = buildApiUrl(API_BASE, path);

      const headers = new Headers(init.headers || {});
      const method = (init.method || "GET").toUpperCase();
      const hasBody = !!init.body;
      const isFormData =
        typeof FormData !== "undefined" && init.body instanceof FormData;

      // Solo setear Content-Type JSON si corresponde
      if (!isFormData && hasBody && method !== "GET" && method !== "HEAD" && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      if (!headers.has("Accept")) headers.set("Accept", "application/json");

      const t = overrideToken ?? token ?? null;
      if (t && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${t}`);

      return fetch(url, {
        credentials: "omit", // ok para Bearer
        ...init,
        headers,
      });
    },
    [token]
  );

  const api = useCallback(
    async <T>(path: string, init: RequestInit = {}, overrideToken?: string | null): Promise<T> => {
      const res = await apiFetch(path, init, overrideToken);

      if (res.status === 401) {
        await logout();
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        throw new Error("No autorizado");
      }

      if (!res.ok) {
        let msg = `${res.status} ${res.statusText}`;
        try {
          const ct = res.headers.get("Content-Type") || "";
          if (ct.toLowerCase().includes("json")) {
            const j = await res.json();
            msg = Array.isArray(j?.message) ? j.message.join(", ") : (j?.message || msg);
          } else {
            const t = await res.text();
            msg = t || msg;
          }
        } catch { /* noop */ }
        throw new Error(msg);
      }

      if (res.status === 204) return undefined as T;

      const ct = res.headers.get("Content-Type") || "";
      if (!ct.toLowerCase().includes("json")) {
        return (await res.text()) as T;
      }
      return (await res.json()) as T;
    },
    [apiFetch, logout, router, pathname]
  );

  const get = useCallback(<T>(path: string) => api<T>(path), [api]);

  // ⬇️ Ajuste clave: no enviar "{}" cuando body es undefined/null
  const post = useCallback(
    <T>(path: string, body?: any) =>
      api<T>(path, {
        method: "POST",
        body:
          body instanceof FormData
            ? body
            : body === undefined || body === null
              ? undefined
              : JSON.stringify(body),
      }),
    [api]
  );

  const put = useCallback(
    <T>(path: string, body?: any) =>
      api<T>(path, {
        method: "PUT",
        body:
          body instanceof FormData
            ? body
            : body === undefined || body === null
              ? undefined
              : JSON.stringify(body),
      }),
    [api]
  );

  const del = useCallback(<T>(path: string): Promise<T> => api<T>(path, { method: "DELETE" }), [api]);

  /* ============================================================
   * Métodos específicos que usa la UI
   * ============================================================ */

  // Perfil
  const me = useCallback(() => get("/me"), [get]);

  // Requests
  const requestById = useCallback((id: number) => get(`/requests/${id}`), [get]);
  const requestTimeline = useCallback((id: number) => get(`/requests/${id}/timeline`), [get]);

  // Historial de calificaciones del request (por target)
  const ratings = useCallback(
    (id: number, target: RatingTarget, limit = 1) =>
      get(`/requests/${id}/ratings?target=${target}&limit=${limit}`),
    [get]
  );

  // Proveedor propone/cambia precio (usa { amount }, NO { price })
  // Proveedor propone/cambia precio
  const offerRequest = useCallback(
    (id: number, priceOffered: number) =>
      post(`/requests/${id}/offer`, { priceOffered }),
    [post]
  );



  // Aceptar precio ya ofrecido por la otra parte (SIN body)
  const acceptRequest = useCallback(
    (id: number) => post(`/requests/${id}/accept`),
    [post]
  );

  // Flujo de ejecución
  const startRequest = useCallback((id: number) => post(`/requests/${id}/start`), [post]);
  const completeRequest = useCallback((id: number) => post(`/requests/${id}/complete`), [post]);

  // Calificaciones:
  //  - Cliente → Proveedor: target "provider" (default)
  //  - Proveedor → Cliente: target "client"  (usa query ?target=client)
  const rateRequest = useCallback(
    (id: number, score: number, comment: string, target: RatingTarget = "provider") =>
      post(
        `/requests/${id}/rating${target === "client" ? "?target=client" : ""}`,
        { score, comment }
      ),
    [post]
  );

  return {
    // base
    apiFetch, api, get, post, put, del,
    // extra
    me,
    requestById,
    requestTimeline,
    ratings,
    offerRequest,
    acceptRequest,
    startRequest,
    completeRequest,
    rateRequest,
  };
}
