"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/hooks/useApi";
import NotifBadge from "./NotifBadge";

type Me = { id: number; email: string; name?: string; role?: string };

export default function Navbar() {
  const { token, logout } = useAuth();
  const { api } = useApi();
  const [me, setMe] = useState<Me | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    let alive = true;
    if (!token) {
      setMe(null);
      return;
    }
    api<Me>("/auth/me")
      .then((u) => alive && setMe(u))
      .catch(() => alive && setMe(null));
    return () => {
      alive = false;
    };
  }, [token, api]);

  return (
    <nav className="flex items-center gap-4 p-3 border-b">
      <Link href="/">Servicios</Link>
      <Link href="/dashboard">Inicio</Link>
      <Link href="/requests">Pedidos</Link>
      <Link href="/notifications">Notificaciones</Link>
      <Link href="/ai">AI</Link>

      {/* Evitamos mismatch entre servidor y cliente */}
      <div className="ml-auto flex items-center gap-4" suppressHydrationWarning>
        {!hydrated ? null : (
          <>
            {token && <NotifBadge />}
            {me ? (
              <>
                <span className="text-sm text-gray-600">{me.email}</span>
                <button onClick={logout} className="border px-3 py-1 rounded">
                  Salir
                </button>
              </>
            ) : (
              <Link href="/login">Ingresar</Link>
            )}
          </>
        )}
      </div>
    </nav>
  );
}
