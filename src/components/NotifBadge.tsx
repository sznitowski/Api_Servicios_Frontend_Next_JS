"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useSSE } from "@/hooks/useSSE";
import { useAuth } from "@/lib/auth";

export default function NotifBadge() {
  const { token } = useAuth();
  const { api } = useApi();
  const { lastEvent, connected } = useSSE("/api/notifications/stream");
  const [count, setCount] = useState<number>(0);

  async function refresh() {
    try {
      // Soporta { count } o { total } según backend
      const data = await api<{ count?: number; total?: number }>("/notifications/me/count");
      const n = (data.count ?? data.total ?? 0) as number;
      setCount(n);
    } catch {
      // ignorar
    }
  }

  // 1) Carga inicial cuando hay token
  useEffect(() => {
    if (!token) { setCount(0); return; }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // 2) Al llegar cualquier evento por SSE, re-consultar el contador (más fiable que "sumar 1")
  useEffect(() => {
    if (!lastEvent) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvent]);

  // 3) Puente global opcional (mantengo tu compat)
  useEffect(() => {
    const onInc = (e: Event) =>
      setCount((c) => c + Number((e as CustomEvent).detail || 1));
    const onDec = (e: Event) =>
      setCount((c) => Math.max(0, c - Number((e as CustomEvent).detail || 1)));

    window.addEventListener("notif:inc", onInc as EventListener);
    window.addEventListener("notif:decrease", onDec as EventListener);

    const onSeenCompat = (e: Event) =>
      setCount((c) => Math.max(0, c - Number((e as CustomEvent).detail || 1)));
    window.addEventListener("notif:seen", onSeenCompat as EventListener);

    return () => {
      window.removeEventListener("notif:inc", onInc as EventListener);
      window.removeEventListener("notif:decrease", onDec as EventListener);
      window.removeEventListener("notif:seen", onSeenCompat as EventListener);
    };
  }, []);

  if (!token) return null;

  return (
    <Link href="/notifications" style={{ position: "relative", display: "inline-block" }}>
      🔔
      <span
        style={{
          position: "absolute",
          top: -8,
          right: -12,
          background: connected ? "#ef4444" : "#9ca3af",
          color: "white",
          padding: "2px 6px",
          borderRadius: 999,
          fontSize: 12,
          minWidth: 18,
          textAlign: "center",
        }}
        title={connected ? "Conectado a SSE" : "Desconectado de SSE"}
      >
        {count}
      </span>
    </Link>
  );
}
