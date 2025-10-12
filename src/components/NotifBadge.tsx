"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useSSE } from "@/hooks/useSSE";
import { useAuth } from "@/lib/auth";

/**
 * Campanita + badge de notificaciones sin <Link> interno.
 * Evitamos hydration mismatch: no renderiza hasta después del mount.
 */
export default function NotifBadge() {
  const { token } = useAuth();
  const { api } = useApi();
  const { lastEvent, connected } = useSSE("/api/notifications/stream");
  const [count, setCount] = useState<number>(0);

  // 🚫 Importante: bloquear render hasta que monte en cliente
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
    if (!mounted) return;       // <- evita ejecutar antes del mount
    if (!token) { setCount(0); return; }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, token]);

  // 2) Al llegar cualquier evento por SSE, re-consultar el contador
  useEffect(() => {
    if (!mounted || !lastEvent) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, lastEvent]);

  // 3) Puente global opcional (compat)
  useEffect(() => {
    if (!mounted) return;
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
  }, [mounted]);

  // SSR: null. Primer render en cliente: null. Luego del mount, si hay token, renderiza.
  if (!mounted || !token) return null;

  return (
    <span
      style={{ position: "relative", display: "inline-block" }}
      className="align-middle"
      aria-label="Notificaciones"
      title={connected ? "Conectado a SSE" : "Desconectado de SSE"}
    >
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
      >
        {count}
      </span>
    </span>
  );
}
