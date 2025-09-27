"use client";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";

type EventData = any;

export function useSSE(path: string) {
  const { token } = useAuth();
  const [lastEvent, setLastEvent] = useState<EventData | null>(null);
  const [connected, setConnected] = useState(false);
  const retryRef = useRef(0);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!token) return;

    const url = new URL(path, window.location.origin);
    url.searchParams.set("access_token", token);

    const connect = () => {
      const es = new EventSource(url.toString(), { withCredentials: false });
      esRef.current = es;

      es.onopen = () => {
        setConnected(true);
        retryRef.current = 0;
      };
      es.onerror = () => {
        setConnected(false);
        es.close();
        const backoff = Math.min(15000, 1000 * Math.pow(2, retryRef.current++));
        setTimeout(connect, backoff);
      };
      es.onmessage = (ev) => {
        try {
          setLastEvent(JSON.parse(ev.data));
        } catch {
          // ignore
        }
      };
    };

    connect();
    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [token, path]);

  return { lastEvent, connected };
}
