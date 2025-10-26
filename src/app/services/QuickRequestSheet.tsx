"use client";

import React, { useMemo, useState } from "react";
import BottomSheet from "@/components/ui/BottomSheet";
import { RequireAuthButton } from "@/components/ui/RequireAuth";

type ProviderLite = {
  id: number;
  name: string;
  serviceName?: string;
  minPrice?: number;
  distanceKm?: number;
  ratingAvg?: number;
  ratingCount?: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  provider: ProviderLite;
  onConfirm: (payload: { offeredPrice: number; message?: string }) => void | Promise<void>;
};

function money(n?: number) {
  if (!n) return "$ —";
  return n.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
}

export default function QuickRequestSheet({
  open,
  onClose,
  provider,
  onConfirm,
}: Props) {
  const [price, setPrice] = useState<number | "">(
    provider.minPrice ? Math.max(0, provider.minPrice) : ""
  );
  const [msg, setMsg] = useState("");

  const valid = useMemo(() => price !== "", [price]);

  async function handleConfirm() {
    if (!valid) return;
    await onConfirm({ offeredPrice: Number(price), message: msg || undefined });
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Solicitud rápida">
      <div className="space-y-4">
        <div className="rounded-lg border p-3">
          <div className="font-medium">{provider.name}</div>
          <div className="text-sm text-gray-600 flex gap-3 flex-wrap">
            {provider.serviceName && <span>{provider.serviceName}</span>}
            {provider.minPrice != null && (
              <span>Desde {money(provider.minPrice)}</span>
            )}
            {provider.distanceKm != null && (
              <span>{provider.distanceKm.toFixed(1)} km</span>
            )}
            {provider.ratingAvg != null && (
              <span>⭐ {Number(provider.ratingAvg).toFixed(1)} ({provider.ratingCount ?? 0})</span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Precio ofrecido
          </label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2"
            value={price}
            onChange={(e) =>
              setPrice(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder={
              provider.minPrice ? `Sugerido: ${money(provider.minPrice)}` : ""
            }
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Mensaje (opcional)
          </label>
          <textarea
            rows={3}
            className="w-full border rounded px-3 py-2"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Contá brevemente qué necesitás…"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 rounded border" onClick={onClose}>
            Cancelar
          </button>

          {/* Si no hay sesión, este botón lleva a /login?next=… */}
          <RequireAuthButton
            className={`px-4 py-2 rounded text-white ${
              valid ? "bg-black" : "bg-gray-300"
            }`}
            disabled={!valid}
            onClick={handleConfirm}
          >
            Enviar solicitud
          </RequireAuthButton>
        </div>
      </div>
    </BottomSheet>
  );
}
