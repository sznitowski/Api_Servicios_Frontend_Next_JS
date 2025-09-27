"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/lib/config";

const ALL_TYPES = [
  "OFFERED", "ACCEPTED", "IN_PROGRESS", "DONE", "CANCELLED", "ADMIN_CANCEL", "DEBUG"
] as const;

type T = typeof ALL_TYPES[number];

export default function NotificationPrefsPage() {
  const { apiFetch } = useApi();
  const [disabled, setDisabled] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await apiFetch("/notifications/me/prefs");
    if (res.ok) {
      const data = await res.json(); // { userId, disabledTypes: string[] }
      setDisabled(data.disabledTypes ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = (t: T) => {
    setDisabled((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  };

  const save = async () => {
    await apiFetch("/notifications/prefs", {
      method: "PUT",
      body: JSON.stringify({ disabledTypes: disabled }),
      headers: { "Content-Type": "application/json" },
    });
    load();
  };

  if (loading) return <p>Cargando…</p>;

  return (
    <section>
      <h1>Preferencias de notificaciones</h1>
      <p>Desmarcá lo que <b>NO</b> querés recibir.</p>
      <div style={{ display: "grid", gap: 8, maxWidth: 420, marginTop: 12 }}>
        {ALL_TYPES.map((t) => {
          const enabled = !disabled.includes(t);
          return (
            <label key={t} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={enabled}
                onChange={() => toggle(t)}
              />
              {t}
            </label>
          );
        })}
      </div>
      <div style={{ marginTop: 16 }}>
        <button onClick={save}>Guardar</button>
      </div>
    </section>
  );
}
