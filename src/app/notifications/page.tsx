"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/lib/auth";

type NotifType = "OFFERED" | "IN_PROGRESS" | "DONE" | "CANCELLED" | "ADMIN_CANCEL" | string;

type Notif = {
  id: number;
  type: NotifType;
  message: string | null;
  createdAt: string;        // ISO
  seenAt: string | null;    // ISO | null
  request?: { id: number; title: string; status: string } | null;
};

type ListResp = {
  items: Notif[];
  meta: { page: number; pages: number; total: number; limit: number };
};

export default function NotificationsPage() {
  const { token } = useAuth();
  const { api, apiFetch } = useApi();

  // UI state
  const [items, setItems] = useState<Notif[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);
  const [onlyUnseen, setOnlyUnseen] = useState(true);

  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const unseenCountOnPage = useMemo(
    () => items.filter((n) => !n.seenAt).length,
    [items]
  );

  // Loader
  const load = async (p = page, unseen = onlyUnseen) => {
    if (!token) return;
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      const q = new URLSearchParams();
      q.set("page", String(p));
      q.set("limit", String(limit));
      if (unseen) q.set("unseen", "true");

      const data = await api<ListResp>(`/notifications/me?${q.toString()}`);
      setItems(data.items);
      setPage(data.meta.page);
      setPages(Math.max(1, data.meta.pages));
      setTotal(data.meta.total);
    } catch (e: any) {
      setErr(e?.message ?? "Error cargando notificaciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1, onlyUnseen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, onlyUnseen]);

  // Helpers
  const fmt = (iso?: string | null) =>
    !iso ? "—" : new Date(iso).toLocaleString();

  const decBadge = (n: number) => {
    window.dispatchEvent(new CustomEvent("notif:seen", { detail: n }));
  };

  // Actions
  const markOneSeen = async (id: number) => {
    setProcessing(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await apiFetch("/notifications/me/seen", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      if (!res.ok) throw new Error(await res.text());

      // Optimista: actualizá el item en memoria
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, seenAt: new Date().toISOString() } : n))
      );

      // Si estábamos en "solo no vistas", lo sacamos de la lista
      if (onlyUnseen) {
        setItems((prev) => prev.filter((n) => n.id !== id));
      }

      decBadge(1);
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo marcar como visto");
    } finally {
      setProcessing(false);
    }
  };

  const markAllSeen = async () => {
    if (!items.length) return;
    setProcessing(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await apiFetch("/notifications/me/seen", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!res.ok) throw new Error(await res.text());

      // Restá del badge las no vistas en la página
      if (unseenCountOnPage > 0) decBadge(unseenCountOnPage);

      // Si estamos filtrando solo no vistas, la página queda vacía
      // Volvemos a cargar para reflejar el nuevo estado
      await load(1, onlyUnseen);
      setMsg("Se marcaron como vistas");
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo marcar como vistas");
    } finally {
      setProcessing(false);
    }
  };

  const deleteOne = async (id: number) => {
    if (!confirm("¿Borrar esta notificación?")) return;
    setProcessing(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await apiFetch(`/notifications/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());

      // Si borramos una NO vista, también bajamos el badge
      const wasUnseen = items.find((n) => n.id === id && !n.seenAt);
      if (wasUnseen) decBadge(1);

      setItems((prev) => prev.filter((n) => n.id !== id));
      setMsg("Notificación borrada");
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo borrar");
    } finally {
      setProcessing(false);
    }
  };

  const clearRead = async () => {
    if (!confirm("¿Borrar todas las notificaciones leídas?")) return;
    setProcessing(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await apiFetch("/notifications/clear-read", {
        method: "POST",
      });
      if (!res.ok) throw new Error(await res.text());

      // Quitar de la vista las que ya estaban leídas
      setItems((prev) => prev.filter((n) => !n.seenAt));
      setMsg("Notificaciones leídas borradas");
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo borrar las leídas");
    } finally {
      setProcessing(false);
    }
  };

  // Render
  if (!token) return <div className="p-6">No autenticado.</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notificaciones</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyUnseen}
              onChange={(e) => {
                setPage(1);
                setOnlyUnseen(e.target.checked);
              }}
            />
            Solo no vistas
          </label>

          <button
            className="border px-3 py-1 rounded disabled:opacity-60"
            disabled={processing || loading || items.length === 0}
            onClick={markAllSeen}
            title="Marcar todas como vistas"
          >
            Marcar todas como vistas
          </button>

          <button
            className="border px-3 py-1 rounded disabled:opacity-60"
            disabled={processing || loading}
            onClick={clearRead}
            title="Borrar todas las leídas"
          >
            Borrar leídas
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-600">
        Total: <b>{total}</b> • Página <b>{page}</b> de <b>{pages}</b>
        {onlyUnseen && " • mostrando solo no vistas"}
      </div>

      {err && <div className="text-red-600">{err}</div>}
      {msg && <div className="text-green-700">{msg}</div>}

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="p-2 w-16">ID</th>
              <th className="p-2 w-40">Tipo</th>
              <th className="p-2">Mensaje</th>
              <th className="p-2 w-56">Creado</th>
              <th className="p-2 w-56">Visto</th>
              <th className="p-2 w-40">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-3 text-center" colSpan={6}>
                  Cargando…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="p-3 text-center" colSpan={6}>
                  No hay notificaciones {onlyUnseen ? "no vistas" : ""}.
                </td>
              </tr>
            ) : (
              items.map((n) => (
                <tr key={n.id} className={n.seenAt ? "" : "bg-yellow-50"}>
                  <td className="p-2">{n.id}</td>
                  <td className="p-2">{n.type}</td>
                  <td className="p-2">
                    <div className="space-x-2">
                      <span>{n.message ?? "—"}</span>
                      {n.request?.id ? (
                        <>
                          <span className="text-gray-400">—</span>
                          <Link
                            href={`/requests/${n.request.id}`}
                            className="underline"
                            title={`Abrir pedido #${n.request.id}`}
                          >
                            {`"${n.request.title}"`}
                          </Link>
                        </>
                      ) : null}
                    </div>
                  </td>
                  <td className="p-2">{fmt(n.createdAt)}</td>
                  <td className="p-2">{fmt(n.seenAt)}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      {!n.seenAt && (
                        <button
                          className="border px-2 py-1 rounded text-xs"
                          disabled={processing}
                          onClick={() => markOneSeen(n.id)}
                        >
                          Marcar visto
                        </button>
                      )}
                      <button
                        className="border px-2 py-1 rounded text-xs"
                        disabled={processing}
                        onClick={() => deleteOne(n.id)}
                      >
                        Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button
          className="border px-3 py-1 rounded disabled:opacity-60"
          disabled={loading || page <= 1}
          onClick={() => {
            const p = Math.max(1, page - 1);
            setPage(p);
            load(p);
          }}
        >
          ← Anterior
        </button>

        <div className="text-sm">
          Página <b>{page}</b> / <b>{pages}</b>
        </div>

        <button
          className="border px-3 py-1 rounded disabled:opacity-60"
          disabled={loading || page >= pages}
          onClick={() => {
            const p = Math.min(pages, page + 1);
            setPage(p);
            load(p);
          }}
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}
