"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import { useSSE } from "@/hooks/useSSE";
import { useAuth } from "@/lib/auth";

type Row = {
  id: number;
  title: string;
  status: string;
  priceOffered?: string | number | null;
  priceAgreed?: string | number | null;
  createdAt?: string;
};

type Pager<T> = { items: T[]; meta?: { page: number; limit: number; total: number; pages: number } };

const STATUSES = ["", "OFFERED", "ACCEPTED", "IN_PROGRESS", "DONE", "CANCELLED"] as const;

export default function ProviderMyJobsPage() {
  const { token } = useAuth();
  const { api, apiFetch } = useApi();
  const { lastEvent } = useSSE("/api/notifications/stream");

  const [status, setStatus] = useState<(typeof STATUSES)[number]>("");
  const [items, setItems] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const pages = Math.max(1, Math.ceil(total / limit));

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(status ? { status } : {}),
      }).toString();
      const data = await api<Pager<Row>>(`/requests/provider/me?${qs}`);
      setItems(data.items ?? []);
      setTotal(data.meta?.total ?? data.items?.length ?? 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  // refrescar si llega SSE del mismo request
  useEffect(() => {
    if (!lastEvent) return;
    const ev = lastEvent as any;
    const r = ev?.request;
    if (!r?.id) return;
    setItems((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...r } : x)));
  }, [lastEvent]);

  async function doStart(id: number) {
    try {
      const res = await apiFetch(`/requests/${id}/start`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, status: "IN_PROGRESS" } : x)));
      alert("Trabajo iniciado ✔");
    } catch (e: any) {
      alert(e?.message ?? "No se pudo iniciar");
    }
  }

  async function doComplete(id: number) {
    try {
      const res = await apiFetch(`/requests/${id}/complete`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, status: "DONE" } : x)));
      alert("Trabajo completado ✔");
    } catch (e: any) {
      alert(e?.message ?? "No se pudo completar");
    }
  }

  if (!token)
    return (
      <div className="p-6">
        <p>No autenticado.</p>
        <Link href="/login" className="underline">
          Ir a login
        </Link>
      </div>
    );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mis trabajos (Proveedor)</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Estado:</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as any);
              setPage(1);
            }}
            className="border rounded px-2 py-1 text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s || "all"} value={s}>
                {s ? s : "Todos"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left border-b">#</th>
              <th className="px-3 py-2 text-left border-b">Título</th>
              <th className="px-3 py-2 text-left border-b">Estado</th>
              <th className="px-3 py-2 text-left border-b">Creado</th>
              <th className="px-3 py-2 text-left border-b">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => {
              const s = String(r.status).toUpperCase();
              const canStart = s === "ACCEPTED";
              const canComplete = s === "IN_PROGRESS";
              return (
                <tr key={r.id} className="odd:bg-white even:bg-gray-50">
                  <td className="px-3 py-2">{r.id}</td>
                  <td className="px-3 py-2">
                    <Link href={`/requests/${r.id}`} className="underline">
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{s}</td>
                  <td className="px-3 py-2">{fmtDate(r.createdAt)}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      {canStart && (
                        <button onClick={() => doStart(r.id)} className="text-xs border rounded px-2 py-1 hover:bg-gray-50">
                          Iniciar
                        </button>
                      )}
                      {canComplete && (
                        <button
                          onClick={() => doComplete(r.id)}
                          className="text-xs border rounded px-2 py-1 hover:bg-gray-50"
                        >
                          Completar
                        </button>
                      )}
                      <Link href={`/requests/${r.id}`} className="text-xs border rounded px-2 py-1 hover:bg-gray-50">
                        Ver
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="border px-3 py-1 rounded disabled:opacity-50"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
        >
          ← Anterior
        </button>
        <span>
          Página <b>{page}</b> / <b>{pages}</b> — Total: <b>{total}</b>
        </span>
        <button
          className="border px-3 py-1 rounded disabled:opacity-50"
          onClick={() => setPage((p) => Math.min(pages, p + 1))}
          disabled={page >= pages}
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}

function fmtDate(s?: string) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return d.toLocaleString();
  } catch {
    return s;
  }
}
