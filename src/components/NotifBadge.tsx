"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useSSE } from "@/hooks/useSSE";

export default function NotifBadge() {
  const { apiFetch } = useApi();
  const [count, setCount] = useState<number>(0);
  const { lastEvent, connected } = useSSE("/api/notifications/stream");

  // Carga inicial del contador
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/notifications/me/count");
        if (res.ok) {
          const { total } = await res.json();
          setCount(total ?? 0);
        }
      } catch {
        // noop
      }
    })();
  }, [apiFetch]);

  // Al llegar una notificación nueva por SSE, incrementamos
  useEffect(() => {
    if (!lastEvent) return;
    try {
      const ev = lastEvent as any;
      // Heurística simple: si parece notificación (id + message|type), sumamos 1
      if (ev?.id && (ev?.message || ev?.type)) {
        setCount((c) => c + 1);
      }
    } catch {
      // noop
    }
  }, [lastEvent]);

  // Puente mínimo entre páginas: otros componentes pueden ajustar el badge
  useEffect(() => {
    const onInc = (e: Event) =>
      setCount((c) => c + Number((e as CustomEvent).detail || 1));
    const onSeen = (e: Event) =>
      setCount((c) => Math.max(0, c - Number((e as CustomEvent).detail || 1)));

    window.addEventListener("notif:inc", onInc as EventListener);
    window.addEventListener("notif:seen", onSeen as EventListener);
    return () => {
      window.removeEventListener("notif:inc", onInc as EventListener);
      window.removeEventListener("notif:seen", onSeen as EventListener);
    };
  }, []);

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
