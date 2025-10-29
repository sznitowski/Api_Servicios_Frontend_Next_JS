// src/app/requests/[id]/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/lib/auth";
import { useSSE } from "@/hooks/useSSE";
import RequestChat from "@/components/RequestChat";
import { PayButton, PaymentsList, PaymentBadge } from "@/features/payments";

/* ===== Tipos ===== */
type UserLite = { id: number | string; email?: string; name?: string; role?: string };

type Req = {
  id: number;
  title: string;
  status: string;
  priceOffered?: number | string | null;
  priceAgreed?: number | string | null;
  createdAt?: string;
  description?: string | null;
  client?: UserLite | null;
  provider?: UserLite | null;
  paymentStatus?: string | null; // ⬅ nuevo
};

type Transition = {
  id: number;
  fromStatus: string | null;
  toStatus: string;
  createdAt: string;
  actor?: UserLite | null;
};

type Review = {
  id?: number;
  stars: number;
  comment?: string | null;
  createdAt: string;
  author: UserLite;
  target?: UserLite | null;
};

type ListResp<T> = { items: T[]; meta?: any } | T[];

/* ===== Utiles ===== */
function parseIdParam(raw: unknown): number | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Traducciones de estados */
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
  const k = (key ?? "").toUpperCase();
  const label = STATUS_LABELS[k];
  return (label ?? k) || "—";
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

  // Rating (cliente → proveedor)
  const [ratingScore, setRatingScore] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState<string>("");
  const [ratingSending, setRatingSending] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);

  // Rating (proveedor → cliente)
  const [cRatingScore, setCRatingScore] = useState<number>(5);
  const [cRatingComment, setCRatingComment] = useState<string>("");
  const [cRatingSending, setCRatingSending] = useState(false);
  const [cRatingDone, setCRatingDone] = useState(false);

  // Feedback visible para proveedor (lo que dejó el cliente)
  const [feedback, setFeedback] = useState<Review | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Feedback visible para cliente (lo que dejó el proveedor)
  const [providerToClientFeedback, setProviderToClientFeedback] = useState<Review | null>(null);
  const [p2cLoading, setP2cLoading] = useState(false);

  /* ====== Cargar "me" ====== */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /* ====== Load ====== */
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

  /** Reseña del CLIENTE hacia el PROVEEDOR (la ve el proveedor) */
  const loadClientFeedback = async () => {
    if (!reqId || !req?.provider?.id) return;
    const providerId = Number(req.provider.id);

    setFeedbackLoading(true);
    try {
      const direct = await api<any>(`/requests/${reqId}/rating`).catch(() => null);
      if (direct) {
        setFeedback({
          id: direct.id,
          stars: direct.stars ?? direct.score ?? 0,
          comment: direct.comment ?? null,
          createdAt: direct.createdAt,
          author: direct.rater ?? direct.author ?? { id: 0, email: "" },
          target: req.provider ?? null,
        });
        return;
      }

      const list = await api<any>(`/providers/id/${providerId}/ratings?requestId=${reqId}&limit=1`)
        .catch(() => null);
      const item = Array.isArray(list?.items) ? list.items[0] : null;

      setFeedback(item ? {
        id: item.id,
        stars: item.stars ?? item.score ?? 0,
        comment: item.comment ?? null,
        createdAt: item.createdAt ?? item.created_at,
        author: item.rater ?? { id: item.rater_id, email: "" },
        target: req.provider ?? null,
      } : null);
    } finally {
      setFeedbackLoading(false);
    }
  };

  /** Reseña del PROVEEDOR hacia el CLIENTE (la ve el cliente) */
  const loadProviderToClientFeedback = async () => {
    if (!reqId || !req?.client?.id) return;
    setP2cLoading(true);
    try {
      const direct = await api<any>(`/requests/${reqId}/rating/client`).catch(() => null);
      if (direct) {
        setProviderToClientFeedback({
          id: direct.id,
          stars: direct.stars ?? direct.score ?? 0,
          comment: direct.comment ?? null,
          createdAt: direct.createdAt,
          author: direct.rater ?? direct.author ?? { id: 0, email: "" },
          target: req.client ?? null,
        });
        return;
      }

      const alt = await api<any>(`/requests/${reqId}/rating?target=client`).catch(() => null);
      if (alt) {
        setProviderToClientFeedback({
          id: alt.id,
          stars: alt.stars ?? alt.score ?? 0,
          comment: alt.comment ?? null,
          createdAt: alt.createdAt,
          author: alt.rater ?? alt.author ?? { id: 0, email: "" },
          target: req.client ?? null,
        });
        return;
      }
    } finally {
      setP2cLoading(false);
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

  // Cuando tenemos request listo, cargar reseñas en ambos sentidos
  useEffect(() => {
    if (!reqId || !req) return;
    loadClientFeedback();
    loadProviderToClientFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reqId, req?.provider?.id, req?.client?.id]);

  // Si llega un SSE del mismo request, recargar
  useEffect(() => {
    if (!lastEvent || !reqId) return;
    const ev = lastEvent as any;
    if (ev?.request?.id === reqId) {
      load();
      loadClientFeedback();
      loadProviderToClientFeedback();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvent, reqId]);

  /* ===== Acciones ===== */

  // Cliente acepta oferta del proveedor (opcionalmente puede ingresar nuevo precio acordado)
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
      if (!res.ok) throw new Error(await safeText(res));
      await load();
      alert("Oferta aceptada ✔");
    } catch (e: any) {
      alert(e?.message ?? "Error al aceptar");
    }
  };

  // Proveedor: aceptar directamente el precio del cliente → usar /accept (SIN body)
  const doAcceptClientPrice = async () => {
    if (!reqId) return;
    if (req?.priceOffered == null) {
      alert("No hay precio ofrecido por el cliente.");
      return;
    }
    if (!confirm(`¿Ofertar al mismo precio del cliente (${fmtMoney(req.priceOffered as any)})?`)) return;

    try {
      const res = await apiFetch(`/requests/${reqId}/offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceOffered: Number(req.priceOffered) }),
      });
      if (!res.ok) throw new Error(await toReadableError(res));
      await load();
      alert("Oferta enviada al cliente ✔");
    } catch (e: any) {
      alert(e?.message ?? "No se pudo ofertar al precio del cliente");
    }
  };

  // Cambiar oferta manualmente
  const doChangeOffer = async () => {
    if (!reqId) return;
    const priceStr = prompt("Precio a ofertar:", req?.priceOffered != null ? String(req.priceOffered) : "");
    if (priceStr == null) return;
    const n = Number(priceStr);
    if (!Number.isFinite(n) || n < 0) return alert("Precio inválido");

    try {
      const res = await apiFetch(`/requests/${reqId}/offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceOffered: n }),
      });
      if (!res.ok) throw new Error(await toReadableError(res));
      await load();
      alert("Oferta enviada ✔");
    } catch (e: any) {
      alert(e?.message ?? "No se pudo ofertar");
    }
  };

  const doStart = async () => {
    if (!reqId) return;
    if (!confirm("¿Iniciar el trabajo?")) return;
    try {
      const res = await apiFetch(`/requests/${reqId}/start`, { method: "POST" });
      if (!res.ok) throw new Error(await safeText(res));
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
      if (!res.ok) throw new Error(await safeText(res));
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
      if (!res.ok) throw new Error(await safeText(res));
      await load();
      alert("Pedido cancelado ✔");
    } catch (e: any) {
      alert(e?.message ?? "Error al cancelar");
    }
  };

  // Cliente → Proveedor
  const submitRating = async () => {
    if (!reqId) return;
    const starsInt = Math.min(5, Math.max(1, Math.round(Number(ratingScore))));
    if (!Number.isFinite(starsInt)) return alert("Seleccioná una puntuación de 1 a 5.");

    setRatingSending(true);
    try {
      const res = await apiFetch(`/requests/${reqId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stars: starsInt,
          comment: ratingComment?.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(await toReadableError(res));
      setRatingDone(true);
      await loadClientFeedback();
      alert("¡Gracias por tu calificación!");
    } catch (e: any) {
      alert(e?.message ?? "No se pudo enviar la calificación");
    } finally {
      setRatingSending(false);
    }
  };

  // Proveedor → Cliente
  const submitClientRating = async () => {
    if (!reqId) return;
    const starsInt = Math.min(5, Math.max(1, Math.round(Number(cRatingScore))));
    if (!Number.isFinite(starsInt)) return alert("Seleccioná una puntuación de 1 a 5.");

    setCRatingSending(true);
    try {
      let res = await apiFetch(`/requests/${reqId}/rating/client`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stars: starsInt,
          comment: cRatingComment?.trim() || undefined,
        }),
      });

      if (res.status === 404) {
        res = await apiFetch(`/requests/${reqId}/rating?target=client`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stars: starsInt,
            comment: cRatingComment?.trim() || undefined,
          }),
        });
      }

      if (!res.ok) throw new Error(await toReadableError(res));

      setCRatingDone(true);
      await loadProviderToClientFeedback();
      alert("¡Gracias por calificar al cliente!");
    } catch (e: any) {
      alert(e?.message ?? "No se pudo enviar la calificación del cliente");
    } finally {
      setCRatingSending(false);
    }
  };

  /* ===== Reglas UI ===== */
  const meIdNum = Number(me?.id) || 0;
  const providerIdNum = Number(req?.provider?.id) || 0;
  const clientIdNum = Number(req?.client?.id) || 0;
  const statusRaw = (req?.status ?? "").toUpperCase();

  const canAccept = !!req && statusRaw === "OFFERED" && meIdNum === clientIdNum;
  const canProviderOffer = !!req && statusRaw === "PENDING" && meIdNum === providerIdNum;
  const canStart = !!req && statusRaw === "ACCEPTED" && meIdNum === providerIdNum;
  const canComplete = !!req && statusRaw === "IN_PROGRESS" && meIdNum === providerIdNum;
  const canCancelClient =
    !!req && meIdNum === clientIdNum && ["PENDING", "OFFERED", "ACCEPTED"].includes(statusRaw);
  const canCancelProvider =
    !!req && meIdNum === providerIdNum && ["PENDING", "OFFERED", "ACCEPTED"].includes(statusRaw);
  const canRateProvider = !!req && statusRaw === "DONE" && meIdNum === clientIdNum && !ratingDone;
  const canRateClient = !!req && statusRaw === "DONE" && meIdNum === providerIdNum && !cRatingDone;

  const isProviderView = !!req && !!meIdNum && meIdNum === providerIdNum;
  const isClientView = !!req && !!meIdNum && meIdNum === clientIdNum;

  // ⬅️ Mostrar bloque de pago sólo al CLIENTE cuando el pedido esté FINALIZADO y haya monto > 0
  const totalToPay = Number((req?.priceAgreed ?? req?.priceOffered ?? 0) as number | string);
  const canPay = !!req && isClientView && statusRaw === "DONE" && totalToPay > 0;

  /* ===== UI ===== */
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
    <div className="p-6">
      {/* Layout en 2 columnas: contenido + aside chat */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        {/* Columna izquierda: todo el contenido del pedido */}
        <section className="space-y-6 min-h-[70vh]">
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
                {typeof req.paymentStatus !== "undefined" && (
                  <PaymentBadge status={req.paymentStatus || "PENDING"} />
                )}
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
          {(canAccept || canStart || canComplete || canCancelClient || canCancelProvider || canProviderOffer) && (
            <div className="border rounded-md p-4">
              <div className="font-medium mb-2">Acciones</div>
              <div className="flex flex-wrap gap-2">
                {/* Cliente acepta oferta */}
                {canAccept && (
                  <button onClick={doAccept} className="border px-3 py-1 rounded hover:bg-gray-50">
                    Aceptar oferta
                  </button>
                )}

                {/* Proveedor: desde PENDIENTE puede aceptar el precio del cliente o cambiarlo */}
                {canProviderOffer && (
                  <>
                    <button onClick={doAcceptClientPrice} className="border px-3 py-1 rounded hover:bg-gray-50">
                      Aceptar precio del cliente
                    </button>
                    <button onClick={doChangeOffer} className="border px-3 py-1 rounded hover:bg-gray-50">
                      Cambiar oferta
                    </button>
                  </>
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

          {/* ⬇️ Bloque de pago */}
          {canPay && (
            <section className="border rounded-md p-4 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium mb-1">Total a pagar</div>
                  <div className="text-2xl tracking-tight">{fmtMoney(totalToPay)}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Al pagar, el proveedor será notificado. El recibo quedará asociado a este pedido.
                  </p>
                </div>
                <PayButton requestId={req.id} />
              </div>
            </section>
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
                <dd>
                  {req.provider?.email ?? "—"}
                  {req.provider?.id ? (
                    <Link href={`/providers/${req.provider.id}`} className="underline text-sm ml-2">
                      Ver reseñas
                    </Link>
                  ) : null}
                </dd>
              </div>

              {/* Mensaje del cliente */}
              <div className="md:col-span-3">
                <dt className="text-gray-500">Mensaje del cliente</dt>
                <dd className="mt-1 whitespace-pre-wrap">
                  {req.description?.trim() || "—"}
                </dd>
              </div>
            </dl>
          </div>

          {/* Historial de pagos */}
          <PaymentsList requestId={req.id} />

          {/* Bloque de feedback (lo que dejó el cliente) — visible para el PROVEEDOR */}
          {isProviderView && (
            <div className="border rounded-md p-4">
              <div className="font-medium mb-2">Calificación y mensaje del cliente</div>
              {feedbackLoading ? (
                <p className="text-sm text-gray-500">Buscando reseña…</p>
              ) : feedback ? (
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold">
                    {initialsOf(feedback.author.name || feedback.author.email || "C")}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {renderStars(feedback.stars)}
                      <span className="text-xs text-gray-500">{fmtDate(feedback.createdAt)}</span>
                    </div>
                    {feedback.comment && (
                      <p className="mt-1 whitespace-pre-wrap text-sm">{feedback.comment}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">El cliente todavía no dejó calificación.</p>
              )}
            </div>
          )}

          {/* Bloque de feedback del PROVEEDOR — visible para el CLIENTE */}
          {isClientView && (
            <div className="border rounded-md p-4">
              <div className="font-medium mb-2">Calificación del proveedor</div>
              {p2cLoading ? (
                <p className="text-sm text-gray-500">Buscando reseña…</p>
              ) : providerToClientFeedback ? (
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold">
                    {initialsOf(providerToClientFeedback.author.name || providerToClientFeedback.author.email || "P")}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {renderStars(providerToClientFeedback.stars)}
                      <span className="text-xs text-gray-500">{fmtDate(providerToClientFeedback.createdAt)}</span>
                    </div>
                    {providerToClientFeedback.comment && (
                      <p className="mt-1 whitespace-pre-wrap text-sm">{providerToClientFeedback.comment}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">El proveedor todavía no dejó calificación.</p>
              )}
            </div>
          )}

          {/* Calificación (cliente → proveedor) */}
          {canRateProvider && (
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

          {/* Calificación (proveedor → cliente) */}
          {canRateClient && (
            <div className="border rounded-md p-4">
              <div className="font-medium mb-2">Calificar al cliente</div>
              <div className="flex items-center gap-3">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      aria-label={`Puntuar ${n}`}
                      className={`text-2xl leading-none px-1 ${cRatingScore >= n ? "text-yellow-500" : "text-gray-300"}`}
                      onClick={() => setCRatingScore(n)}
                      disabled={cRatingSending}
                      title={`${n} estrella${n > 1 ? "s" : ""}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <span className="text-sm text-gray-600">{cRatingScore}/5</span>
              </div>
              <div className="mt-3">
                <textarea
                  placeholder="Comentario (opcional)"
                  className="w-full border rounded px-3 py-2 text-sm"
                  rows={3}
                  value={cRatingComment}
                  onChange={(e) => setCRatingComment(e.target.value)}
                  disabled={cRatingSending}
                />
              </div>
              <div className="mt-3">
                <button
                  onClick={submitClientRating}
                  disabled={cRatingSending}
                  className="border px-3 py-1 rounded hover:bg-gray-50 disabled:opacity-60"
                >
                  {cRatingSending ? "Enviando…" : "Enviar calificación"}
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
                        <td className="px-3 py-2">{tStatus(t.fromStatus)}</td>
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
        </section>

        {/* Columna derecha: Chat fijo */}
        <aside className="lg:sticky lg:top-20 h-[70vh] lg:h-[calc(100vh-120px)]">
          <div className="h-full border rounded-2xl shadow-sm bg-white dark:bg-neutral-900 flex flex-col overflow-hidden">
            <header className="px-4 py-3 border-b text-sm font-medium">Mensajes</header>
            <div className="flex-1">
              {/* RequestChat ya maneja autoscroll y composer */}
              <RequestChat requestId={req.id} meId={meIdNum} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ===== Presentacionales / helpers ===== */

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

function fmtMoney(v?: number | string | null) {
  if (v == null || v === "") return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);
  } catch {
    return `$ ${Number(n).toFixed(2)}`;
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

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function renderStars(value?: number) {
  const v = Math.max(0, Math.min(5, Math.round(value || 0)));
  return (
    <span className="leading-none">
      <span className="text-yellow-500">{"★".repeat(v)}</span>
      <span className="text-gray-300">{"★".repeat(5 - v)}</span>
    </span>
  );
}

async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "Error";
  }
}

async function toReadableError(res: Response) {
  let msg = await safeText(res);
  try {
    const j = JSON.parse(msg);
    msg = Array.isArray(j?.message) ? j.message.join(", ") : (j?.message || msg);
  } catch { /* noop */ }
  return msg || "Error";
}
