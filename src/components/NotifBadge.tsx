"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useSSE } from "@/hooks/useSSE";

export default function NotifBadge() {
  const { apiFetch } = useApi();
  const [count, setCount] = useState<number>(0);
  const { lastEvent, connected } = useSSE("/api/notifications/stream");

  // 1) Carga inicial
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/notifications/me/count");
        if (res.ok) {
          const { total } = await res.json();
          setCount(total ?? 0);
        }
      } catch {
        /* noop */
      }
    })();
  }, [apiFetch]);

  // 2) SSE: si llega una notificación (tiene id + message|type), incrementamos
  useEffect(() => {
    if (!lastEvent) return;
    try {
      const ev = lastEvent as any;
      if (ev?.id && (ev?.message || ev?.type)) {
        setCount((c) => c + 1);
      }
    } catch {
      /* noop */
    }
  }, [lastEvent]);

  // 3) Puente global: otras pantallas pueden ajustar el badge sin recargar
  //    - notif:decrease -> resta N (p.ej., al marcar como visto)
  //    - notif:inc     -> suma N (lo dejo por compatibilidad si ya lo usabas)
  useEffect(() => {
    const onInc = (e: Event) =>
      setCount((c) => c + Number((e as CustomEvent).detail || 1));
    const onDec = (e: Event) =>
      setCount((c) => Math.max(0, c - Number((e as CustomEvent).detail || 1)));

    window.addEventListener("notif:inc", onInc as EventListener);
    window.addEventListener("notif:decrease", onDec as EventListener);

    // Compatibilidad hacia atrás: si en algún lado sigue emitiendo "notif:seen"
    const onSeenCompat = (e: Event) =>
      setCount((c) => Math.max(0, c - Number((e as CustomEvent).detail || 1)));
    window.addEventListener("notif:seen", onSeenCompat as EventListener);

    return () => {
      window.removeEventListener("notif:inc", onInc as EventListener);
      window.removeEventListener("notif:decrease", onDec as EventListener);
      window.removeEventListener("notif:seen", onSeenCompat as EventListener);
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
