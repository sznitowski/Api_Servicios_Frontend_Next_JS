'use client';

import { useAuth } from '../auth/AuthContext';
import { useEffect, useState } from 'react';
import { API_BASE, api } from '@/lib/config';

type Notif = { id:number; type:string; message:string; createdAt:string; seenAt?:string|null };

export default function Dashboard() {
  const { user, token, ready } = useAuth();
  const [unseen, setUnseen] = useState<number>(0);
  const [items, setItems] = useState<Notif[]>([]);

  useEffect(() => {
    if (!token) return;

    // carga inicial
    api<{ total:number }>('/notifications/me/count', {}, token).then(r=>setUnseen(r.total)).catch(()=>{});
    api<{ items:Notif[] }>('/notifications/me?page=1&limit=10', {}, token).then(r=>setItems(r.items)).catch(()=>{});

    // SSE con access_token en query (compatible con tu guard)
    const es = new EventSource(`${API_BASE}/notifications/stream?access_token=${token}`);
    es.onmessage = (ev) => {
      try {
        const n = JSON.parse(ev.data) as Notif;
        setItems(prev => [n, ...prev].slice(0, 10));
        setUnseen(u => u + 1);
      } catch {}
    };
    es.addEventListener('ping', () => {}); // keepalive

    return () => es.close();
  }, [token]);

  if (!ready) return <div className="p-6">Cargando…</div>;
  if (!user) return <div className="p-6">No autenticado.</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Dashboard</h1>

      <div className="flex items-center gap-4">
        <span className="inline-flex items-center gap-2 border px-3 py-1 rounded">
          🔔 Notificaciones
          <b className="bg-black text-white rounded px-2 py-0.5">{unseen}</b>
        </span>
        <button
          className="border px-3 py-1 rounded"
          onClick={async ()=>{ if(!token) return; await api('/notifications/read-all',{method:'POST'},token); setUnseen(0); }}
        >
          Marcar todas como leídas
        </button>
      </div>

      <ul className="space-y-2">
        {items.map(n => (
          <li key={n.id} className="border rounded p-3">
            <div className="text-sm opacity-60">{new Date(n.createdAt).toLocaleString()}</div>
            <div className="font-semibold">{n.type}</div>
            <div>{n.message}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
