// src/components/RequestChat.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useSSE } from "@/hooks/useSSE";

type ChatMsg = {
  id: number;
  body: string;
  createdAt: string;
  sender?: { id: number; email?: string } | null;
  sender_id?: number; // por si el backend lo expone plano
};

type ListResp<T> = { items: T[]; meta?: any } | T[];

export default function RequestChat({
  requestId,
  meId,
}: {
  requestId: number;
  meId: number;
}) {
  const { api, apiFetch } = useApi();
  const { lastEvent } = useSSE("/api/notifications/stream");

  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);

  const canSend = useMemo(() => {
    const t = draft.trim();
    return t.length >= 1 && t.length <= 1000 && !sending;
  }, [draft, sending]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  const normalize = (m: any): ChatMsg => ({
    id: Number(m.id),
    body: m.body ?? m.text ?? "",
    createdAt: m.createdAt ?? m.created_at ?? new Date().toISOString(),
    sender: m.sender ?? m.user ?? (m.sender_id ? { id: Number(m.sender_id) } : null),
    sender_id: m.sender_id ?? m.user_id,
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api<ListResp<ChatMsg>>(
        `/requests/${requestId}/messages?limit=50&page=1`,
      );
      const items = Array.isArray(res) ? res : res?.items ?? [];
      const norm = items.map(normalize);
      // orden ascendente por fecha/id
      norm.sort((a, b) => a.id - b.id);
      setMsgs(norm);
      scrollToBottom();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  // Escuchar SSE para nuevos mensajes del mismo request
  useEffect(() => {
    if (!lastEvent) return;
    const ev = lastEvent as any;
    // tipos posibles: MESSAGE / NOTIFICATION...
    const isSameRequest =
      (ev?.request?.id ?? ev?.message?.requestId ?? ev?.requestId) === requestId;

    const maybeBody = ev?.message?.body ?? ev?.body;
    const maybeSender = ev?.message?.sender ?? ev?.sender;

    if (ev?.type === "MESSAGE" && isSameRequest && maybeBody) {
      const m: ChatMsg = normalize({
        id: ev?.message?.id ?? Date.now(),
        body: maybeBody,
        createdAt: ev?.createdAt ?? new Date().toISOString(),
        sender: maybeSender ?? ev?.user ?? null,
        sender_id: maybeSender?.id ?? ev?.userId,
      });
      setMsgs((prev) => [...prev, m]);
      scrollToBottom();
    }
  }, [lastEvent, requestId]);

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    if (text.length > 1000) {
      alert("El mensaje no puede superar 1000 caracteres.");
      return;
    }

    setSending(true);
    try {
      // IMPORTANTE: el backend espera { body }
      const res = await apiFetch(`/requests/${requestId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (!res.ok) {
        let msg = "No se pudo enviar el mensaje.";
        try {
          const t = await res.text();
          msg = t || msg;
        } catch {}
        throw new Error(msg);
      }
      setDraft("");
      // recargo para tener normalizado desde el backend (id/fecha reales)
      await load();
    } catch (e: any) {
      alert(e?.message ?? "No se pudo enviar el mensaje.");
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) void send();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Lista */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto bg-white px-3 py-3 text-sm"
      >
        {loading && msgs.length === 0 ? (
          <div className="py-8 text-center text-gray-500">Cargando mensajes…</div>
        ) : msgs.length === 0 ? (
          <div className="py-8 text-center text-gray-500">Sin mensajes.</div>
        ) : (
          <ul className="space-y-2">
            {msgs.map((m) => {
              const senderId = m.sender?.id ?? m.sender_id ?? 0;
              const mine = Number(senderId) === Number(meId);
              return (
                <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded px-3 py-2 ${
                      mine
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                    title={new Date(m.createdAt).toLocaleString()}
                  >
                    {m.body}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Input */}
      <div className="border-t p-2">
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Escribí tu mensaje…"
            maxLength={1000}
            className="min-h-[42px] max-h-40 flex-1 resize-y rounded border px-3 py-2 text-sm"
          />
          <button
            onClick={send}
            disabled={!canSend}
            className="whitespace-nowrap rounded border px-3 py-2 text-sm disabled:opacity-50"
            title="Enviar (Enter)"
          >
            {sending ? "Enviando…" : "Enviar"}
          </button>
        </div>
        <div className="mt-1 text-right text-xs text-gray-500">
          {draft.trim().length}/1000
        </div>
      </div>
    </div>
  );
}
