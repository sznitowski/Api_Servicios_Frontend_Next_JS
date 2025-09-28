// src/app/requests/[id]/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/lib/auth";
import { useSSE } from "@/hooks/useSSE";

type Req = {
  id: number;
  title: string;
  status: string;
  priceOffered?: number | null;
  priceAgreed?: number | null;
  createdAt?: string;
};

type Transition = {
  id: number;
  fromStatus: string | null;
  toStatus: string;
  createdAt: string;
  actor?: { id?: number; email?: string; name?: string } | null;
};

type ListResp<T> = { items: T[]; meta?: any } | T[];

// Dado que useParams puede devolver string | string[], normalizamos
function parseIdParam(raw: unknown): number | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function RequestDetailPage() {
  const params = useParams(); // Record<string, string | string[]>
  const router = useRouter();
  const { token } = useAuth();
  const { api, apiFetch } = useApi();
  const { lastEvent } = useSSE("/api/notifications/stream");

  const reqId = useMemo(() => parseIdParam((params as any)?.id), [params]);

  const [loading, setLoading] = useState(true);
  const [req, setReq] = useState<Req | null>(null);
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    if (!reqId) return;
    setLoading(true);
    setErr(null);
    try {
      // Detalle del pedido
      const r = await api<Req>(`/requests/${reqId}`);
      setReq(r ?? null);

      // Transiciones: tu backend puede devolver { items } o []
      // Ajustá el endpoint si en tu API se llama distinto.
      const t = await api<ListResp<Transition>>(`/requests/${reqId}/timeline`);
      const items = Array.isArray(t) ? t : (t?.items ?? []);
      setTransitions(items);
    } catch (e: any) {
      setErr(e?.message ?? "Error cargando el pedido");
    } finally {
      setLoading(false);
    }
  };

  // Marca como vistas las notificaciones de ESTE pedido y descuenta el badge
  const markThisRequestNotifsSeen = async () => {
    if (!reqId) return;
    try {
      const unseen = await api<any>(`/notifications/me?unseen=true&limit=50&page=1`);
      const unseenItems: any[] = unseen?.items ?? [];
      const ids = unseenItems
        .filter((n) => n?.request?.id === reqId)
        .map((n) => n.id)
        .filter(Boolean);

      if (ids.length) {
        const res = await apiFetch(`/notifications/me/seen`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        if (res.ok) {
          // baja el badge: ya tenés este puente en NotifBadge
          window.dispatchEvent(new CustomEvent("notif:seen", { detail: ids.length }));
        }
      }
    } catch {
      // noop
    }
  };

  useEffect(() => {
    if (!token || !reqId) return;
    let alive = true;

    (async () => {
      await load();
      if (!alive) return;
      // al entrar, marcamos como vistas las no leídas de este pedido
      await markThisRequestNotifsSeen();
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, reqId]);

  // Cuando llega una notificación SSE del mismo pedido, refrescamos
  useEffect(() => {
    if (!lastEvent || !reqId) return;
    const ev = lastEvent as any;
    const evReqId = ev?.request?.id;
    if (evReqId === reqId) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvent, reqId]);

  if (!token) {
    return (
      <div className="p-6">
        <p>No autenticado.</p>
        <Link className="underline" href="/login">Ir a login</Link>
      </div>
    );
  }

  if (!reqId) return <div className="p-6">ID inválido.</div>;
  if (loading) return <div className="p-6">Cargando…</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!req) return <div className="p-6">Pedido no encontrado.</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-gray-500">
            <button
              onClick={() => router.back()}
              className="underline hover:text-gray-700"
            >
              ← Volver
            </button>
          </div>
          <h1 className="text-2xl font-semibold mt-1">Pedido #{req.id}</h1>
          <div className="mt-2 flex items-center gap-2">
            <StatusPill status={req.status} />
            {req.createdAt && (
              <span className="text-sm text-gray-500">
                Creado: {fmtDate(req.createdAt)}
              </span>
            )}
          </div>
        </div>

        <div className="text-right text-sm text-gray-700">
          <div>Ofertado: <strong>{fmtMoney(req.priceOffered)}</strong></div>
          <div>
            Acuerdo:{" "}
            <strong>
              {req.priceAgreed != null ? fmtMoney(req.priceAgreed) : "—"}
            </strong>
          </div>
        </div>
      </div>

      {/* Datos básicos */}
      <div className="border rounded-md p-4">
        <div className="font-medium mb-2">Detalle</div>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-500">Título</dt>
            <dd className="font-medium">{req.title}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Estado</dt>
            <dd><StatusPill status={req.status} /></dd>
          </div>
        </dl>
      </div>

      {/* Timeline / Transiciones */}
      <div className="border rounded-md p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Historial de estados</div>
          <button
            onClick={load}
            className="text-sm border rounded px-2 py-1 hover:bg-gray-50"
            title="Refrescar"
          >
            Refrescar
          </button>
        </div>

        {transitions.length === 0 ? (
          <div className="text-sm text-gray-500">Sin transiciones.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">De</th>
                  <th className="px-3 py-2">A</th>
                  <th className="px-3 py-2">Actor</th>
                  <th className="px-3 py-2">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {transitions.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="px-3 py-2">{t.id}</td>
                    <td className="px-3 py-2">{t.fromStatus ?? "—"}</td>
                    <td className="px-3 py-2"><StatusPill status={t.toStatus} /></td>
                    <td className="px-3 py-2">{t.actor?.name || t.actor?.email || "—"}</td>
                    <td className="px-3 py-2">{fmtDate(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
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
      : s === "CANCELLED" || s === "ADMIN_CANCEL"
      ? "bg-red-100 text-red-800 border-red-200"
      : "bg-gray-100 text-gray-800 border-gray-200";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs ${color}`}>
      {s || "—"}
    </span>
  );
}

function fmtMoney(v?: number | null) {
  if (v == null) return "—";
  try {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(v);
  } catch {
    return `$ ${v.toFixed(2)}`;
  }
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
