"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/hooks/useApi";
import { gotoHomeForUser } from "@/lib/routeAfterAuth";

type MeLite = { id: number; role?: string | null };

export default function ProvidersIndexRedirect() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") ?? undefined;

  const { token } = useAuth();
  const { api } = useApi();

  useEffect(() => {
    let alive = true;
    (async () => {
      // sin token → a login (respetando next)
      if (!token) {
        const url = next ? `/login?next=${encodeURIComponent(next)}` : "/login";
        router.replace(url);
        return;
      }

      try {
        const me = await api<MeLite>("/auth/me");
        if (!alive) return;
        // si es proveedor → /providers/my ; si es otro rol → su home
        gotoHomeForUser(router, me, undefined);
      } catch {
        router.replace("/login");
      }
    })();

    return () => { alive = false; };
  }, [token, api, router, next]);

  return <div className="p-6">Redirigiendo…</div>;
}
