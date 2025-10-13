// components/RequestActions.tsx
'use client';
import { useState } from 'react';
//import { useApi } from '@/lib/useApi'; // o donde lo tengas
import { useApi } from '@/hooks/useApi'; // o donde lo tengas

type Status = 'PENDING'|'OFFERED'|'ACCEPTED'|'IN_PROGRESS'|'DONE'|'CANCELLED';
type Role = 'CLIENT'|'PROVIDER';

export function RequestActions({
  req,
  me,          // { id:number, role:Role }
  onChanged,   // () => void (llama mutate/refresh del detalle)
}: {
  req: {
    id: number;
    status: Status;
    priceOffered?: string | null;
    priceAgreed?: string | null;
    provider?: { id: number } | null;
  };
  me: { id: number; role: Role };
  onChanged: () => void;
}) {
  const api = useApi();
  const [busy, setBusy] = useState(false);
  const [offer, setOffer] = useState<string>(req.priceOffered ?? '');
  const [agree, setAgree] = useState<string>(req.priceOffered ?? '');

  const act = async (path: string, body?: any) => {
    setBusy(true);
    try {
      await api.post(`/requests/${req.id}/${path}`, body);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const canCancelClient   = me.role === 'CLIENT'   && ['PENDING','OFFERED','ACCEPTED'].includes(req.status);
  const canCancelProvider = me.role === 'PROVIDER' && ['OFFERED','ACCEPTED'].includes(req.status);

  // ----- PROVEEDOR -----
  if (me.role === 'PROVIDER') {
    return (
      <div className="flex flex-wrap items-center gap-3">
        {/* Reclamar/Ofertar: si está PENDING y no tiene provider o está apuntado a mí */}
        {req.status === 'PENDING' && (!req.provider || req.provider.id === me.id) && (
          <>
            <input
              type="number"
              className="border rounded px-2 py-1"
              placeholder="Precio ofrecido"
              value={offer}
              onChange={e => setOffer(e.target.value)}
            />
            <button
              className="btn btn-primary"
              disabled={busy}
              onClick={() => act('claim', { priceOffered: Number(offer) })}
            >
              Ofertar
            </button>
          </>
        )}

        {/* Iniciar */}
        {req.status === 'ACCEPTED' && (
          <button className="btn btn-primary" disabled={busy} onClick={() => act('start')}>
            Iniciar trabajo
          </button>
        )}

        {/* Completar */}
        {req.status === 'IN_PROGRESS' && (
          <button className="btn btn-primary" disabled={busy} onClick={() => act('complete')}>
            Marcar como terminado
          </button>
        )}

        {/* Cancelar (proveedor) */}
        {canCancelProvider && (
          <button
            className="btn btn-outline"
            disabled={busy}
            onClick={() => act('cancel', { reason: 'Cancelado por proveedor' })}
          >
            Cancelar
          </button>
        )}
      </div>
    );
  }

  // ----- CLIENTE -----
  if (me.role === 'CLIENT') {
    return (
      <div className="flex flex-wrap items-center gap-3">
        {/* Aceptar oferta */}
        {req.status === 'OFFERED' && (
          <>
            <input
              type="number"
              className="border rounded px-2 py-1"
              placeholder="Precio acordado"
              value={agree}
              onChange={e => setAgree(e.target.value)}
            />
            <button
              className="btn btn-primary"
              disabled={busy}
              onClick={() => act('accept', { priceAgreed: Number(agree) })}
            >
              Aceptar
            </button>
          </>
        )}

        {/* Cancelar (cliente) */}
        {canCancelClient && (
          <button
            className="btn btn-outline"
            disabled={busy}
            onClick={() => act('cancel', { reason: 'Cancelado por cliente' })}
          >
            Cancelar
          </button>
        )}
      </div>
    );
  }

  return null;
}
