"use client";

import { useEffect, useState } from "react";
import { api, API_BASE } from "@/lib/config";
import { useSSE } from "@/hooks/useSSE";
import { useAuth } from "@/app/auth/AuthContext";


export default function NotifBadge() {
  const { token } = useAuth();
  const [count, setCount] = useState<number>(0);

  // URL del SSE con token en query (el guard lo acepta)
  const sseUrl = token
    ? `${API_BASE}/notifications/stream?access_token=${token}`
    : "";

  // ⚠️ El hook debe tolerar url vacía/no válida y no conectarse.
  const { lastEvent, connected } = useSSE(sseUrl);

  const refreshCount = async () => {
    if (!token) return;
    try {
      const { total } = await api<{ total: number }>(
        "/notifications/me/count",
        {},
        token
      );
      setCount(total);
    } catch {
      // noop: ignoramos errores del badge
    }
  };

  useEffect(() => {
    // carga inicial apenas tengamos token
    refreshCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    // cada vez que llega un evento, incrementamos el badge
    if ((lastEvent as any)?.id || (lastEvent as any)?.type) {
      setCount((c) => c + 1);
    }
  }, [lastEvent]);

  return (
    <a
      href="/notifications"
      style={{ position: "relative", display: "inline-block", marginLeft: 16 }}
      title={connected ? "Conectado a notificaciones" : "Desconectado"}
    >
      🔔
      <span
        style={{
          position: "absolute",
          top: -8,
          right: -10,
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
    </a>
  );
}
