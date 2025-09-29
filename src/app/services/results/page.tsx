"use client";

import { useSearchParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { useEffect, useState } from "react";
import Link from "next/link";

type Item = {
  providerUserId: number;
  displayName: string | null;
  photoUrl: string | null;
  ratingAvg: number | string;
  ratingCount: number;
  basePrice: string | null;
  serviceTypeName: string | null;
  distanceKm: number;
  location: { lat: number; lng: number };
};

export default function Results() {
  const sp = useSearchParams();
  const { api } = useApi();

  const categoryId = sp.get("categoryId");
  const serviceTypeId = sp.get("serviceTypeId");
  const radiusKm = sp.get("radiusKm") ?? "20";
  const sort = sp.get("sort") ?? "distance";

  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // Geolocalización (fallback CABA si falla)
  useEffect(() => {
    if (!navigator?.geolocation) {
      setCoords({ lat: -34.6037, lng: -58.3816 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      p => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setCoords({ lat: -34.6037, lng: -58.3816 }),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // Buscar proveedores
  useEffect(() => {
    (async () => {
      if (coords.lat == null || coords.lng == null) return;
      if (!categoryId && !serviceTypeId) return;

      setLoading(true);
      try {
        const qs = new URLSearchParams({
          lat: String(coords.lat),
          lng: String(coords.lng),
          radiusKm,
          sort,
          ...(categoryId ? { categoryId } : {}),
          ...(serviceTypeId ? { serviceTypeId } : {}),
        }).toString();

        const res = await api<{ items: Item[] }>("/providers/search?" + qs);
        setItems(res?.items ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [coords, categoryId, serviceTypeId, radiusKm, sort, api]);

  if (!categoryId && !serviceTypeId) return <div className="p-6">Faltan parámetros.</div>;
  if (loading) return <div className="p-6">Buscando profesionales cerca…</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">
        {categoryId ? `Profesionales del rubro #${categoryId}` : `Profesionales del servicio #${serviceTypeId}`}
      </h1>

      {items.length === 0 ? (
        <div className="text-gray-500">No encontramos profesionales en tu zona.</div>
      ) : (
        <ul className="space-y-3">
          {items.map((p) => (
            <li key={p.providerUserId} className="border rounded p-3 flex gap-3 items-center">
              {p.photoUrl && (
                <img
                  src={p.photoUrl}
                  alt={p.displayName ?? "Proveedor"}
                  className="w-12 h-12 rounded-full object-cover"
                />
              )}
              <div className="flex-1">
                <div className="font-medium">{p.displayName ?? `Proveedor ${p.providerUserId}`}</div>
                <div className="text-sm text-gray-600">
                  {renderStars(Number(p.ratingAvg))} <span className="ml-1">({p.ratingCount})</span>
                  <span className="ml-3">{p.distanceKm.toFixed(2)} km</span>
                  {p.basePrice && <span className="ml-3">Desde ${Number(p.basePrice).toLocaleString()}</span>}
                </div>
                {p.serviceTypeName && <div className="text-xs text-gray-500 mt-0.5">{p.serviceTypeName}</div>}
              </div>
              <Link
                href={`/providers/${p.providerUserId}`}
                className="border rounded px-3 py-1 hover:bg-gray-50 text-sm"
              >
                Ver perfil
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function renderStars(value?: number) {
  const v = Math.max(0, Math.min(5, Math.round(value || 0)));
  return (
    <span className="leading-none align-middle">
      <span className="text-yellow-500">{"★".repeat(v)}</span>
      <span className="text-gray-300">{"★".repeat(5 - v)}</span>
    </span>
  );
}
