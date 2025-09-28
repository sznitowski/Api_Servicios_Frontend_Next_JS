"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useSSE } from "@/hooks/useSSE";

export default function NotifBadge() {
  const { api } = useApi();
  const [count, setCount] = useState<number>(0);

  // carga inicial del contador
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { total } = await api<{ total: number }>("/notifications/me/count");
        if (alive) setCount(total);
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, [api]);

  // 🔴 antes: useSSE(`${process.env.NEXT_PUBLIC_API_URL}/notifications/stream`)
  // ✅ ahora: dejamos que useSSE resuelva la base
  const { lastEvent, connected } = useSSE("/notifications/stream");

  useEffect(() => {
    if (lastEvent?.id || lastEvent?.type) {
      setCount((c) => c + 1);
    }
  }, [lastEvent]);

  return (
    <a href="/notifications" style={{ position: "relative", display: "inline-block", marginLeft: 16 }}>
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
