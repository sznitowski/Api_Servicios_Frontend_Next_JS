'use client';

import { useEffect, useMemo, useState } from 'react';
import { useApi } from '@/hooks/useApi';

type PrefsResp = { disabledTypes: string[] };
type TypesResp = { types: string[] }; // si tu backend lo tiene; si no, caemos a DEFAULT_TYPES

// Lista por defecto (si /notifications/types no existe).
const DEFAULT_TYPES = [
  'OFFERED',
  'ACCEPTED',
  'REJECTED',
  'IN_PROGRESS',
  'CANCELLED',
  'DONE',
  'PRICE_UPDATED',
] as const;

export default function NotificationSettingsPage() {
  const { api, apiFetch } = useApi();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tipos “soportados” por la UI
  const [allTypes, setAllTypes] = useState<string[]>([]);
  // Mapa de habilitado (true = recibir notificaciones de ese tipo)
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});

  // Track para botón “Guardar”
  const dirty = useMemo(() => !loading && !saving, [loading, saving]);

  // Carga inicial: intentamos leer los tipos del servidor, las prefs y armamos el mapa
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        // 1) Tipos soportados (si el endpoint no existe, 404 -> caemos a DEFAULT_TYPES)
        let serverTypes: string[] = [];
        try {
          const t = await api<TypesResp>('/notifications/types');
          // Podría venir como { types: string[] } o directamente string[] en tu backend; cubrimos ambos.
          serverTypes = Array.isArray(t as any) ? (t as any as string[]) : (t?.types ?? []);
        } catch (e: any) {
          serverTypes = [...DEFAULT_TYPES];
        }

        // 2) Preferencias actuales
        const pref = await api<PrefsResp>('/notifications/prefs');
        const disabled = new Set(pref?.disabledTypes ?? []);

        // 3) Unión por si hay tipos en disabled que no están en serverTypes
        const union = Array.from(new Set([...serverTypes, ...disabled]));

        // 4) Mapa enabled (no está en disabled -> true)
        const nextEnabled: Record<string, boolean> = {};
        union.forEach((t) => (nextEnabled[t] = !disabled.has(t)));

        if (alive) {
          setAllTypes(union);
          setEnabled(nextEnabled);
        }
      } catch (e: any) {
        if (alive) setError(e?.message || 'No se pudieron cargar las preferencias');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (t: string) => {
    setEnabled((prev) => ({ ...prev, [t]: !prev[t] }));
  };

  const selectAll = (value: boolean) => {
    const next: Record<string, boolean> = {};
    for (const t of allTypes) next[t] = value;
    setEnabled(next);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const disabledTypes = allTypes.filter((t) => !enabled[t]);
      const res = await apiFetch('/notifications/prefs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabledTypes }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Error HTTP ${res.status}`);
      }

      // feedback simple
      alert('Preferencias guardadas ✅');
    } catch (e: any) {
      setError(e?.message || 'No se pudieron guardar las preferencias');
      alert(`Error: ${e?.message || 'No se pudo guardar'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Preferencias de notificaciones</h1>

      {loading && <div>Cargando…</div>}
      {!loading && error && (
        <div className="text-red-600 mb-3">⚠️ {error}</div>
      )}

      {!loading && !error && (
        <>
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => selectAll(true)}
              className="border px-3 py-1 rounded"
              disabled={saving}
            >
              Habilitar todas
            </button>
            <button
              onClick={() => selectAll(false)}
              className="border px-3 py-1 rounded"
              disabled={saving}
            >
              Deshabilitar todas
            </button>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {allTypes.map((t) => (
              <label
                key={t}
                className="flex items-center gap-3 border rounded px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={!!enabled[t]}
                  onChange={() => toggle(t)}
                  disabled={saving}
                />
                <span className="font-mono">{t}</span>
                <span className="text-xs text-gray-500 ml-auto">
                  {enabled[t] ? 'recibir' : 'silenciado'}
                </span>
              </label>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={save}
              className="bg-black text-white px-4 py-2 rounded disabled:opacity-60"
              disabled={saving || !dirty}
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
