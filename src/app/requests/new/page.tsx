'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/app/auth/AuthContext';

export default function NewRequestPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const qs = useSearchParams();

  const [providerUserId, setProviderUserId] = useState<number | null>(null);
  const [serviceTypeId, setServiceTypeId] = useState<number | null>(null);
  const [title, setTitle] = useState('Trabajo en domicilio');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('San Miguel de Tucumán');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [priceOffered, setPriceOffered] = useState<number>(20000);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const p = qs.get('providerUserId');
    const st = qs.get('serviceTypeId');
    setProviderUserId(p ? Number(p) : null);
    setServiceTypeId(st ? Number(st) : null);

    // geo inicial rápida (puede reemplazarse por dirección del usuario)
    if (!lat || !lng) {
      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
        },
        () => {
          // fallback SMT
          setLat(-26.8241);
          setLng(-65.2226);
        }
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return <div className="p-6">Cargando…</div>;
  if (!user) {
    return <div className="p-6">Necesitás iniciar sesión.</div>;
  }

  const submit = async () => {
    try {
      setErr(null);
      setLoading(true);
      if (!providerUserId || !serviceTypeId || lat == null || lng == null) {
        setErr('Faltan datos obligatorios (proveedor / tipo / ubicación).');
        return;
      }

      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerUserId,
          serviceTypeId,
          title,
          description,
          address,
          lat,
          lng,
          priceOffered,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || `Error HTTP ${res.status}`);
      }

      // Redirigimos a listado de pedidos del cliente (ajusta la ruta si difiere)
      router.push('/requests');
    } catch (e:any) {
      setErr(e.message || 'Error enviando el pedido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl p-6 space-y-4">
      <h1 className="text-xl font-bold">Nuevo pedido</h1>

      <div className="text-sm text-gray-600">
        Proveedor: <b>{qs.get('displayName') ?? providerUserId}</b>
      </div>

      <input className="border p-2 w-full" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Título" />
      <textarea className="border p-2 w-full" rows={4} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Descripción" />
      <input className="border p-2 w-full" value={address} onChange={e=>setAddress(e.target.value)} placeholder="Dirección" />

      <div className="grid grid-cols-2 gap-3">
        <input className="border p-2" type="number" step="0.000001" value={lat ?? ''} onChange={e=>setLat(Number(e.target.value))} placeholder="Lat" />
        <input className="border p-2" type="number" step="0.000001" value={lng ?? ''} onChange={e=>setLng(Number(e.target.value))} placeholder="Lng" />
      </div>

      <label className="block">
        <span className="text-sm">Precio ofrecido</span>
        <input className="border p-2 w-full" type="number" value={priceOffered} onChange={e=>setPriceOffered(Number(e.target.value))} />
      </label>

      {err && <div className="text-red-600">{err}</div>}

      <button
        onClick={submit}
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Enviando…' : 'Enviar pedido'}
      </button>
    </div>
  );
}
