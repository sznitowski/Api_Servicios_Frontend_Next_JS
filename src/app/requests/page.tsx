// src/app/requests/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/hooks/useApi";
import { useSSE } from "@/hooks/useSSE";

// -------- Tipos --------
type RequestRow = {
  id: number;
  title: string;
  status: string;
  priceOffered: number | string | null;
  priceAgreed: number | string | null;
  createdAt: string; // ISO
  client?: { id: number } | null;
};

type ListResp = {
  items: RequestRow[];
  meta: { page: number; limit: number; total: number; pages: number };
};

// -------- Traducciones de estado --------
const STATUS_LABELS: Record<string, string> = {
  PENDING: "PENDIENTE",
  OFFERED: "OFERTADA",
  ACCEPTED: "ACEPTADA",
  IN_PROGRESS: "EN_PROCESO",
  DONE: "FINALIZADA",
  CANCELLED: "CANCELADA",
  CANCELED: "CANCELADA",
  ADMIN_CANCEL: "CANCELADA",
  ADMIN_CANCELED: "CANCELADA",
};
function tStatus(key?: string | null) {
  const k = String(key ?? "").toUpperCase();
  return STATUS_LABELS[k] ?? (k || "—");
}

// -------- Utils --------
function formatMoney(v: number | string | null | undefined) {
  if (v == null || v === "") return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(n);
  } catch {
    return `$ ${Number(n).toFixed(2)}`;
  }
}
function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "short",
      timeStyle: "medium",
    }).format(d);
  } catch {
    return iso;
  }
}
function StatusPill({ status }: { status?: string }) {
  const s = String(status ?? "").toUpperCase();
  const color =
    s === "DONE"
      ? "bg-green-100 text-green-800 border-green-200"
      : s === "IN_PROGRESS"
      ? "bg-blue-100 text-blue-800 border-blue-200"
      : s === "OFFERED"
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : s.includes("CANCEL")
      ? "bg-red-100 text-red-800 border-red-200"
      : "bg-gray-100 text-gray-800 border-gray-200";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs ${color}`}>
      {tStatus(s)}
    </span>
  );
}

// Opciones de filtro (mantenemos los códigos, mostramos traducido)
const STATUS_FILTERS = ["PENDING", "OFFERED", "ACCEPTED", "IN_PROGRESS", "DONE", "CANCELLED"] as const;

export default function RequestsPage() {
  const { token } = useAuth();
  const { api, apiFetch } = useApi();

  const [items, setItems] = useState<RequestRow[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"" | (typeof STATUS_FILTERS)[number]>("");

  // carga
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const qs = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          ...(status ? { status } : {}),
        }).toString();
        const data = await api<ListResp>(`/requests/me?${qs}`);
        if (!alive) return;
        const rows = (data.items || []).map((r) => ({
          ...r,
          priceOffered: r.priceOffered == null ? null : Number(r.priceOffered),
          priceAgreed: r.priceAgreed == null ? null : Number(r.priceAgreed),
        }));
        setItems(rows);
        setTotal(data.meta?.total ?? rows.length ?? 0);
      } catch {
        if (!alive) return;
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [api, page, limit, status]);

  // SSE: actualizar solo la fila afectada
  const { lastEvent } = useSSE("/api/notifications/stream");
  useEffect(() => {
    if (!lastEvent) return;
    const ev = lastEvent as any;
    const req = ev?.request;
    if (!req?.id) return;
    setItems((prev) => {
      const i = prev.findIndex((r) => r.id === req.id);
      if (i === -1) return prev;
      const merged: RequestRow = {
        ...prev[i],
        ...req,
        priceOffered:
          req.priceOffered === undefined
            ? prev[i].priceOffered
            : req.priceOffered == null
            ? null
            : Number(req.priceOffered),
        priceAgreed:
          req.priceAgreed === undefined
            ? prev[i].priceAgreed
            : req.priceAgreed == null
            ? null
            : Number(req.priceAgreed),
      };
      const next = prev.slice();
      next[i] = merged;
      return next;
    });
  }, [lastEvent]);

  // acciones (cliente)
  const doAccept = async (id: number) => {
    const priceStr = prompt("Precio acordado (opcional):");
    let body: any = {};
    if (priceStr != null && priceStr !== "") {
      const n = Number(priceStr);
      if (!Number.isFinite(n) || n < 0) return alert("Precio inválido");
      body.priceAgreed = n;
    }
    try {
      const res = await apiFetch(`/requests/${id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      setItems((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: "ACCEPTED", priceAgreed: body.priceAgreed ?? r.priceAgreed } : r,
        ),
      );
      alert("Oferta aceptada ✔");
    } catch (e: any) {
      alert(e?.message ?? "Error al aceptar");
    }
  };

  const doCancel = async (id: number) => {
    const reason = prompt("Motivo de cancelación (opcional):") ?? "";
    if (!confirm("¿Confirmar cancelación?")) return;
    try {
      const res = await apiFetch(`/requests/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error(await res.text());
      setItems((prev) => prev.map((r) => (r.id === id ? { ...r, status: "CANCELLED" } : r)));
      alert("Pedido cancelado ✔");
    } catch (e: any) {
      alert(e?.message ?? "Error al cancelar");
    }
  };

  if (!token) return <div className="p-6">No autenticado.</div>;
  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          Mis pedidos <span className="inline-block w-2 h-2 rounded-full bg-gray-400" />
        </h1>
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
            <option value="">{`Todos`}</option>
            {STATUS_FILTERS.map((code) => (
              <option key={code} value={code}>
                {tStatus(code)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full border">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 border-b">ID</th>
              <th className="text-left px-3 py-2 border-b">Título</th>
              <th className="text-left px-3 py-2 border-b">Estado</th>
              <th className="text-left px-3 py-2 border-b">Ofertado</th>
              <th className="text-left px-3 py-2 border-b">Acordado</th>
              <th className="text-left px-3 py-2 border-b">Creado</th>
              <th className="text-left px-3 py-2 border-b">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => {
              const s = String(r.status).toUpperCase();
              const canAccept = s === "OFFERED";
              const canCancel = ["PENDING", "OFFERED", "ACCEPTED"].includes(s);
              return (
                <tr key={r.id} className="odd:bg-white even:bg-gray-50">
                  <td className="px-3 py-2">
                    <Link href={`/requests/${r.id}`} className="underline">
                      {r.id}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/requests/${r.id}`} className="underline">
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="px-3 py-2">{formatMoney(r.priceOffered)}</td>
                  <td className="px-3 py-2">{formatMoney(r.priceAgreed)}</td>
                  <td className="px-3 py-2">{fmtDate(r.createdAt)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      {canAccept && (
                        <button
                          onClick={() => doAccept(r.id)}
                          className="text-xs border rounded px-2 py-1 hover:bg-gray-50"
                          title="Aceptar oferta"
                        >
                          Aceptar
                        </button>
                      )}
                      {canCancel && (
                        <button
                          onClick={() => doCancel(r.id)}
                          className="text-xs border rounded px-2 py-1 hover:bg-gray-50 text-red-700 border-red-300"
                          title="Cancelar"
                        >
                          Cancelar
                        </button>
                      )}
                      <Link
                        href={`/requests/${r.id}`}
                        className="text-xs border rounded px-2 py-1 hover:bg-gray-50"
                      >
                        Ver
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="mt-4 flex items-center gap-3">
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
