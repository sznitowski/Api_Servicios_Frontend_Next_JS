// src/components/NotifToaster.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSSE } from "@/hooks/useSSE";
import { useAuth } from "@/lib/auth";

type Incoming = {
  id?: number;
  type?: string;
  message?: string;
  request?: { id?: number; title?: string; status?: string } | null;
};

type Toast = {
  key: string;
  title: string;
  message: string;
  href?: string;
};

const LIFE_MS = 6000;          // tiempo visible del toast
const MAX_SEEN_IDS = 200;      // límite de IDs recordados para evitar growth

export default function NotifToaster() {
  const { token } = useAuth();
  const { lastEvent } = useSSE("/api/notifications/stream");

  const [toasts, setToasts] = useState<Toast[]>([]);
  const shownIds = useRef<Set<number>>(new Set());   // evita duplicados
  const seenQueue = useRef<number[]>([]);            // para purgar viejos
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // si no hay sesión, no muestres nada
  const enabled = useMemo(() => Boolean(token), [token]);

  useEffect(() => {
    if (!enabled || !lastEvent) return;

    try {
      const ev = lastEvent as Incoming;

      // heurística básica: que parezca notificación
      if (!ev || !ev.id || (!ev.message && !ev.type)) return;

      // evita duplicar el mismo id
      if (shownIds.current.has(ev.id)) return;

      // registrar id y purgar si supera el límite
      shownIds.current.add(ev.id);
      seenQueue.current.push(ev.id);
      if (seenQueue.current.length > MAX_SEEN_IDS) {
        const old = seenQueue.current.shift();
        if (typeof old === "number") shownIds.current.delete(old);
      }

      const title = labelFromType(ev.type);
      const msg = ev.message ?? "Nueva notificación";
      const href = buildHrefFromRequest(ev.request);

      const key = `${ev.id}-${Date.now()}`;
      const toast: Toast = { key, title, message: msg, href };

      setToasts((arr) => [toast, ...arr]);

      const t = setTimeout(() => {
        setToasts((arr) => arr.filter((x) => x.key !== key));
        timers.current.delete(key);
      }, LIFE_MS);
      timers.current.set(key, t);
    } catch {
      // noop
    }
  }, [enabled, lastEvent]);

  useEffect(() => {
    return () => {
      // cleanup timers
      timers.current.forEach((t) => clearTimeout(t));
      timers.current.clear();
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 z-[1000] flex flex-col gap-2"
      style={{ pointerEvents: "none" }}
    >
      {toasts.map((t) => (
        <div
          key={t.key}
          className="shadow-lg rounded-md border bg-white/95 backdrop-blur px-4 py-3 min-w-[280px] max-w-[360px] pointer-events-auto animate-[fadeIn_120ms_ease-out]"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">🔔</div>
            <div className="flex-1">
              <div className="font-medium leading-tight">{t.title}</div>
              <div className="text-sm text-gray-700 mt-1">{t.message}</div>
              {t.href && (
                <div className="mt-2">
                  <Link
                    href={t.href}
                    className="text-sm underline text-blue-700 hover:text-blue-900"
                    onClick={() => {
                      // al navegar, cerramos el toast
                      setToasts((arr) => arr.filter((x) => x.key !== t.key));
                      const timer = timers.current.get(t.key);
                      if (timer) clearTimeout(timer);
                      timers.current.delete(t.key);
                    }}
                  >
                    Ver detalle →
                  </Link>
                </div>
              )}
            </div>
            <button
              aria-label="Cerrar"
              className="text-gray-400 hover:text-gray-600 transition"
              onClick={() => {
                setToasts((arr) => arr.filter((x) => x.key !== t.key));
                const timer = timers.current.get(t.key);
                if (timer) clearTimeout(timer);
                timers.current.delete(t.key);
              }}
            >
              ✕
            </button>
          </div>
        </div>
      ))}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

function labelFromType(type?: string) {
  switch (type) {
    case "OFFERED":
      return "Nueva oferta";
    case "IN_PROGRESS":
      return "Trabajo iniciado";
    case "DONE":
      return "Trabajo completado";
    case "CANCELLED":
      return "Trabajo cancelado";
    case "ADMIN_CANCEL":
      return "Cancelado por admin";
    default:
      return "Notificación";
  }
}

function buildHrefFromRequest(req?: { id?: number | null } | null) {
  if (!req || !req.id) return undefined;
  // si tenés una página de detalle: /requests/[id]
  return `/requests/${req.id}`;
}
