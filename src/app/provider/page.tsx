"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/lib/auth";

export default function ProvidersIndexRedirect() {
  const router = useRouter();
  const { token } = useAuth();
  const { api } = useApi();

  useEffect(() => {
    (async () => {
      if (!token) { router.replace("/login"); return; }
      try {
        const me = await api<{ id: number }>("/auth/me");
        router.replace(me?.id ? `/providers/${me.id}` : "/login");
      } catch { router.replace("/login"); }
    })();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div className="p-6">Redirigiendo…</div>;
}
