'use client';

import { useAuth } from './auth/AuthContext';
import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const { user, login, logout, ready } = useAuth();
  const [email, setEmail] = useState('client2@demo.com');
  const [password, setPassword] = useState('123456');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!ready) return <div className="p-6">Cargando…</div>;

  if (!user) {
    return (
      <div className="p-6 max-w-sm space-y-3">
        <h1 className="text-xl font-bold">Ingresá</h1>
        <input className="border p-2 w-full" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" />
        <input className="border p-2 w-full" value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Password" />
        <button
          className="bg-black text-white px-4 py-2 rounded"
          onClick={async ()=>{ setErr(null); setLoading(true); try{ await login(email, password); } catch(e:any){ setErr(e.message||'Error'); } finally{ setLoading(false); } }}
          disabled={loading}
        >
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
        {err && <p className="text-red-600">{err}</p>}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-3">
      <div className="flex items-center gap-2">
        <span>Hola, <b>{user.email}</b></span>
        <button className="border px-3 py-1 rounded" onClick={logout}>Salir</button>
      </div>

      <div className="space-x-3">
        <Link href="/dashboard" className="underline">Dashboard (SSE)</Link>
        <Link href="/ai" className="underline">AI Playground</Link>
      </div>
    </div>
  );
}
