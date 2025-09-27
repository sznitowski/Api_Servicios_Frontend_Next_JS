'use client';

import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from '@/lib/config';

export default function AIPage() {
  const { token, user, ready } = useAuth();
  const [prompt, setPrompt] = useState('Dame 2 bullets sobre SSE en Nest');
  const [out, setOut] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string| null>(null);

  if (!ready) return <div className="p-6">Cargando…</div>;
  if (!user) return <div className="p-6">No autenticado.</div>;

  async function run() {
    setErr(null); setLoading(true); setOut('');
    try {
      const r = await api<{ text: string }>('/ai/echo', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      }, token!);
      setOut(r.text);
    } catch (e:any) { setErr(e.message || 'Error'); }
    finally { setLoading(false); }
  }

  return (
    <div className="p-6 space-y-3">
      <h1 className="text-xl font-bold">AI Playground</h1>
      <textarea className="border p-2 w-full h-24" value={prompt} onChange={e=>setPrompt(e.target.value)} />
      <button className="bg-black text-white px-4 py-2 rounded" onClick={run} disabled={loading}>
        {loading ? 'Consultando…' : 'Enviar'}
      </button>
      {err && <p className="text-red-600">{err}</p>}
      {out && (
        <pre className="border p-3 whitespace-pre-wrap rounded">{out}</pre>
      )}
    </div>
  );
}
