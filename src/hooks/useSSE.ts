"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";

type EventData = any;

export function useSSE(pathOrUrl?: string) {
  const { tokens } = useAuth(); // { accessToken: string | null }
  const token = tokens?.accessToken ?? null;

  const [lastEvent, setLastEvent] = useState<EventData | null>(null);
  const [connected, setConnected] = useState(false);
  const retryRef = useRef(0);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Si no hay ruta o no hay token, no abrir SSE
    if (!pathOrUrl || !token) {
      setConnected(false);
      esRef.current?.close();
      esRef.current = null;
      return;
    }

    // Base del backend (DEBE apuntar al puerto 3000 con /api)
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || "").trim();
    if (!/^https?:\/\//i.test(apiBase)) {
      // Sin base correcta -> abortar, para no caer a window.origin (3001)
      console.warn("[useSSE] NEXT_PUBLIC_API_URL no está definido o es inválido. Abortando SSE.", {
        pathOrUrl,
        apiBase,
      });
      return;
    }

    // Construcción de URL absoluta
    const abs =
      /^https?:\/\//i.test(pathOrUrl)
        ? pathOrUrl
        : apiBase.replace(/\/+$/, "") + "/" + pathOrUrl.replace(/^\/+/, "");

    let url: URL;
    try {
      url = new URL(abs);
    } catch {
      console.warn("[useSSE] URL inválida. Abortando SSE.", { abs, pathOrUrl });
      return;
    }

    // Evitar jamás conectar a "/"
    if (!url.pathname || url.pathname === "/") {
      console.warn("[useSSE] Pathname vacío ('/'). Abortando SSE.", { url: url.toString() });
      return;
    }

    // Token como query param
    url.searchParams.set("access_token", token);

    const connect = () => {
      const es = new EventSource(url.toString(), { withCredentials: false });
      esRef.current = es;

      es.onopen = () => {
        setConnected(true);
        retryRef.current = 0;
      };

      es.onerror = () => {
        // Cerrar y reintentar con backoff
        setConnected(false);
        es.close();
        const backoff = Math.min(15000, 1000 * Math.pow(2, retryRef.current++));
        setTimeout(connect, backoff);
      };

      es.onmessage = (ev) => {
        try {
          setLastEvent(JSON.parse(ev.data));
        } catch {
          // ignorar payloads no JSON
        }
      };
    };

    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [pathOrUrl, token]);

  return { lastEvent, connected };
}
