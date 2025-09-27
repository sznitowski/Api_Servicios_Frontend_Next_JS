'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/app/auth/AuthContext';
import { useApi } from '@/hooks/useApi';
import { useSSE } from '@/hooks/useSSE';

type Notif = {
  id: number;
  type: string;
  message: string;
  createdAt: string;
  seenAt?: string | null;
  request?: { id: number; title?: string; status?: string | null } | null;
};

type ListResp = {
  items: Notif[];
  meta: { page: number; limit: number; total: number; pages: number };
};

export default function NotificationsPage() {
  const { token, ready, user } = useAuth();
  const { apiFetch } = useApi();

  // URL del stream SSE (compatible con el guard que acepta access_token en query)
  const sseUrl = useMemo(
    () =>
      token
        ? `${process.env.NEXT_PUBLIC_API_URL}/notifications/stream?access_token=${token}`
        : '',
    [token],
  );

  const { lastEvent } = useSSE(sseUrl);

  const [items, setItems] = useState<Notif[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);

  async function load(p = 1) {
    setLoading(true);
    try {
      const res = await apiFetch(`/notifications/me?page=${p}&limit=10`);
      if (res.ok) {
        const data: ListResp = await res.json();
        setItems(data.items);
        setPage(data.meta.page);
        setPages(data.meta.pages);
      }
    } finally {
      setLoading(false);
    }
  }

  // carga inicial cuando hay sesión lista
  useEffect(() => {
    if (!ready || !user) return;
    load(1);
  }, [ready, user]);

  // ante un evento SSE, prepend a la lista (soft realtime)
  useEffect(() => {
    if (!lastEvent) return;
    setItems((prev) => [lastEvent as unknown as Notif, ...prev].slice(0, 50));
  }, [lastEvent]);

  if (!ready) return <div className="p-6">Cargando…</div>;
  if (!user) return <div className="p-6">No autenticado.</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Mis notificaciones</h1>

      {loading ? <div>Cargando…</div> : null}

      <ul className="space-y-2">
        {items.map((n) => (
          <li key={n.id} className="border rounded p-3">
            <div className="text-sm text-gray-500">
              {new Date(n.createdAt).toLocaleString()}
            </div>
            <div className="font-medium">{n.type}</div>
            <div>{n.message}</div>
            {n.request ? (
              <div className="text-sm text-gray-600">
                Req #{n.request.id} • {n.request.title}
              </div>
            ) : null}
          </li>
        ))}
        {items.length === 0 && !loading ? (
          <li>No hay notificaciones.</li>
        ) : null}
      </ul>

      <div className="flex items-center gap-2">
        <button
          className="px-3 py-1 border rounded"
          disabled={page <= 1 || loading}
          onClick={() => load(page - 1)}
        >
          Anterior
        </button>
        <span>
          Página {page} / {pages}
        </span>
        <button
          className="px-3 py-1 border rounded"
          disabled={page >= pages || loading}
          onClick={() => load(page + 1)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
