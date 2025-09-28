'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/hooks/useApi';
import { useSSE } from '@/hooks/useSSE';

type Notif = {
  id: number;
  type: string;
  message: string;
  createdAt: string;
  seenAt?: string | null;
  request?: { id: number; title?: string; status?: string } | null;
};

type ListResp = {
  items: Notif[];
  meta: { page: number; limit: number; total: number; pages: number };
};

export default function NotificationsPage() {
  const { token } = useAuth();
  const { apiFetch } = useApi();

  const [items, setItems] = useState<Notif[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // -------- carga inicial / paginado --------
  useEffect(() => {
    let alive = true;

    // Si no hay token, no intentamos pedir y salimos del modo "cargando"
    if (!token) {
      setItems([]);
      setPages(1);
      setLoading(false);
      return () => { alive = false; };
    }

    (async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/notifications/me?page=${page}&limit=10`, {}, token);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ListResp = await res.json();
        if (!alive) return;
        setItems(data.items);
        setPages(data.meta.pages);
      } catch {
        if (alive) setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [token, page, apiFetch]);

  // -------- SSE: actualizamos al vuelo --------
  const ssePath = useMemo(
    () => `${process.env.NEXT_PUBLIC_API_URL}/notifications/stream`,
    []
  );
  const { lastEvent } = useSSE(ssePath);

  useEffect(() => {
    if (!lastEvent) return;
    try {
      const n = lastEvent as Notif;
      if (n && n.id) {
        setItems(prev => [n, ...prev].slice(0, 10));
      }
    } catch { /* ignore */ }
  }, [lastEvent]);

  // -------- UI --------
  if (loading) return <div className="p-6">Cargando…</div>;
  if (!token) return <div className="p-6">No autenticado.</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Notificaciones</h1>

      {items.length === 0 ? (
        <p>No hay notificaciones.</p>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Tipo</th>
              <th className="p-2 text-left">Mensaje</th>
              <th className="p-2 text-left">Creado</th>
            </tr>
          </thead>
          <tbody>
            {items.map(n => (
              <tr key={n.id} className="border-t">
                <td className="p-2">{n.id}</td>
                <td className="p-2">{n.type}</td>
                <td className="p-2">{n.message}</td>
                <td className="p-2">
                  {new Date(n.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          className="border px-3 py-1 rounded"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page <= 1}
        >
          ← Anterior
        </button>
        <span>Página {page} de {pages}</span>
        <button
          className="border px-3 py-1 rounded"
          onClick={() => setPage(p => Math.min(pages, p + 1))}
          disabled={page >= pages}
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}
