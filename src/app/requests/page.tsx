"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/hooks/useApi";
import { useSSE } from "@/hooks/useSSE";

// -------- Tipos --------
type RequestRow = {
    id: number;
    title: string;
    status: string;
    priceOffered: number | null;
    priceAgreed: number | null;
    createdAt: string; // ISO
};

type ListResp = {
    items: RequestRow[];
    meta: { page: number; limit: number; total: number; pages: number };
};

// -------- Utils UI --------
function formatMoney(n: number | null | undefined) {
    if (n == null || Number.isNaN(n)) return "—";
    return n.toLocaleString("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 2,
    });
}
function fmtDate(iso: string | null | undefined) {
    if (!iso) return "—";
    try {
        const d = new Date(iso);
        return new Intl.DateTimeFormat("es-AR", {
            dateStyle: "short",
            timeStyle: "medium",
        }).format(d);
    } catch {
        return iso;
    }
}

export default function RequestsPage() {
    const { token } = useAuth();
    const { api } = useApi();

    const [items, setItems] = useState<RequestRow[]>([]);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    // -------- carga inicial / paginación --------
    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                setLoading(true);
                const data = await api<ListResp>(`/requests/me?page=${page}&limit=${limit}`);
                if (!alive) return;
                setItems(data.items || []);
                setTotal(data.meta?.total ?? data.items?.length ?? 0);
            } catch {
                if (!alive) return;
                // opcional: setear estado de error
            } finally {
                if (alive) setLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [api, page, limit]);

    // -------- SSE: actualizamos SOLO la fila afectada --------
    const { lastEvent } = useSSE("/api/notifications/stream");

    useEffect(() => {
        if (!lastEvent) return;

        // Normalizamos: algunos eventos vienen como { type, request, ... }
        const ev = lastEvent as any;

        // Mantener badge fuera de aquí; acá solo tocamos la tabla si hay request.
        const req: Partial<RequestRow> | undefined = ev?.request;
        if (!req?.id) return;

        setItems((prev) => {
            const i = prev.findIndex((r) => r.id === req.id);
            if (i === -1) return prev; // no está en la página actual, no hacemos nada

            // merge inmutable de la fila
            const merged: RequestRow = {
                ...prev[i],
                ...req,
                // Aseguramos types numéricos o null, por si viene string
                priceOffered:
                    req.priceOffered === undefined
                        ? prev[i].priceOffered
                        : req.priceOffered === null
                            ? null
                            : Number(req.priceOffered),
                priceAgreed:
                    req.priceAgreed === undefined
                        ? prev[i].priceAgreed
                        : req.priceAgreed === null
                            ? null
                            : Number(req.priceAgreed),
            };
            const next = prev.slice();
            next[i] = merged;
            return next;
        });
    }, [lastEvent]);

    // -------- Render --------
    const pages = Math.max(1, Math.ceil(total / limit));

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
                Mis pedidos <span className="inline-block w-2 h-2 rounded-full bg-gray-400" />
            </h1>

            <div className="mt-6 overflow-x-auto">
                <table className="min-w-full border">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="text-left px-3 py-2 border-b">ID</th>
                            <th className="text-left px-3 py-2 border-b">Título</th>
                            <th className="text-left px-3 py-2 border-b">Estado</th>
                            <th className="text-left px-3 py-2 border-b">Ofertado</th>
                            <th className="text-left px-3 py-2 border-b">Acordado</th>
                            <th className="text-left px-3 py-2 border-b">Creado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((r) => (
                            <tr key={r.id} className="odd:bg-white even:bg-gray-50">
                                <td className="px-3 py-2">{r.id}</td>
                                <td className="px-3 py-2">
                                    <Link href={`/requests/${r.id}`} className="underline">
                                        {r.title}
                                    </Link>
                                </td>
                                <td className="px-3 py-2">{r.status}</td>
                                <td className="px-3 py-2">{formatMoney(r.priceOffered)}</td>
                                <td className="px-3 py-2">{formatMoney(r.priceAgreed)}</td>
                                <td className="px-3 py-2">{fmtDate(r.createdAt)}</td>
                            </tr>
                        ))}
                        {items.length === 0 && !loading && (
                            <tr>
                                <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                                    Sin resultados
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Paginación simple */}
            <div className="mt-4 flex items-center gap-3">
                <button
                    className="border px-3 py-1 rounded disabled:opacity-50"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                >
                    ← Anterior
                </button>
                <span>
                    Página <b>{page}</b> — Total: <b>{total}</b>
                </span>
                <button
                    className="border px-3 py-1 rounded disabled:opacity-50"
                    onClick={() => setPage((p) => Math.min(pages, p + 1))}
                    disabled={page >= pages}
                >
                    Siguiente →
                </button>
            </div>
        </div>
    );
}
