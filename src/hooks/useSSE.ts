"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";

/**
 * Pool global para compartir una sola EventSource por URL absoluta.
 */
type Subscriber = {
  onEvent: (data: any) => void;
  onStatus: (connected: boolean) => void;
};

type Entry = {
  es: EventSource;
  url: string;
  subscribers: Set<Subscriber>;
  refCount: number;
  connected: boolean;
};

const SSE_POOL = new Map<string, Entry>();

/** Convierte path relativo a URL absoluta usando NEXT_PUBLIC_API_URL.
 *  Si no hay base y el path no es absoluto, devuelve null (no conecta).
 */
function toAbsUrl(pathOrUrl: string): string | null {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

  const base = process.env.NEXT_PUBLIC_API_URL ?? null;
  if (!base) return null; // ❗ evita pegarle al origin (3001) por defecto

  const needsSlash = !base.endsWith("/") && !pathOrUrl.startsWith("/");
  return needsSlash ? `${base}/${pathOrUrl}` : `${base}${pathOrUrl}`;
}

export function useSSE(pathOrUrl: string) {
  const { token } = useAuth();
  const [lastEvent, setLastEvent] = useState<any | null>(null);
  const [connected, setConnected] = useState(false);

  // URL con token en query (guard del backend acepta access_token)
  const absUrl = useMemo(() => {
    if (!token) return null;
    const abs = toAbsUrl(pathOrUrl);
    if (!abs) return null;
    const u = new URL(abs);
    u.searchParams.set("access_token", token);
    return u.toString();
  }, [pathOrUrl, token]);

  // guardamos refs de callbacks para desuscripción limpia
  const subRef = useRef<Subscriber | null>(null);

  useEffect(() => {
    if (!absUrl) {
      setConnected(false);
      setLastEvent(null);
      return;
    }

    let entry = SSE_POOL.get(absUrl);

    // Si no existe conexión, crearla y agregar al pool
    if (!entry) {
      const es = new EventSource(absUrl, { withCredentials: false });
      entry = {
        es,
        url: absUrl,
        subscribers: new Set<Subscriber>(),
        refCount: 0,
        connected: false,
      };

      es.onopen = () => {
        entry!.connected = true;
        for (const s of entry!.subscribers) s.onStatus(true);
      };

      // Importante: no cerramos; dejamos que EventSource haga retry automático.
      es.onerror = () => {
        entry!.connected = false;
        for (const s of entry!.subscribers) s.onStatus(false);
      };

      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          for (const s of entry!.subscribers) s.onEvent(data);
        } catch {
          // ignora payloads no JSON
        }
      };

      SSE_POOL.set(absUrl, entry);
    }

    // Suscriptor local
    const subscriber: Subscriber = {
      onEvent: setLastEvent,
      onStatus: setConnected,
    };
    subRef.current = subscriber;

    entry.subscribers.add(subscriber);
    entry.refCount += 1;

    // Estado inicial
    setConnected(entry.connected);

    return () => {
      // Limpieza: quitar suscriptor y cerrar si nadie más escucha
      const e = SSE_POOL.get(absUrl);
      if (!e) return;

      if (subRef.current) {
        e.subscribers.delete(subRef.current);
      }
      e.refCount -= 1;

      if (e.refCount <= 0) {
        try {
          e.es.close();
        } catch {}
        SSE_POOL.delete(absUrl);
      }
    };
  }, [absUrl]);

  return { lastEvent, connected };
}
