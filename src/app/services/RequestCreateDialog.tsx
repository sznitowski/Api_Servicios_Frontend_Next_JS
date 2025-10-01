'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import InlineAlert from '@/components/ui/InlineAlert';
import MapView from '@/components/MapView';
import { makeIdemKey } from '@/lib/idempotency';

type Props = {
  open: boolean;
  onClose: () => void;
  providerUserId: number;
  providerName?: string | null;
  serviceTypeId: number;
  center?: { lat: number; lng: number }; // ubicación inicial para el mapa
};

export default function RequestCreateDialog({
  open,
  onClose,
  providerUserId,
  providerName,
  serviceTypeId,
  center,
}: Props) {
  const [title, setTitle] = useState('Trabajo en domicilio');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('San Miguel de Tucumán');
  const [lat, setLat] = useState<number | null>(center?.lat ?? null);
  const [lng, setLng] = useState<number | null>(center?.lng ?? null);
  const [priceOffered, setPriceOffered] = useState<number>(20000);
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // clave de idempotencia por intento
  const idemRef = useRef<string | null>(null);
  const getIdem = () => (idemRef.current ??= makeIdemKey());

  // geo rápida si faltan coords
  useEffect(() => {
    if (lat == null || lng == null) {
      navigator.geolocation?.getCurrentPosition(
        (p) => {
          setLat(p.coords.latitude);
          setLng(p.coords.longitude);
        },
        () => {
          setLat(-26.8241);
          setLng(-65.2226);
        }
      );
    }
    // reset estado al abrir/cerrar
    if (!open) {
      setOk(false);
      setErr(null);
      idemRef.current = null;
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const markers = useMemo(
    () =>
      lat != null && lng != null
        ? [
            {
              id: 0,
              lat,
              lng,
              label: providerName ?? `Proveedor ${providerUserId}`,
              sublabel: 'Tu ubicación para el trabajo',
              selected: true,
            },
          ]
        : [],
    [lat, lng, providerName, providerUserId]
  );

  async function submit() {
    if (loading) return;
    try {
      setErr(null);
      setOk(false);
      setLoading(true);

      if (lat == null || lng == null) {
        throw new Error('No se obtuvo la ubicación.');
      }

      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': getIdem(),
        },
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

      setOk(true);
      // consumimos la clave para el próximo pedido
      idemRef.current = null;
    } catch (e: any) {
      setErr(e.message || 'Error enviando el pedido');
      // si es error de red/timeout mantengo la idem para reintentar seguro
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} className="w-[96vw] max-w-5xl">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-lg font-semibold">Crear solicitud</h2>
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">
          Cerrar
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Mapa de referencia */}
        <div className="h-[380px] border rounded overflow-hidden">
          <MapView
            center={
              lat != null && lng != null
                ? { lat, lng }
                : center ?? { lat: -26.8241, lng: -65.2226 }
            }
            markers={markers}
            height={380}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm text-gray-600">Título</span>
            <input className="w-full border rounded px-3 py-2" value={title}
                   onChange={(e) => setTitle(e.target.value)} />
          </label>

          <label className="block">
            <span className="text-sm text-gray-600">Precio ofrecido</span>
            <input className="w-full border rounded px-3 py-2" type="number"
                   value={priceOffered}
                   onChange={(e) => setPriceOffered(Number(e.target.value))} />
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm text-gray-600">Descripción</span>
            <textarea className="w-full border rounded px-3 py-2" rows={3} value={description}
                      onChange={(e) => setDescription(e.target.value)} />
          </label>

          <label className="block">
            <span className="text-sm text-gray-600">Dirección</span>
            <input className="w-full border rounded px-3 py-2" value={address}
                   onChange={(e) => setAddress(e.target.value)} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-gray-600">Lat</span>
              <input className="w-full border rounded px-3 py-2" type="number" step="0.000001"
                     value={lat ?? ''} onChange={(e) => setLat(Number(e.target.value))} />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Lng</span>
              <input className="w-full border rounded px-3 py-2" type="number" step="0.000001"
                     value={lng ?? ''} onChange={(e) => setLng(Number(e.target.value))} />
            </label>
          </div>
        </div>

        {err && <InlineAlert kind="error">{err}</InlineAlert>}
        {ok && <InlineAlert kind="success">✔️ Pedido creado. Revisá “Mis solicitudes”.</InlineAlert>}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded border hover:bg-gray-50">
            Cerrar
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Spinner size={16} />}
            Crear pedido
          </button>
        </div>
      </div>
    </Modal>
  );
}
