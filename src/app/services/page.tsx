"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import MapView from "@/components/MapView";

type Category = {
  id: number;
  name: string;
  description?: string | null;
  serviceTypes: { id: number; name: string }[];
};

type ApiItem = {
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

type SearchResponse = { items: ApiItem[]; meta: { page: number; limit: number; total: number; pages: number } };

// —— helpers ——
function stars(n: number) {
  const v = Math.max(0, Math.min(5, Math.round(n || 0)));
  return (
    <span className="leading-none align-middle">
      <span className="text-yellow-500">{"★".repeat(v)}</span>
      <span className="text-gray-300">{"★".repeat(5 - v)}</span>
    </span>
  );
}

export default function ServicesPage() {
  const { api } = useApi();

  // catálogo
  const [cats, setCats] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [catId, setCatId] = useState<number | null>(null);

  // geoloc
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  // búsqueda por rubro
  const [radiusKm, setRadiusKm] = useState(20);
  const [sort, setSort] = useState<"distance" | "rating" | "price">("distance");
  const [items, setItems] = useState<ApiItem[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selectedId, setSelectedId] = useState<number | string | null>(null);

  // 1) cargar catálogo
  useEffect(() => {
    (async () => {
      try {
        const rows = await api<Category[]>("/catalog/categories");
        setCats(rows ?? []);
        // si querés dejar por defecto “Plomería” al entrar:
        const plom = (rows ?? []).find(c => /plome/i.test(c.name));
        if (plom) setCatId(plom.id);
      } finally {
        setLoadingCats(false);
      }
    })();
  }, [api]);

  // 2) geolocalización
  useEffect(() => {
    if (!navigator?.geolocation) {
      // fallback CABA
      setCoords({ lat: -34.6037, lng: -58.3816 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      p => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setCoords({ lat: -34.6037, lng: -58.3816 }),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // 3) buscar proveedores por rubro cuando cambia selección o ubicación
  useEffect(() => {
    (async () => {
      if (!catId || coords.lat == null || coords.lng == null) return;
      setLoadingSearch(true);
      try {
        const qs = new URLSearchParams({
          categoryId: String(catId),
          lat: String(coords.lat),
          lng: String(coords.lng),
          radiusKm: String(radiusKm),
          sort
        }).toString();
        const res = await api<SearchResponse>("/providers/search?" + qs);
        setItems(res?.items ?? []);
        setSelectedId(null);
      } finally {
        setLoadingSearch(false);
      }
    })();
  }, [catId, coords.lat, coords.lng, radiusKm, sort, api]);

  // —— markers para el mapa ——
  const markers = useMemo(
    () =>
      items.map((p) => ({
        id: p.providerUserId,
        lat: p.location.lat,
        lng: p.location.lng,
        label: p.displayName ?? `Proveedor ${p.providerUserId}`,
        sublabel: `⭐ ${Number(p.ratingAvg).toFixed(1)} · ${p.distanceKm.toFixed(1)} km`,
        selected: selectedId === p.providerUserId
      })),
    [items, selectedId]
  );

  const center = useMemo(() => {
    if (selectedId != null) {
      const s = items.find(i => i.providerUserId === selectedId);
      if (s) return { lat: s.location.lat, lng: s.location.lng };
    }
    if (coords.lat != null && coords.lng != null) return { lat: coords.lat, lng: coords.lng };
    return { lat: -34.6037, lng: -58.3816 };
  }, [coords, items, selectedId]);

  // UI
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Servicios</h1>

      {/* Filtros principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Rubro</label>
          <select
            value={catId ?? ""}
            onChange={(e) => setCatId(e.target.value ? Number(e.target.value) : null)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">— Seleccionar —</option>
            {cats.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Ordenar por</label>
          <select value={sort} onChange={(e)=>setSort(e.target.value as any)} className="w-full border rounded px-3 py-2">
            <option value="distance">Distancia</option>
            <option value="rating">Calificación</option>
            <option value="price">Precio</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Radio: {radiusKm} km</label>
          <input
            type="range"
            min={1}
            max={50}
            value={radiusKm}
            onChange={(e)=>setRadiusKm(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {/* Mapa + resultados */}
      {loadingCats ? (
        <div className="text-gray-500">Cargando catálogo…</div>
      ) : !catId ? (
        <div className="text-gray-500">Elegí un rubro para ver quiénes están cerca.</div>
      ) : (
        <>
          <div className="h-[420px] border rounded overflow-hidden">
            {/* MapView espera props: center, markers, height, onSelect */}
            <MapView
              center={center}
              markers={markers}
              height={420}
              onSelect={(id) => setSelectedId(id)}
            />
          </div>

          {loadingSearch ? (
            <div className="text-gray-500">Buscando profesionales cerca…</div>
          ) : items.length === 0 ? (
            <div className="text-gray-500">No hay proveedores para este rubro en tu zona.</div>
          ) : (
            <ul className="space-y-3">
              {items.map((p) => (
                <li
                  key={p.providerUserId}
                  className={`border rounded p-3 flex gap-3 items-center ${selectedId === p.providerUserId ? "ring-2 ring-blue-400" : ""}`}
                  onMouseEnter={() => setSelectedId(p.providerUserId)}
                >
                  {p.photoUrl && (
                    <img src={p.photoUrl} alt={p.displayName ?? "Proveedor"} className="w-12 h-12 rounded-full object-cover" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{p.displayName ?? `Proveedor ${p.providerUserId}`}</div>
                    <div className="text-sm text-gray-600">
                      {stars(Number(p.ratingAvg))} <span className="ml-1">({p.ratingCount})</span>
                      <span className="ml-3">{p.distanceKm.toFixed(2)} km</span>
                      {p.basePrice && <span className="ml-3">Desde ${Number(p.basePrice).toLocaleString()}</span>}
                    </div>
                    {p.serviceTypeName && <div className="text-xs text-gray-500 mt-0.5">{p.serviceTypeName}</div>}
                  </div>
                  <Link href={`/providers/${p.providerUserId}`} className="border rounded px-3 py-1 hover:bg-gray-50 text-sm">
                    Ver perfil
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
