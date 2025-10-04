"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import { useSSE } from "@/hooks/useSSE";
import { useAuth } from "@/lib/auth";

type OpenRow = {
  id: number;
  title: string;
  status: string;
  priceOffered?: string | number | null;
  priceAgreed?: string | number | null;
  createdAt?: string;
  lat?: number | null;
  lng?: number | null;
  distanceKm?: number;
};

type Pager<T> = { items: T[]; meta?: { page: number; limit: number; total: number; pages: number } };

export default function ProviderOpenPage() {
  const { token } = useAuth();
  const { api, apiFetch } = useApi();
  const { lastEvent } = useSSE("/api/notifications/stream");

  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [radiusKm, setRadiusKm] = useState(10);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [items, setItems] = useState<OpenRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const pages = Math.max(1, Math.ceil(total / Math.max(1, limit)));

  // Intentar geolocalización del navegador
  useEffect(() => {
    if (!navigator?.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
      },
      () => {
        // si falla, queda para ingresar manualmente
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  }, []);

  const canSearch = useMemo(() => coords.lat != null && coords.lng != null, [coords]);

  async function load() {
    if (!canSearch) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        lat: String(coords.lat),
        lng: String(coords.lng),
        radiusKm: String(radiusKm),
        page: String(page),
        limit: String(limit),
        sort: "distance",
      }).toString();
      const data = await api<Pager<OpenRow>>(`/requests/open?${qs}`);
      const rows = data.items ?? [];
      setItems(rows);
      setTotal(data.meta?.total ?? rows.length ?? 0);
    } finally {
      setLoading(false);
    }
  }

  // cargar cuando tengo coords / page / radius
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSearch, page, radiusKm]);

  // Si llega un SSE de un request que esté en la lista y dejó de estar PENDING,
  // lo removemos para que no quede "abierto".
  useEffect(() => {
    if (!lastEvent) return;
    const ev = lastEvent as any;
    const r = ev?.request;
    if (!r?.id) return;
    setItems((prev) => prev.filter((x) => x.id !== r.id));
  }, [lastEvent]);

  async function claim(id: number) {
    const priceStr = prompt("Precio ofertado (opcional):");
    const body: any = {};
    if (priceStr && priceStr.trim() !== "") {
      const n = Number(priceStr);
      if (!Number.isFinite(n) || n < 0) return alert("Precio inválido");
      body.priceOffered = n;
    }
    try {
      const res = await apiFetch(`/requests/${id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      // al clamear, ya no es "abierto", lo saco de la lista
      setItems((prev) => prev.filter((x) => x.id !== id));
      alert("Te postulaste correctamente ✔");
    } catch (e: any) {
      alert(e?.message ?? "Error al postularse");
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
      <h1 className="text-2xl font-semibold">Abiertos cerca (Proveedor)</h1>

      <div className="flex flex-wrap items-end gap-3 border rounded p-3">
        <div>
          <label className="block text-sm text-gray-600">Lat</label>
          <input
            className="border rounded px-2 py-1 w-40"
            type="number"
            step="any"
            value={coords.lat ?? ""}
            onChange={(e) => setCoords((c) => ({ ...c, lat: e.target.value === "" ? null : Number(e.target.value) }))}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600">Lng</label>
          <input
            className="border rounded px-2 py-1 w-40"
            type="number"
            step="any"
            value={coords.lng ?? ""}
            onChange={(e) => setCoords((c) => ({ ...c, lng: e.target.value === "" ? null : Number(e.target.value) }))}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600">Radio (km)</label>
          <input
            className="border rounded px-2 py-1 w-32"
            type="number"
            min={1}
            max={100}
            value={radiusKm}
            onChange={(e) => {
              setRadiusKm(Math.max(1, Math.min(100, Number(e.target.value) || 1)));
              setPage(1);
            }}
          />
        </div>
        <button
          onClick={load}
          disabled={!canSearch || loading}
          className="border rounded px-3 py-1 disabled:opacity-50"
          title="Buscar"
        >
          {loading ? "Buscando…" : "Buscar"}
        </button>
        {canSearch && (
          <a
            className="underline text-sm text-blue-700"
            href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
            target="_blank"
          >
            Ver mi posición en mapa
          </a>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left border-b">#</th>
              <th className="px-3 py-2 text-left border-b">Título</th>
              <th className="px-3 py-2 text-left border-b">Distancia</th>
              <th className="px-3 py-2 text-left border-b">Creado</th>
              <th className="px-3 py-2 text-left border-b">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="odd:bg-white even:bg-gray-50">
                <td className="px-3 py-2">{r.id}</td>
                <td className="px-3 py-2">{r.title}</td>
                <td className="px-3 py-2">{r.distanceKm != null ? `${r.distanceKm.toFixed(2)} km` : "—"}</td>
                <td className="px-3 py-2">{fmtDate(r.createdAt)}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => claim(r.id)}
                      className="text-xs border rounded px-2 py-1 hover:bg-gray-50"
                      title="Postularme (claim)"
                    >
                      Postularme
                    </button>
                    {r.lat != null && r.lng != null && (
                      <a
                        className="text-xs border rounded px-2 py-1 hover:bg-gray-50"
                        target="_blank"
                        href={`https://www.google.com/maps?q=${r.lat},${r.lng}`}
                      >
                        Ver mapa
                      </a>
                    )}
                    <Link href={`/requests/${r.id}`} className="text-xs border rounded px-2 py-1 hover:bg-gray-50">
                      Ver detalle
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr>
                <td className="px-3 py-8 text-center text-gray-500" colSpan={5}>
                  No hay pedidos abiertos en el radio indicado.
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
