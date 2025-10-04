"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/hooks/useApi";
import Spinner from "@/components/ui/Spinner";
import { gotoHomeForUser } from "@/lib/routeAfterAuth";

type Role = "CLIENT" | "PROVIDER" | "ADMIN";
type MeLite = { id: number; role?: string | null };

export function RequireAuth({
  children,
  allow,
}: {
  children: React.ReactNode;
  allow?: Role[]; // si no pasás allow => solo requiere login
}) {
  const { token } = useAuth();
  const { api } = useApi();
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      // sin token => ir a login con next
      if (!token) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      try {
        const me = await api<MeLite>("/auth/me");
        if (!alive) return;

        const role = String(me?.role || "").toUpperCase() as Role | "";
        if (allow && allow.length > 0 && !allow.includes(role as Role)) {
          // logueado pero no tiene el rol correcto => llévalo a su home
          gotoHomeForUser(router, me, null);
          return;
        }
      } finally {
        if (alive) setChecking(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, api, router, pathname, allow]);

  if (checking) {
    return (
      <div className="min-h-[40vh] grid place-items-center">
        <Spinner />
      </div>
    );
  }
  return <>{children}</>;
}
