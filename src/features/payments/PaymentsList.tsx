"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import PaymentBadge from "./PaymentBadge";

type Row = {
  id: number;
  provider: string;          // 'MP'
  method: string | null;     // 'card' | ...
  status: string;            // PENDING | APPROVED | ...
  amount: number | string | null;
  currency: string | null;   // 'ARS'
  approved_at?: string | null;
  created_at?: string | null;
  external_payment_id?: string | null;
  intent_id?: string | null;
};

function fmtMoney(v?: number | string | null) {
  if (v == null || v === "") return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);
  } catch {
    return `$ ${Number(n).toFixed(2)}`;
  }
}
function fmtDate(s?: string | null) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return d.toLocaleString();
  } catch {
    return s;
  }
}

export default function PaymentsList({ requestId }: { requestId: number }) {
  const { api } = useApi();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await api<Row[]>(`/payments/requests/${requestId}`);
      setRows(Array.isArray(r) ? r : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  return (
    <div className="border rounded-md p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">Pagos</div>
        <button
          onClick={load}
          className="text-sm border rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-60"
          disabled={loading}
          title="Refrescar"
        >
          {loading ? "Cargando…" : "Refrescar"}
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="text-sm text-gray-500">Sin pagos.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Importe</th>
                <th className="px-3 py-2">Moneda</th>
                <th className="px-3 py-2">Proveedor</th>
                <th className="px-3 py-2">Método</th>
                <th className="px-3 py-2">Intent</th>
                <th className="px-3 py-2">Ext. ID</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{r.id}</td>
                  <td className="px-3 py-2">
                    {fmtDate(r.approved_at) !== "—" ? fmtDate(r.approved_at) : fmtDate(r.created_at)}
                  </td>
                  <td className="px-3 py-2">
                    <PaymentBadge status={r.status} />
                  </td>
                  <td className="px-3 py-2">{fmtMoney(r.amount)}</td>
                  <td className="px-3 py-2">{r.currency ?? "—"}</td>
                  <td className="px-3 py-2">{r.provider}</td>
                  <td className="px-3 py-2">{r.method ?? "—"}</td>
                  <td className="px-3 py-2 truncate max-w-[180px]">{r.intent_id ?? "—"}</td>
                  <td className="px-3 py-2 truncate max-w-[220px]">{r.external_payment_id ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
