"use client";

import { useEffect, useMemo, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useSSE } from "@/hooks/useSSE";
import { useAuth } from "@/lib/auth";

type Notif = {
  id: number;
  type: string;
  message: string;
  createdAt: string;
  seenAt?: string | null;
  request?: { id: number; title?: string; status?: string | null } | null;
};

type ListResp = {
  items: Notif[];
  meta: { page: number; limit: number; total: number; pages: number };
};

const MARK_SEEN_URL = "/notifications/me/seen"; // si tu backend usa otra, cambiá acá

export default function NotificationsPage() {
  const { token } = useAuth();
  const { api, apiFetch } = useApi();

  const [items, setItems] = useState<Notif[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  // SSE compatible con nuestro hook (agrega token y resuelve absoluta)
  const sseUrl = useMemo(() => "/api/notifications/stream", []);
  const { lastEvent } = useSSE(sseUrl);

  // -------- carga inicial / paginación --------
  useEffect(() => {
    if (!token) return;

    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await api<ListResp>(`/notifications/me?page=${page}&limit=10`);
        if (!alive) return;
        setItems(data.items ?? []);
        setPages(data.meta?.pages ?? 1);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token, page, api]);

  // -------- SSE: prepend notificación nueva --------
  useEffect(() => {
    if (!lastEvent) return;
    try {
      const ev = lastEvent as any;
      // Heurística: si pinta a Notif, la agregamos arriba
      if (ev?.id && (ev?.message || ev?.type)) {
        const n: Notif = {
          id: ev.id,
          type: String(ev.type ?? "UNKNOWN"),
          message: String(ev.message ?? ""),
          createdAt: ev.createdAt ?? new Date().toISOString(),
          seenAt: null,
          request: ev.request ?? null,
        };
        setItems((prev) => [n, ...prev].slice(0, 10)); // mantener tamaño de pagina
        // avisamos al badge si por algún motivo no pescó el inc
        window.dispatchEvent(new CustomEvent("notif:inc", { detail: 1 }));
      }
    } catch {
      // noop
    }
  }, [lastEvent]);

  // -------- acciones: marcar como vistas --------
  const markOne = async (id: number) => {
    if (busy) return;
    setBusy(true);
    try {
      // optimista
      const before = items;
      const idx = before.findIndex((n) => n.id === id);
      if (idx < 0) return;

      const wasUnseen = !before[idx].seenAt;
      const optimistic = before.map((n) =>
        n.id === id ? { ...n, seenAt: n.seenAt ?? new Date().toISOString() } : n
      );
      setItems(optimistic);

      const res = await apiFetch(MARK_SEEN_URL, {
        method: "PUT",
        body: JSON.stringify({ ids: [id] }),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        // revertir si falló
        setItems(before);
        return;
      }

      if (wasUnseen) {
        window.dispatchEvent(new CustomEvent("notif:seen", { detail: 1 }));
      }
    } finally {
      setBusy(false);
    }
  };

  const markAll = async () => {
    if (busy) return;
    const unseenIds = items.filter((n) => !n.seenAt).map((n) => n.id);
    if (unseenIds.length === 0) return;

    setBusy(true);
    try {
      // optimista
      const optimistic = items.map((n) =>
        n.seenAt ? n : { ...n, seenAt: new Date().toISOString() }
      );
      setItems(optimistic);

      const res = await apiFetch(MARK_SEEN_URL, {
        method: "PUT",
        body: JSON.stringify({ ids: unseenIds }),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        // si falló, recargar desde server
        const data = await api<ListResp>(`/notifications/me?page=${page}&limit=10`);
        setItems(data.items ?? []);
        setPages(data.meta?.pages ?? 1);
        return;
      }

      window.dispatchEvent(new CustomEvent("notif:seen", { detail: unseenIds.length }));
    } finally {
      setBusy(false);
    }
  };

  if (!token) return <div className="p-6">No autenticado.</div>;
  if (loading) return <div className="p-6">Cargando…</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notificaciones</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={markAll}
            disabled={busy || items.every((n) => n.seenAt)}
            className="border px-3 py-1 rounded disabled:opacity-60"
            title="Marcar todas como vistas"
          >
            Marcar todas como vistas
          </button>
        </div>
      </div>

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-3 border">ID</th>
            <th className="p-3 border">Tipo</th>
            <th className="p-3 border">Mensaje</th>
            <th className="p-3 border">Creado</th>
            <th className="p-3 border">Visto</th>
          </tr>
        </thead>
        <tbody>
          {items.map((n) => (
            <tr key={n.id} className="border-b">
              <td className="p-3 border">{n.id}</td>
              <td className="p-3 border">{n.type}</td>
              <td className="p-3 border">{n.message}</td>
              <td className="p-3 border">{fmt(n.createdAt)}</td>
              <td className="p-3 border">
                {n.seenAt ? (
                  <span className="text-gray-500">{fmt(n.seenAt)}</span>
                ) : (
                  <button
                    onClick={() => markOne(n.id)}
                    disabled={busy}
                    className="border px-2 py-1 rounded"
                  >
                    Marcar visto
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center gap-3 pt-2">
        <button
          className="border px-3 py-1 rounded disabled:opacity-60"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
        >
          ← Anterior
        </button>
        <span>
          Página <b>{page}</b> — Total: <b>{items.length}</b>
        </span>
        <button
          className="border px-3 py-1 rounded disabled:opacity-60"
          onClick={() => setPage((p) => Math.min(pages, p + 1))}
          disabled={page >= pages}
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}

function fmt(d: string | null | undefined) {
  if (!d) return "—";
  try {
    const date = new Date(d);
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "short",
      timeStyle: "medium",
    }).format(date);
  } catch {
    return d;
  }
}
