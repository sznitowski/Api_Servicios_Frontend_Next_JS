// app/providers/[id]/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import {
  awaitedMetadata,
  withAwaitedPage,
  type DefaultSearchParams,
} from "@/lib/awaitParams";

/* ================== Tipos ================== */
type ProviderProfilePublic = {
  user: { id: number; name?: string | null };
  displayName?: string | null;
  photoUrl?: string | null;
  bio?: string | null;
  ratingAvg: string | number | null;
  ratingCount: number;
  verified: boolean | number;
  updatedAt?: string;
};

type ServiceTypeLite = {
  id: number;
  serviceTypeId: number;
  serviceTypeName: string;
  basePrice: string | null;
  active: boolean;
};

type Rating = {
  id: number;
  score: number;
  comment?: string | null;
  createdAt: string;
  rater?: { id: number; email?: string; name?: string } | null;
  request?: { id: number; title?: string | null } | null;
};

type RatingsResponse =
  | { items: Rating[]; meta?: { page: number; limit: number; total: number; pages: number } }
  | Rating[];

type Summary = {
  ratingAvg: number;
  ratingCount: number;
  breakdown: Record<"1" | "2" | "3" | "4" | "5", number>;
};

type ProfileSearchParams = DefaultSearchParams & {
  page?: string | string[];
};

/* ================== Helper API ================== */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3000";

async function api<T>(path: string, revalidate = 60): Promise<T> {
  const url = path.startsWith("/api") ? `${API_BASE}${path}` : `${API_BASE}/api${path}`;
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

/* ================== Metadata (awaited) ================== */
export const generateMetadata = awaitedMetadata<{ id: string }>(async ({ id }): Promise<Metadata> => {
  const numId = Number(id);
  try {
    const p = await api<ProviderProfilePublic>(`/providers/id/${numId}`, 120);
    const name = p.displayName || p.user?.name || `Proveedor #${numId}`;
    const description = p.bio || `Perfil público del proveedor ${name}. Calificaciones y servicios.`;
    const images = p.photoUrl ? [{ url: p.photoUrl }] : undefined;
    return {
      title: `${name} | Proveedor`,
      description,
      openGraph: { title: `${name} | Proveedor`, description, images },
    };
  } catch {
    return { title: `Proveedor #${numId}`, description: "Perfil de proveedor" };
  }
});

/* ================== Página (awaited) ================== */
export default withAwaitedPage<{ id: string }, ProfileSearchParams>(
  async ({ params, searchParams }) => {
    const providerId = Number(params.id);
    const pageRaw = searchParams.page;
    const page = Number(Array.isArray(pageRaw) ? pageRaw[0] : pageRaw) || 1;

    const PAGE_SIZE = 10;

    if (!Number.isFinite(providerId) || providerId <= 0) {
      return <div className="p-6">ID inválido.</div>;
    }

    let profile: ProviderProfilePublic | null = null;
    let serviceTypes: ServiceTypeLite[] = [];
    let summary: Summary | null = null;
    let ratings: Rating[] = [];
    let pages = 1;

    try {
      const [p, st, s, r] = await Promise.all([
        api<ProviderProfilePublic>(`/providers/id/${providerId}`),
        api<any>(`/providers/id/${providerId}/service-types`),
        api<Summary>(`/providers/id/${providerId}/ratings/summary`),
        api<RatingsResponse>(`/providers/id/${providerId}/ratings?page=${page}&limit=${PAGE_SIZE}`),
      ]);

      profile = p ?? null;
      serviceTypes = Array.isArray(st) ? st : st?.value ?? [];
      summary =
        s ?? { ratingAvg: 0, ratingCount: 0, breakdown: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 } };

      const items = Array.isArray(r) ? r : r?.items ?? [];
      const meta = Array.isArray(r) ? null : r?.meta ?? null;
      ratings = items.map((x: any) => ({
        id: x.id,
        score: x.stars ?? x.score ?? 0,
        comment: x.comment ?? null,
        createdAt: x.createdAt ?? x.created_at,
        rater: x.rater ?? null,
        request: x.request ? { id: x.request.id, title: x.request?.title } : null,
      }));
      pages = meta?.pages ?? 1;
    } catch (e: any) {
      if (String(e.message) === "404") {
        return <div className="p-6">Proveedor no encontrado.</div>;
      }
      return <div className="p-6 text-red-600">Error cargando perfil.</div>;
    }

    const name = profile?.displayName || profile?.user?.name || `Proveedor #${providerId}`;

    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/services" className="underline text-sm">
            ← Volver
          </Link>
          <h1 className="text-2xl font-semibold">{name}</h1>
          <div />
        </div>

        {/* Perfil básico */}
        <div className="border rounded-md p-4 flex gap-4 items-start">
          {profile?.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.photoUrl}
              alt={name}
              className="w-20 h-20 rounded-full object-cover border"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-200 grid place-items-center text-xl">👤</div>
          )}
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-3">
              <Stars value={Number(profile?.ratingAvg ?? 0)} />
              <span className="text-gray-600">
                {Number(profile?.ratingAvg ?? 0).toFixed(2)} · {profile?.ratingCount ?? 0} reseña(s)
              </span>
              {profile?.verified ? (
                <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">Verificado</span>
              ) : null}
            </div>
            {profile?.bio ? <div className="text-sm text-gray-700">{profile.bio}</div> : null}
            {profile?.updatedAt ? (
              <div className="text-xs text-gray-500">
                Actualizado: <span>{fmtDate(profile.updatedAt)}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Tipos de servicio */}
        <div className="border rounded-md p-4">
          <div className="font-medium mb-2">Servicios ofrecidos</div>
          {serviceTypes.length === 0 ? (
            <div className="text-sm text-gray-500">Sin servicios activos.</div>
          ) : (
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {serviceTypes.map((s) => (
                <li key={s.id} className="border rounded p-3">
                  <div className="text-sm font-medium">{s.serviceTypeName}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {s.basePrice ? `Desde $${Number(s.basePrice).toLocaleString()}` : "A convenir"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Resumen de ratings */}
        <div className="border rounded-md p-4">
          <div className="flex items-center justify-between">
            <div className="font-medium">Resumen de calificaciones</div>
            <div className="text-sm text-gray-600">{summary?.ratingCount ?? 0} total</div>
          </div>

          <div className="mt-3 space-y-2">
            {(["5", "4", "3", "2", "1"] as const).map((s) => {
              const count = summary?.breakdown?.[s] ?? 0;
              const total = summary?.ratingCount ?? 0;
              const pct = total ? Math.round((count / total) * 100) : 0;
              return (
                <div key={s} className="flex items-center gap-3 text-sm">
                  <span className="w-7">{s}★</span>
                  <div className="flex-1 h-3 bg-gray-100 rounded">
                    <div className="h-3 bg-amber-400 rounded" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-16 text-right text-gray-600">
                    {count} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lista de reseñas + pager SSR */}
        <div className="border rounded-md p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">Reseñas</div>
          </div>

          {ratings.length === 0 ? (
            <div className="text-sm text-gray-500">Sin reseñas.</div>
          ) : (
            <ul className="space-y-4">
              {ratings.map((r) => (
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

          <div className="mt-3 flex gap-2">
            <Link
              className={`border rounded px-3 py-1 text-sm ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
              href={`/providers/${providerId}?page=${Math.max(1, page - 1)}`}
            >
              ← Anterior
            </Link>
            <Link
              className={`border rounded px-3 py-1 text-sm ${page >= pages ? "pointer-events-none opacity-50" : ""}`}
              href={`/providers/${providerId}?page=${Math.min(pages, page + 1)}`}
            >
              Siguiente →
            </Link>
          </div>
        </div>
      </div>
    );
  }
);

/* ================== helpers ================== */
function Stars({ value }: { value: number }) {
  const full = Math.round(Number(value) || 0);
  return (
    <div className="text-amber-500 text-lg leading-none" title={`${value}/5`}>
      {"★★★★★".slice(0, full)}
      <span className="text-gray-300">{"★★★★★".slice(full)}</span>
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
