// src/components/RequestCreateDialog.tsx
'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Props = {
  open: boolean;
  onClose(): void;
  token: string;
  serviceTypeId: number;
  serviceTypeName: string;
  basePrice?: number | null;
  lat: number;
  lng: number;
};

export default function RequestCreateDialog(props: Props) {
  const { open, onClose, token, serviceTypeId, serviceTypeName, basePrice, lat, lng } = props;

  const [title, setTitle] = useState(`Solicitud rápida - ${serviceTypeName}`);
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('Mi ubicación');
  const [priceOffered, setPriceOffered] = useState<number | ''>(basePrice ?? '');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setTitle(`Solicitud rápida - ${serviceTypeName}`);
    setPriceOffered(basePrice ?? '');
  }, [serviceTypeName, basePrice]);

  if (!open) return null;

  async function submit() {
    try {
      setLoading(true);
      setMsg(null);
      await apiFetch('/requests', {
        method: 'POST',
        token,
        body: JSON.stringify({
          serviceTypeId,
          title,
          description,
          address,
          lat,
          lng,
          priceOffered: priceOffered === '' ? undefined : Number(priceOffered),
        }),
      });
      setMsg('✅ Pedido creado. Lo verás en “Mis solicitudes”.');
    } catch (e: any) {
      setMsg(`❌ ${e.message || 'Error creando el pedido'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl w-[560px] max-w-[92vw] p-5">
        <h3 className="text-lg font-semibold mb-3">Crear solicitud</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600">Título</label>
            <input className="border rounded w-full p-2" value={title} onChange={e=>setTitle(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-gray-600">Descripción (opcional)</label>
            <textarea className="border rounded w-full p-2" rows={3} value={description} onChange={e=>setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600">Precio ofrecido (opcional)</label>
              <input type="number" className="border rounded w-full p-2" value={priceOffered} onChange={e=>setPriceOffered(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm text-gray-600">Dirección</label>
              <input className="border rounded w-full p-2" value={address} onChange={e=>setAddress(e.target.value)} />
            </div>
          </div>

          <div className="text-xs text-gray-500">
            Lat/Lng: {lat.toFixed(5)}, {lng.toFixed(5)} — Tipo: {serviceTypeName}
          </div>

          {msg && <div className="text-sm">{msg}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button className="px-4 py-2 rounded border" onClick={onClose} disabled={loading}>Cerrar</button>
            <button className="px-4 py-2 rounded bg-black text-white" onClick={submit} disabled={loading}>
              {loading ? 'Creando…' : 'Crear pedido'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
