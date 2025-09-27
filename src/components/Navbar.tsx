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

  useEffect(() => {
    let alive = true;

    if (!token) {
      setMe(null);
      return;
    }

    // Traemos el usuario autenticado solo si hay token
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
      <Link href="/notifications">Requests</Link>
      <Link href="/ai">AI</Link>

      <div className="ml-auto flex items-center gap-4">
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
      </div>
    </nav>
  );
}
