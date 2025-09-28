// src/app/requests/[id]/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/lib/auth";
import { useSSE } from "@/hooks/useSSE";

type UserLite = { id: number; email?: string; name?: string; role?: string };

type Req = {
  id: number;
  title: string;
  status: string;
  priceOffered?: number | string | null;
  priceAgreed?: number | string | null;
  createdAt?: string;
  client?: UserLite | null;
  provider?: UserLite | null;
};

type Transition = {
  id: number;
  fromStatus: string | null;
  toStatus: string;
  createdAt: string;
  actor?: UserLite | null;
};

type ListResp<T> = { items: T[]; meta?: any } | T[];

function parseIdParam(raw: unknown): number | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const { api, apiFetch } = useApi();
  const { lastEvent } = useSSE("/api/notifications/stream");

  const reqId = useMemo(() => parseIdParam((params as any)?.id), [params]);

  const [loading, setLoading] = useState(true);
  const [req, setReq] = useState<Req | null>(null);
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [me, setMe] = useState<UserLite | null>(null);

  // Rating state
  const [ratingScore, setRatingScore] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState<string>("");
  const [ratingSending, setRatingSending] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    (async () => {
      try {
        if (!me) {
          const m = await api<UserLite>("/auth/me");
          if (alive && m) setMe(m);
        }
      } catch { /* noop */ }
    })();
    return () => { alive = false; };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = async () => {
    if (!reqId) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await api<Req>(`/requests/${reqId}`);
      if (r) {
        (r as any).priceOffered = r.priceOffered == null ? null : Number(r.priceOffered);
        (r as any).priceAgreed = r.priceAgreed == null ? null : Number(r.priceAgreed);
      }
      setReq(r ?? null);

      const t = await api<ListResp<Transition>>(`/requests/${reqId}/timeline`);
      const items = Array.isArray(t) ? t : (t?.items ?? []);
      setTransitions(items);
    } catch (e: any) {
      setErr(e?.message ?? "Error cargando el pedido");
    } finally {
      setLoading(false);
    }
  };

  const markThisRequestNotifsSeen = async () => {
    if (!reqId) return;
    try {
      const unseen = await api<any>(`/notifications/me?unseen=true&limit=50&page=1`);
      const unseenItems: any[] = unseen?.items ?? [];
      const ids = unseenItems.filter((n) => n?.request?.id === reqId).map((n) => n.id).filter(Boolean);
      if (ids.length) {
        const res = await apiFetch(`/notifications/me/seen`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        if (res.ok) window.dispatchEvent(new CustomEvent("notif:seen", { detail: ids.length }));
      }
    } catch { /* noop */ }
  };

  useEffect(() => {
    if (!token || !reqId) return;
    let alive = true;
    (async () => {
      await load();
      if (!alive) return;
      await markThisRequestNotifsSeen();
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, reqId]);

  useEffect(() => {
    if (!lastEvent || !reqId) return;
    const ev = lastEvent as any;
    if (ev?.request?.id === reqId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvent, reqId]);

  // ----- Acciones de flujo -----
  const doAccept = async () => {
    if (!reqId) return;
    const priceStr = prompt("Precio acordado (opcional). Dejar vacío para no cambiar:");
    let body: any = {};
    if (priceStr != null && priceStr !== "") {
      const n = Number(priceStr);
      if (!Number.isFinite(n) || n < 0) return alert("Precio inválido");
      body.priceAgreed = n;
    }
    try {
      const res = await apiFetch(`/requests/${reqId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
      alert("Oferta aceptada ✔");
    } catch (e: any) {
      alert(e?.message ?? "Error al aceptar");
    }
  };

  const doStart = async () => {
    if (!reqId) return;
    if (!confirm("¿Iniciar el trabajo?")) return;
    try {
      const res = await apiFetch(`/requests/${reqId}/start`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      await load();
      alert("Trabajo iniciado ✔");
    } catch (e: any) {
      alert(e?.message ?? "Error al iniciar");
    }
  };

  const doComplete = async () => {
    if (!reqId) return;
    if (!confirm("¿Marcar como completado?")) return;
    try {
      const res = await apiFetch(`/requests/${reqId}/complete`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      await load();
      alert("Trabajo completado ✔");
    } catch (e: any) {
      alert(e?.message ?? "Error al completar");
    }
  };

  const doCancel = async () => {
    if (!reqId) return;
    const reason = prompt("Motivo de cancelación (opcional):") ?? "";
    if (!confirm("¿Confirmar cancelación?")) return;
    try {
      const res = await apiFetch(`/requests/${reqId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
      alert("Pedido cancelado ✔");
    } catch (e: any) {
      alert(e?.message ?? "Error al cancelar");
    }
  };

  // ----- Rating -----
  const submitRating = async () => {
    if (!reqId) return;
    if (!ratingScore || ratingScore < 1 || ratingScore > 5) {
      return alert("Seleccioná una puntuación de 1 a 5.");
    }
    setRatingSending(true);
    try {
      const res = await apiFetch(`/requests/${reqId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: ratingScore, comment: ratingComment }),
      });
      if (!res.ok) throw new Error(await res.text());
      setRatingDone(true);
      alert("¡Gracias por tu calificación!");
    } catch (e: any) {
      alert(e?.message ?? "No se pudo enviar la calificación");
    } finally {
      setRatingSending(false);
    }
  };

  // Reglas
  const meId = me?.id ?? 0;
  const status = (req?.status ?? "").toUpperCase();

  const canAccept =
    !!req && status === "OFFERED" && meId && meId === (req.client?.id ?? 0);

  const canStart =
    !!req && status === "ACCEPTED" && meId && meId === (req.provider?.id ?? 0);

  const canComplete =
    !!req && status === "IN_PROGRESS" && meId && meId === (req.provider?.id ?? 0);

  const canCancelClient =
    !!req && meId === (req.client?.id ?? 0) &&
    ["PENDING", "OFFERED", "ACCEPTED"].includes(status);

  const canCancelProvider =
    !!req && meId === (req.provider?.id ?? 0) &&
    ["OFFERED", "ACCEPTED"].includes(status);

  const canRate =
    !!req && status === "DONE" && meId === (req.client?.id ?? 0) && !ratingDone;

  // UI
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
            <button onClick={() => router.back()} className="underline hover:text-gray-700">
              ← Volver
            </button>
          </div>
          <h1 className="text-2xl font-semibold mt-1">Pedido #{req.id}</h1>
          <div className="mt-2 flex items-center gap-2">
            <StatusPill status={req.status} />
            {req.createdAt && (
              <span className="text-sm text-gray-500">Creado: {fmtDate(req.createdAt)}</span>
            )}
          </div>
        </div>

        <div className="text-right text-sm text-gray-700">
          <div>Ofertado: <strong>{fmtMoney(req.priceOffered as any)}</strong></div>
          <div>
            Acuerdo: <strong>{req.priceAgreed != null ? fmtMoney(req.priceAgreed as any) : "—"}</strong>
          </div>
        </div>
      </div>

      {/* Acciones */}
      {(canAccept || canStart || canComplete || canCancelClient || canCancelProvider) && (
        <div className="border rounded-md p-4">
          <div className="font-medium mb-2">Acciones</div>
          <div className="flex flex-wrap gap-2">
            {canAccept && (
              <button onClick={doAccept} className="border px-3 py-1 rounded hover:bg-gray-50">
                Aceptar oferta
              </button>
            )}
            {canStart && (
              <button onClick={doStart} className="border px-3 py-1 rounded hover:bg-gray-50">
                Iniciar trabajo
              </button>
            )}
            {canComplete && (
              <button onClick={doComplete} className="border px-3 py-1 rounded hover:bg-gray-50">
                Marcar como completado
              </button>
            )}
            {(canCancelClient || canCancelProvider) && (
              <button
                onClick={doCancel}
                className="border px-3 py-1 rounded hover:bg-gray-50 text-red-700 border-red-300"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Detalle */}
      <div className="border rounded-md p-4">
        <div className="font-medium mb-2">Detalle</div>
        <dl className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-gray-500">Título</dt>
            <dd className="font-medium">{req.title}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Cliente</dt>
            <dd>{req.client?.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Proveedor</dt>
            <dd>{req.provider?.email ?? "—"}</dd>
          </div>
        </dl>
      </div>

      {/* Calificación (cliente) */}
      {canRate && (
        <div className="border rounded-md p-4">
          <div className="font-medium mb-2">Calificar trabajo</div>
          <div className="flex items-center gap-3">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  aria-label={`Puntuar ${n}`}
                  className={`text-2xl leading-none px-1 ${ratingScore >= n ? "text-yellow-500" : "text-gray-300"}`}
                  onClick={() => setRatingScore(n)}
                  disabled={ratingSending}
                  title={`${n} estrella${n > 1 ? "s" : ""}`}
                >
                  ★
                </button>
              ))}
            </div>
            <span className="text-sm text-gray-600">{ratingScore}/5</span>
          </div>
          <div className="mt-3">
            <textarea
              placeholder="Comentario (opcional)"
              className="w-full border rounded px-3 py-2 text-sm"
              rows={3}
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              disabled={ratingSending}
            />
          </div>
          <div className="mt-3">
            <button
              onClick={submitRating}
              disabled={ratingSending}
              className="border px-3 py-1 rounded hover:bg-gray-50 disabled:opacity-60"
            >
              {ratingSending ? "Enviando…" : "Enviar calificación"}
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="border rounded-md p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Historial de estados</div>
          <button onClick={load} className="text-sm border rounded px-2 py-1 hover:bg-gray-50" title="Refrescar">
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

function fmtMoney(v?: number | string | null) {
  if (v == null || v === "") return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);
  } catch {
    return `$ ${n.toFixed(2)}`;
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
