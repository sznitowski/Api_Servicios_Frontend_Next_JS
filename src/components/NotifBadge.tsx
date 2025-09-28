"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useSSE } from "@/hooks/useSSE";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!; // ej: http://localhost:3000/api

export default function NotifBadge() {
  const { apiFetch } = useApi();
  const { lastEvent, connected } = useSSE(`${API_BASE}/notifications/stream`);
  const [count, setCount] = useState(0);

  useEffect(() => {
    apiFetch("/notifications/me/count")
      .then((r) => r.ok ? r.json() : { total: 0 })
      .then(({ total }) => setCount(total ?? 0))
      .catch(() => {});
  }, [apiFetch]);

  useEffect(() => {
    if (lastEvent?.id || lastEvent?.type) setCount((c) => c + 1);
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
