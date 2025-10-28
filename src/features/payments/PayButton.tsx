"use client";
import { useState } from "react";
import { RequireAuthButton } from "@/components/ui/RequireAuth";
import { usePayments } from "./usePayments";

export default function PayButton({ requestId }: { requestId: number }) {
  const { start } = usePayments();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onPay() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      // ⬅️ SOLO requestId
      const pref = await start({ requestId });

      // Si hay URL de pago (MP real), redirigimos
      if (pref?.init_point) {
        window.location.href = pref.init_point;
        return;
      }

      // Modo FAKE (MP_FAKE=1): el back ya aprobó; recargamos para ver estado
      setMsg("Pago confirmado (modo test). Actualizando…");
      window.location.reload();
    } catch (e: any) {
      setMsg(e?.message ?? "Error iniciando el pago");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <RequireAuthButton
        onClick={onPay}
        disabled={busy}
        className="rounded-lg bg-black text-white px-4 py-2 disabled:opacity-60"
      >
        {busy ? "Procesando…" : "Pagar ahora"}
      </RequireAuthButton>
      {msg && <span className="text-sm text-gray-700">{msg}</span>}
    </div>
  );
}
