"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/lib/auth";

// Ajustá esta lista si tu backend maneja otros tipos
const ALL_TYPES = ["OFFERED", "IN_PROGRESS", "DONE"] as const;
type TypeKey = typeof ALL_TYPES[number];

type PrefsResp = { disabledTypes: string[] } | { ok: boolean; disabledTypes?: string[] };

export default function NotifSettingsPage() {
  const { token } = useAuth();
  const { api, apiFetch } = useApi();

  const [disabled, setDisabled] = useState<Record<TypeKey, boolean>>({
    OFFERED: false,
    IN_PROGRESS: false,
    DONE: false,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let alive = true;
    (async () => {
      setLoading(true);
      setMsg(null);
      setErr(null);
      try {
        // Intento 1: GET /notifications/prefs
        let data: any;
        try {
          data = await api<PrefsResp>("/notifications/prefs");
        } catch {
          // Si tu backend no tiene GET, podés inicializar vacío
          data = { disabledTypes: [] };
        }
        if (!alive) return;

        const dts = (data?.disabledTypes ?? []) as string[];
        const next: Record<TypeKey, boolean> = { OFFERED: false, IN_PROGRESS: false, DONE: false };
        ALL_TYPES.forEach((t) => (next[t] = dts.includes(t)));
        setDisabled(next);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Error leyendo preferencias");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token, api]);

  const toggle = (t: TypeKey) =>
    setDisabled((prev) => ({ ...prev, [t]: !prev[t] }));

  const save = async () => {
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const disabledTypes = ALL_TYPES.filter((t) => disabled[t]);
      const res = await apiFetch("/notifications/prefs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabledTypes }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Error guardando preferencias");
      }
      setMsg("Preferencias guardadas ✔︎");
    } catch (e: any) {
      setErr(e?.message ?? "Error guardando preferencias");
    } finally {
      setSaving(false);
    }
  };

  if (!token) return <div className="p-6">No autenticado.</div>;
  if (loading) return <div className="p-6">Cargando…</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Preferencias de notificaciones</h1>

      <p className="text-sm text-gray-600">
        Elegí qué tipos de notificación querés silenciar. Las silenciadas no
        incrementarán el badge ni aparecerán por SSE (servidor).
      </p>

      <div className="space-y-2">
        {ALL_TYPES.map((t) => (
          <label key={t} className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={disabled[t]}
              onChange={() => toggle(t)}
            />
            <span>{t}</span>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="border px-3 py-1 rounded disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
        {msg && <span className="text-green-700">{msg}</span>}
        {err && <span className="text-red-600">{err}</span>}
      </div>
    </div>
  );
}
