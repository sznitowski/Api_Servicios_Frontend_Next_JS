"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/hooks/useApi";
import NotifBadge from "./NotifBadge";

type Role = "ADMIN" | "CLIENT" | "PROVIDER" | string;
type Me = { id: number; email: string; name?: string; role?: Role };

export default function Navbar() {
  const pathname = usePathname();
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

  const isProvider = useMemo(() => me?.role === "PROVIDER", [me]);

  const linkCls = (href: string) =>
    `px-1 ${pathname.startsWith(href) ? "font-semibold underline" : ""}`;

  return (
    <nav className="flex items-center gap-4 p-3 border-b">
      <Link href="/services" className={linkCls("/services")}>Servicios</Link>
      <Link href="/dashboard" className={linkCls("/dashboard")}>Inicio</Link>
      <Link href="/requests" className={linkCls("/requests")}>Pedidos</Link>

      {/* Link exterior a /notifications; NotifBadge ya NO renderiza <Link> */}
      <Link href="/notifications" className={linkCls("/notifications")} prefetch={false}>
        <span className="inline-flex items-center gap-1">
          Notificaciones
          {token && <NotifBadge />}
        </span>
      </Link>

      <Link href="/ai" className={linkCls("/ai")}>AI</Link>

      {/* Enlaces exclusivos de proveedor */}
      {isProvider && (
        <>
          <Link href="/providers/open" className={`${linkCls("/providers/open")} underline`}>
            Abiertos cerca
          </Link>
          <Link href="/providers/my" className={`${linkCls("/providers/my")} underline`}>
            Mis trabajos
          </Link>
        </>
      )}

      {/* Lado derecho: sesión */}
      <div className="ml-auto flex items-center gap-4" suppressHydrationWarning>
        {!hydrated ? null : me ? (
          <>
            {isProvider && (
              <Link
                href={`/providers/${me.id}`}
                className="text-sm underline"
                title="Ver mi perfil público"
              >
                Ver perfil
              </Link>
            )}
            <span className="text-sm text-gray-600">{me.email}</span>
            <button onClick={logout} className="border px-3 py-1 rounded hover:bg-gray-50">
              Salir
            </button>
          </>
        ) : (
          <Link href="/login" className={linkCls("/login")}>Ingresar</Link>
        )}
      </div>
    </nav>
  );
}
