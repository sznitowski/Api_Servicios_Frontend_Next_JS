"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/lib/auth";
import { LoginGateBanner } from "@/components/ui/RequireAuth";
import dynamic from "next/dynamic";

// Evita "window is not defined" por react-leaflet
const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

type ApiItem = {
  providerUserId: number;
  displayName: string | null;
  photoUrl: string | null;
  ratingAvg: string | number | null;
  ratingCount: number;
  basePrice: string | null;
  serviceTypeName: string;
  distanceKm?: number;
  location: { lat: number; lng: number };
};

type ApiResponse = {
  items: ApiItem[];
  meta: { page: number; limit: number; total: number; pages: number };
};

function parseId(raw: unknown) {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function ProvidersByService() {
  const { api } = useApi();
  const { token } = useAuth();
  const params = useParams();
  const stId = useMemo(() => parseId((params as any)?.id), [params]);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [sort, setSort] = useState<"distance" | "rating" | "price">("distance");
  const [radius, setRadius] = useState(20);
  const [selected, setSelected] = useState<number | null>(null);

  const [items, setItems] = useState<ApiItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator?.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setCoords(null),
      { enableHighAccuracy: true, timeout: 7000 }
    );
  }, []);

  useEffect(() => {
    if (!stId) return;
    (async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({
          serviceTypeId: String(stId),
          sort,
          ...(coords
            ? { lat: String(coords.lat), lng: String(coords.lng), radiusKm: String(radius) }
            : {}),
        }).toString();

        const res = await api<ApiResponse>("/providers/search?" + qs);
        setItems(res?.items ?? []);
        setSelected(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [stId, sort, radius, coords?.lat, coords?.lng]); // eslint-disable-line

  if (!stId) return <div className="p-6">ID inválido.</div>;
  if (loading) return <div className="p-6">Cargando…</div>;

  const mapCenter = coords ?? items[0]?.location ?? { lat: -34.6037, lng: -58.3816 };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Proveedores del servicio #{stId}</h1>
          <div className="text-gray-600 text-sm">
            {coords ? "Usando tu ubicación actual" : "No pudimos obtener tu ubicación; usando un centro por defecto"}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col">
            <label className="text-sm text-gray-600">Ordenar por</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="distance">Distancia</option>
              <option value="rating">Calificación</option>
              <option value="price">Precio</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm text-gray-600">Radio: {radius} km</label>
            <input
              type="range"
              min={5}
              max={50}
              step={1}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Banner si no hay sesión */}
      {!token && <LoginGateBanner />}

      <MapView
        center={mapCenter}
        height={360}
        onSelect={(id) => setSelected(Number(id))}
        markers={[
          ...(coords ? [{ id: "me", lat: coords.lat, lng: coords.lng, label: "Mi ubicación" }] : []),
          ...items.map((p) => ({
            id: p.providerUserId,
            lat: p.location.lat,
            lng: p.location.lng,
            label: p.displayName ?? `Usuario ${p.providerUserId}`,
            sublabel: `${fmtStars(p.ratingAvg)} (${p.ratingCount})  ·  ${
              p.distanceKm?.toFixed?.(1) ?? "?"
            } km`,
            selected: selected === p.providerUserId,
          })),
        ]}
      />

      {items.length === 0 ? (
        <div className="text-gray-500">No hay proveedores para este servicio en tu zona.</div>
      ) : (
        <ul className="space-y-3">
          {items.map((p) => {
            const isSel = selected === p.providerUserId;
            return (
              <li
                key={p.providerUserId}
                className={`border rounded p-3 ${isSel ? "ring-2 ring-blue-400" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {p.displayName ?? `Usuario ${p.providerUserId}`}
                    </div>
                    <div className="text-sm text-gray-600 flex flex-wrap gap-x-3 gap-y-1">
                      <span>
                        {fmtStars(p.ratingAvg)} <span className="ml-1">({p.ratingCount})</span>
                      </span>
                      {p.distanceKm != null && <span>{p.distanceKm.toFixed(2)} km</span>}
                      {p.basePrice && <span>Desde ${Number(p.basePrice).toLocaleString()}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelected(p.providerUserId)}
                      className="border rounded px-3 py-1 hover:bg-gray-50 text-sm"
                    >
                      Ver en mapa
                    </button>
                    <Link
                      href={`/providers/${p.providerUserId}`}
                      className="border rounded px-3 py-1 hover:bg-gray-50 text-sm"
                    >
                      Ver perfil
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function fmtStars(value: string | number | null | undefined) {
  const num = Number(value ?? 0);
  const v = Math.max(0, Math.min(5, Math.round(num)));
  return (
    <span className="leading-none align-middle">
      <span className="text-yellow-500">{"★".repeat(v)}</span>
      <span className="text-gray-300">{"★".repeat(5 - v)}</span>
    </span>
  );
}
