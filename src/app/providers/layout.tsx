"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/lib/auth";
import { RequireAuth } from "@/lib/routeGuards";

type Me = { id: number; role?: string | null };

export default function ProvidersLayout({ children }: { children: React.ReactNode }) {
  // Protegemos TODO /providers/* solo para rol PROVIDER
  return (
    <RequireAuth allow={["PROVIDER"]}>
      <LayoutInner>{children}</LayoutInner>
    </RequireAuth>
  );
}

function LayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const isActive = (href: string) => pathname.startsWith(href);

  const { token } = useAuth();
  const { api } = useApi();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let alive = true;
    if (!token) { setMe(null); return; }
    api<Me>("/auth/me")
      .then((u) => alive && setMe(u))
      .catch(() => alive && setMe(null));
    return () => { alive = false; };
  }, [token, api]);

  return (
    <div className="p-0">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <nav className="container mx-auto flex gap-4 p-3 text-sm">
          <Link
            className={isActive("/providers/open") ? "font-semibold underline" : "hover:underline"}
            href="/providers/open"
          >
            Abiertos cerca
          </Link>
          <Link
            className={isActive("/providers/my") ? "font-semibold underline" : "hover:underline"}
            href="/providers/my"
          >
            Mis trabajos
          </Link>
          {me?.id ? (
            <Link
              className={isActive(`/providers/${me.id}`) ? "font-semibold underline" : "hover:underline"}
              href={`/providers/${me.id}`}
            >
              Ver perfil
            </Link>
          ) : null}
        </nav>
      </div>
      <div className="container mx-auto px-4">{children}</div>
    </div>
  );
}
