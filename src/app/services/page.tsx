"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useApi } from "@/hooks/useApi";
import MapView from "@/components/MapView";

/* =========================
 * Tipos de datos
 * =======================*/
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
  serviceTypeId?: number;
  distanceKm: number;
  location: { lat: number; lng: number };
};

type SearchResponse = {
  items: ApiItem[];
  meta: { page: number; limit: number; total: number; pages: number };
};

/* =========================
 * Helpers UI
 * =======================*/
function stars(n: number) {
  const v = Math.max(0, Math.min(5, Math.round(n || 0)));
  return (
    <span className="leading-none align-middle">
      <span className="text-yellow-500">{"★".repeat(v)}</span>
      <span className="text-gray-300">{"★".repeat(5 - v)}</span>
    </span>
  );
}

/** Modal que se renderiza en un portal al <body> para quedar SIEMPRE sobre el mapa */
function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Evita scroll del body detrás del modal
  useEffect(() => {
    if (!mounted) return;
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      document.body.classList.add("modal-open"); // opcional para estilos globales
      return () => {
        document.body.style.overflow = prev;
        document.body.classList.remove("modal-open");
      };
    }
  }, [open, mounted]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-[560px] max-w-[92vw] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            className="text-sm text-gray-600 hover:underline"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

/* =========================
 * Página
 * =======================*/
export default function ServicesPage() {
  const { api } = useApi();

  // Catálogo
  const [cats, setCats] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [catId, setCatId] = useState<number | null>(null);

  // Geoloc
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>(
    { lat: null, lng: null }
  );

  // Búsqueda por rubro
  const [radiusKm, setRadiusKm] = useState(20);
  const [sort, setSort] = useState<"distance" | "rating" | "price">("distance");
  const [items, setItems] = useState<ApiItem[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selectedId, setSelectedId] = useState<number | string | null>(null);

  // Crear request (modal)
  const [createOpen, setCreateOpen] = useState(false);
  const [createFor, setCreateFor] = useState<ApiItem | null>(null);
  const [createStId, setCreateStId] = useState<number | null>(null);
  const [createTitle, setCreateTitle] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createPrice, setCreatePrice] = useState<number | "">("");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  // Anti-spam
  const [justCreated, setJustCreated] = useState<Set<number>>(new Set());
  const lastSigRef = useRef<string | null>(null);

  /* Cargar catálogo */
  useEffect(() => {
    (async () => {
      try {
        const rows = await api<Category[]>("/catalog/categories");
        setCats(rows ?? []);
        const plom = (rows ?? []).find((c) => /plome/i.test(c.name));
        if (plom) setCatId(plom.id);
      } finally {
        setLoadingCats(false);
      }
    })();
  }, [api]);

  /* Geo inicial */
  useEffect(() => {
    if (!navigator?.geolocation) {
      setCoords({ lat: -34.6037, lng: -58.3816 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setCoords({ lat: -34.6037, lng: -58.3816 }),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  /* Buscar proveedores */
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
          sort,
        }).toString();
        const res = await api<SearchResponse>("/providers/search?" + qs);
        setItems(res?.items ?? []);
        setSelectedId(null);
      } finally {
        setLoadingSearch(false);
      }
    })();
  }, [catId, coords.lat, coords.lng, radiusKm, sort, api]);

  /* Markers del mapa */
  const markers = useMemo(
    () =>
      items.map((p) => ({
        id: p.providerUserId,
        lat: p.location.lat,
        lng: p.location.lng,
        label: p.displayName ?? `Proveedor ${p.providerUserId}`,
        sublabel: `⭐ ${Number(p.ratingAvg).toFixed(1)} · ${p.distanceKm.toFixed(1)} km`,
        selected: selectedId === p.providerUserId,
      })),
    [items, selectedId]
  );

  const center = useMemo(() => {
    if (selectedId != null) {
      const s = items.find((i) => i.providerUserId === selectedId);
      if (s) return { lat: s.location.lat, lng: s.location.lng };
    }
    if (coords.lat != null && coords.lng != null)
      return { lat: coords.lat, lng: coords.lng };
    return { lat: -34.6037, lng: -58.3816 };
  }, [coords, items, selectedId]);

  /* Abrir modal de creación */
  function openCreate(it: ApiItem) {
    if (justCreated.has(it.providerUserId)) return;
    setCreateFor(it);

    const stOpt =
      it.serviceTypeId ?? cats.find((c) => c.id === catId)?.serviceTypes?.[0]?.id ?? null;
    setCreateStId(stOpt);

    const stName =
      it.serviceTypeName ??
      cats.find((c) => c.id === catId)?.serviceTypes?.find((s) => s.id === stOpt)?.name ??
      "Servicio";

    setCreateTitle(`Solicitud - ${stName}`);
    setCreateDesc("");
    setCreatePrice(it.basePrice ? Number(it.basePrice) : "");
    setCreateMsg(null);
    lastSigRef.current = null;
    setCreateOpen(true);
  }

  /* Enviar creación */
  async function submitCreate() {
    if (!createFor || createStId == null || coords.lat == null || coords.lng == null) {
      setCreateMsg("Completá los datos requeridos.");
      return;
    }
    if (creating) return;

    const sig =
      createStId +
      "|" +
      Math.round(coords.lat * 1e5) +
      "|" +
      Math.round(coords.lng * 1e5) +
      "|" +
      (createPrice === "" ? "" : Number(createPrice)) +
      "|" +
      createFor.providerUserId;

    if (lastSigRef.current === sig) return; // evita doble click
    lastSigRef.current = sig;

    try {
      setCreating(true);
      setCreateMsg(null);

      await api("/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key":
            globalThis.crypto?.randomUUID?.() ??
            `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
        body: JSON.stringify({
          serviceTypeId: createStId,
          title: createTitle || "Solicitud",
          description: createDesc || undefined,
          address: "Cercanías",
          lat: coords.lat,
          lng: coords.lng,
          priceOffered: createPrice === "" ? undefined : Number(createPrice),
        }),
      });

      setCreateMsg("✅ Pedido creado. Revisá Mis solicitudes.");
      setJustCreated((prev) => {
        const n = new Set(prev);
        n.add(createFor.providerUserId);
        return n;
      });

      setTimeout(() => setCreateOpen(false), 1200);
    } catch (e: any) {
      setCreateMsg(`❌ ${e?.message || "Error creando el pedido"}`);
      lastSigRef.current = null; // permite reintentar
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Servicios</h1>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Rubro</label>
          <select
            value={catId ?? ""}
            onChange={(e) => setCatId(e.target.value ? Number(e.target.value) : null)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">— Seleccionar —</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Ordenar por</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="w-full border rounded px-3 py-2"
          >
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
            onChange={(e) => setRadiusKm(Number(e.target.value))}
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
              {items.map((p) => {
                const disabled = justCreated.has(p.providerUserId);
                return (
                  <li
                    key={p.providerUserId}
                    className={`border rounded p-3 flex gap-3 items-center ${
                      selectedId === p.providerUserId ? "ring-2 ring-blue-400" : ""
                    }`}
                    onMouseEnter={() => setSelectedId(p.providerUserId)}
                  >
                    {p.photoUrl && (
                      <img
                        src={p.photoUrl}
                        alt={p.displayName ?? "Proveedor"}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">
                        {p.displayName ?? `Proveedor ${p.providerUserId}`}
                      </div>
                      <div className="text-sm text-gray-600">
                        {stars(Number(p.ratingAvg))} <span className="ml-1">({p.ratingCount})</span>
                        <span className="ml-3">{p.distanceKm.toFixed(2)} km</span>
                        {p.basePrice && (
                          <span className="ml-3">
                            Desde ${Number(p.basePrice).toLocaleString()}
                          </span>
                        )}
                      </div>
                      {p.serviceTypeName && (
                        <div className="text-xs text-gray-500 mt-0.5">{p.serviceTypeName}</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/providers/${p.providerUserId}`}
                        className="border rounded px-3 py-1 hover:bg-gray-50 text-sm"
                      >
                        Ver perfil
                      </Link>
                      <button
                        className={`rounded px-3 py-1 text-sm ${
                          disabled
                            ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                            : "bg-black text-white"
                        }`}
                        onClick={() => openCreate(p)}
                        disabled={disabled}
                        title={
                          disabled
                            ? "Ya creaste un pedido para este proveedor"
                            : "Crear solicitud"
                        }
                      >
                        {disabled ? "Pedido creado" : "Solicitar"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {/* Modal crear solicitud */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Crear solicitud"
      >
        {createFor && (
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              Para: <b>{createFor.displayName ?? `Proveedor ${createFor.providerUserId}`}</b>
            </div>

            <div>
              <label className="block text-sm text-gray-600">Tipo de servicio</label>
              <select
                value={createStId ?? ""}
                onChange={(e) =>
                  setCreateStId(e.target.value ? Number(e.target.value) : null)
                }
                className="w-full border rounded px-3 py-2"
              >
                <option value="">— Seleccionar —</option>
                {cats
                  .find((c) => c.id === catId)
                  ?.serviceTypes?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-600">Título</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600">Descripción (opcional)</label>
              <textarea
                className="w-full border rounded px-3 py-2"
                rows={3}
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600">
                Precio ofrecido (opcional)
              </label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2"
                value={createPrice}
                onChange={(e) =>
                  setCreatePrice(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder={
                  createFor.basePrice
                    ? `Sugerido: ${Number(createFor.basePrice).toLocaleString()}`
                    : ""
                }
              />
            </div>

            <div className="text-xs text-gray-500">
              Usará tu ubicación actual: {coords.lat?.toFixed(5)}, {coords.lng?.toFixed(5)}
            </div>

            {createMsg && <div className="text-sm">{createMsg}</div>}

            <div className="flex justify-end gap-2 pt-1">
              <button
                className="px-4 py-2 rounded border"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                Cerrar
              </button>
              <button
                className="px-4 py-2 rounded bg-black text-white disabled:bg-gray-300 disabled:text-gray-700"
                onClick={submitCreate}
                disabled={creating}
              >
                {creating ? "Creando…" : "Crear pedido"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
