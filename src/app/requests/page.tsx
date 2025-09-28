"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/hooks/useApi";
import { useSSE } from "@/hooks/useSSE";

type ServiceRequest = {
  id: number;
  title: string;
  status: string;
  priceOffered?: number | string | null;
  priceAgreed?: number | string | null;
  createdAt: string;
  updatedAt: string;
};

type ListMeta = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

type ListResp = {
  items: ServiceRequest[];
  meta: ListMeta;
};

// ---- helpers de presentación ----------------------------------------------

const fmtMoney = (v: unknown) => {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  // Si querés sin símbolo, usá el return comentado
  return n.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  // return `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fmtDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("es-AR");
  } catch {
    return iso ?? "—";
  }
};

// ---------------------------------------------------------------------------

export default function RequestsPage() {
  const { token } = useAuth();
  const { api } = useApi();

  const [items, setItems] = useState<ServiceRequest[]>([]);
  const [meta, setMeta] = useState<ListMeta>({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);

  // SSE para escuchar cambios y refrescar (el hook agrega el access_token)
  const { lastEvent, connected } = useSSE("/api/notifications/stream");

  const page = meta.page;
  const limit = meta.limit;

  const canPrev = page > 1;
  const canNext = page < meta.pages;

  const load = useMemo(
    () => async (p = page) => {
      setLoading(true);
      try {
        const res = await api<ListResp>(`/requests/me?page=${p}&limit=${limit}`);
        setItems(res.items ?? []);
        setMeta(res.meta ?? { page: p, limit, total: res.items?.length ?? 0, pages: p });
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [api, page, limit]
  );

  useEffect(() => {
    if (!token) {
      setItems([]);
      setMeta((m) => ({ ...m, page: 1, total: 0, pages: 1 }));
      return;
    }
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Cada vez que llega un evento SSE (claim, update, etc.), refrescamos
  useEffect(() => {
    if (!lastEvent) return;
    // Podrías filtrar por tipos: if (lastEvent.type === 'REQUEST_*') { ... }
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvent]);

  const goto = (p: number) => {
    if (p < 1 || p > meta.pages) return;
    load(p);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        Mis pedidos
        <span
          title={connected ? "Conectado a SSE" : "Desconectado de SSE"}
          className={`inline-block h-3 w-3 rounded-full ${
            connected ? "bg-green-500" : "bg-gray-400"
          }`}
        />
      </h1>

      <div className="mt-4 border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Título</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Ofertado</th>
              <th className="px-3 py-2">Acordado</th>
              <th className="px-3 py-2">Creado</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={6}>
                  No hay pedidos.
                </td>
              </tr>
            )}
            {items.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.id}</td>
                <td className="px-3 py-2">{r.title}</td>
                <td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2">{fmtMoney(r.priceOffered)}</td>
                <td className="px-3 py-2">{fmtMoney(r.priceAgreed)}</td>
                <td className="px-3 py-2">{fmtDateTime(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación simple */}
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={() => goto(page - 1)}
          disabled={!canPrev || loading}
          className="border rounded px-3 py-1 disabled:opacity-50"
        >
          ← Anterior
        </button>
        <span>
          Página <b>{meta.page}</b> — Total: <b>{meta.total}</b>
        </span>
        <button
          onClick={() => goto(page + 1)}
          disabled={!canNext || loading}
          className="border rounded px-3 py-1 disabled:opacity-50"
        >
          Siguiente →
        </button>
      </div>

      {loading && <p className="mt-2 text-sm text-gray-500">Cargando…</p>}
    </div>
  );
}
