"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/hooks/useApi";
import { gotoHomeForUser } from "@/lib/routeAfterAuth";

type MeLite = { id: number; role?: string | null };

export default function ProvidersIndexRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const next = search.get("next") ?? undefined;

  const { token } = useAuth();
  const { api } = useApi();

  useEffect(() => {
    let alive = true;

    // 🔒 Ejecutar solo en /providers exacto (no en /providers/[id])
    if (pathname !== "/providers") return;

    (async () => {
      if (!token) {
        router.replace(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
        return;
      }
      try {
        const me = await api<MeLite>("/auth/me");
        if (!alive) return;
        // provider -> /providers/my ; admin -> /dashboard ; client -> /services
        gotoHomeForUser(router, me, undefined);
      } catch {
        router.replace("/login");
      }
    })();

    return () => {
      alive = false;
    };
  }, [token, api, router, pathname, next]);

  return <div className="p-6">Redirigiendo…</div>;
}
