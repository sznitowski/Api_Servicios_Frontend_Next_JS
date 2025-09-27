"use client";
import { useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { API_BASE } from "@/lib/config";

export function useApi() {
  const { token } = useAuth();

  const apiFetch = useCallback(
    async (path: string, init: RequestInit = {}, overrideToken?: string | null) => {
      const t = overrideToken ?? token ?? null;
      const headers: Record<string, string> = { ...(init.headers as any) };
      if (!headers["Content-Type"] && !(init.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
      }
      if (t) headers["Authorization"] = `Bearer ${t}`;
      return fetch(`${API_BASE}${path}`, { ...init, headers });
    },
    [token]
  );

  const api = useCallback(
    async <T>(path: string, init: RequestInit = {}, overrideToken?: string | null): Promise<T> => {
      const res = await apiFetch(path, init, overrideToken);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return (await res.json()) as T;
    },
    [apiFetch]
  );

  return { apiFetch, api };
}
