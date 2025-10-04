"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/hooks/useApi";
import { gotoHomeForUser } from "@/lib/routeAfterAuth";

type Me = {
  id: number;
  email: string;
  name?: string;
  role?: string | null;
};

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const next = useMemo(() => search.get("next"), [search]);

  const { login, token } = useAuth();
  const { api } = useApi();

  const [email, setEmail] = useState("client2@demo.com");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [capsOn, setCapsOn] = useState(false);

  // Si ya estoy logueado, traigo mi rol y redirijo
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token) return;
      try {
        const me = await api<Me>("/auth/me");
        if (!alive) return;
        gotoHomeForUser(router, me, next);
      } catch {
        // si falla, me quedo en login
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, api, router, next]);

  function onKeyUp(e: React.KeyboardEvent<HTMLInputElement>) {
    setCapsOn(e.getModifierState?.("CapsLock") ?? false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setErr(null);
    setLoading(true);
    try {
      // Solo hacemos login; el useEffect anterior se encarga de redirigir
      // cuando el token ya esté persistido y disponible para el api client.
      await login(email.trim(), password);
    } catch (e: any) {
      setErr(e?.message ?? "No autorizado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] grid place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl border p-6 shadow-sm bg-white">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">Ingresá</h1>
          <p className="text-sm text-gray-500">Usá las credenciales demo</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm text-gray-600">Email</span>
            <input
              type="email"
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black/20"
              placeholder="email@demo.com"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-gray-600">Password</span>
            <input
              type="password"
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black/20"
              placeholder="******"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyUp={onKeyUp}
            />
            {capsOn && (
              <span className="mt-1 block text-xs text-amber-600">
                Bloq Mayús activado
              </span>
            )}
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black px-4 py-2 font-medium text-white transition-opacity disabled:opacity-60"
          >
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        {err && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {err}
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-2 text-xs text-gray-500">
          <div className="rounded-lg border p-2">
            <div className="font-medium text-gray-700">Cliente demo</div>
            <div>client2@demo.com / 123456</div>
          </div>
          <div className="rounded-lg border p-2">
            <div className="font-medium text-gray-700">Proveedor demo</div>
            <div>provider1@demo.com / 123456</div>
          </div>
        </div>
      </div>
    </div>
  );
}
