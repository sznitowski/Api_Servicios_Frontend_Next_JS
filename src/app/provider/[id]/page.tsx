"use client";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/lib/auth";

type UserLite = { id: number; email?: string; name?: string };
type Rating = {
  id: number;
  score: number;
  comment?: string | null;
  createdAt: string;
  rater?: UserLite | null;      // cliente que calificó
  request?: { id: number; title?: string | null } | null;
};

type Summary = {
  ratingAvg: number;
  ratingCount: number;
  breakdown: Record<"1"|"2"|"3"|"4"|"5", number>;
};

function parseIdParam(raw: unknown): number | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function ProviderProfilePage() {
  const { token } = useAuth();
  const { api } = useApi();
  const params = useParams();
  const router = useRouter();

  const providerId = useMemo(() => parseIdParam((params as any)?.id), [params]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const PAGE_SIZE = 10;

  const loadSummary = async () => {
    if (!providerId) return;
    const s = await api<Summary>(`/providers/id/${providerId}/ratings/summary`);
    setSummary(s ?? { ratingAvg: 0, ratingCount: 0, breakdown: { "1":0,"2":0,"3":0,"4":0,"5":0 } });
  };

  const loadRatings = async (p = 1) => {
    if (!providerId) return;
    const res = await api<{ items: any[]; meta?: any } | any[]>(
      `/providers/id/${providerId}/ratings?page=${p}&limit=${PAGE_SIZE}`
    );
    const items = Array.isArray(res) ? res : (res?.items ?? []);
    const meta = Array.isArray(res) ? null : res?.meta ?? null;
    setRatings(items.map((r: any) => ({
      id: r.id,
      score: r.stars ?? r.score ?? 0,
      comment: r.comment ?? null,
      createdAt: r.createdAt ?? r.created_at,
      rater: r.rater ?? null,
      request: r.request ? { id: r.request.id, title: r.request?.title } : null,
    })));
    setPage(meta?.page ?? p);
    setPages(meta?.pages ?? 1);
  };

  useEffect(() => {
    if (!token || !providerId) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        await Promise.all([loadSummary(), loadRatings(1)]);
      } catch (e: any) {
        setErr(e?.message ?? "Error cargando perfil");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, providerId]);

  if (!token) {
    return (
      <div className="p-6">
        <p>No autenticado.</p>
        <Link className="underline" href="/login">Ir a login</Link>
      </div>
    );
  }
  if (!providerId) return <div className="p-6">ID inválido.</div>;
  if (loading) return <div className="p-6">Cargando…</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="underline text-sm">← Volver</button>
        <h1 className="text-2xl font-semibold">Perfil del proveedor #{providerId}</h1>
        <div />
      </div>

      {/* Summary */}
      <div className="border rounded-md p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-xl font-semibold flex items-center gap-2">
            <Stars value={summary?.ratingAvg ?? 0} />
            <span className="text-gray-600 text-base">
              {Number(summary?.ratingAvg ?? 0).toFixed(2)} · {summary?.ratingCount ?? 0} reseña(s)
            </span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="mt-4 space-y-2">
          {(["5","4","3","2","1"] as const).map(s => {
            const count = summary?.breakdown?.[s] ?? 0;
            const total = summary?.ratingCount ?? 0;
            const pct = total ? Math.round((count / total) * 100) : 0;
            return (
              <div key={s} className="flex items-center gap-3 text-sm">
                <span className="w-7">{s}★</span>
                <div className="flex-1 h-3 bg-gray-100 rounded">
                  <div className="h-3 bg-amber-400 rounded" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-16 text-right text-gray-600">{count} ({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ratings list */}
      <div className="border rounded-md p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Reseñas</div>
          <div className="text-sm text-gray-600">Página {page} de {pages}</div>
        </div>

        {ratings.length === 0 ? (
          <div className="text-sm text-gray-500">Sin reseñas.</div>
        ) : (
          <ul className="space-y-4">
            {ratings.map(r => (
              <li key={r.id} className="border rounded p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Stars value={r.score} />
                    <span className="text-xs text-gray-500">{fmtDate(r.createdAt)}</span>
                  </div>
                  {r.request?.id ? (
                    <Link className="text-sm underline" href={`/requests/${r.request.id}`}>
                      Ver pedido #{r.request.id}
                    </Link>
                  ) : null}
                </div>
                <div className="mt-2 text-sm text-gray-800">
                  {r.comment || <span className="text-gray-400">Sin comentario.</span>}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {r.rater?.email ? `Por ${r.rater.email}` : "Cliente"}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Pager */}
        <div className="mt-3 flex gap-2">
          <button
            className="border rounded px-3 py-1 text-sm disabled:opacity-50"
            onClick={() => loadRatings(page - 1)}
            disabled={page <= 1}
          >
            ← Anterior
          </button>
          <button
            className="border rounded px-3 py-1 text-sm disabled:opacity-50"
            onClick={() => loadRatings(page + 1)}
            disabled={page >= pages}
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}

function Stars({ value }: { value: number }) {
  const full = Math.round(Number(value) || 0);
  return (
    <div className="text-amber-500 text-lg leading-none" title={`${value}/5`}>
      {"★★★★★".slice(0, full)}
      <span className="text-gray-300">
        {"★★★★★".slice(full)}
      </span>
    </div>
  );
}

function fmtDate(s?: string) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}
