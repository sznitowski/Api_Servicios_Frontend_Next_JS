"use client";

type Props = { status?: string | null; className?: string };

const LABELS: Record<string, string> = {
  NONE: "SIN PAGO",
  PENDING: "PENDIENTE",
  IN_PROCESS: "EN PROCESO",
  APPROVED: "APROBADO",
  REJECTED: "RECHAZADO",
  CANCELLED: "CANCELADO",
  REFUNDED: "REEMBOLSADO",
};

export default function PaymentBadge({ status, className }: Props) {
  const s = String(status ?? "NONE").toUpperCase();

  const color =
    s === "APPROVED"
      ? "bg-green-100 text-green-800 border-green-200"
      : s === "PENDING" || s === "IN_PROCESS"
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : s === "REJECTED" || s === "CANCELLED"
      ? "bg-red-100 text-red-800 border-red-200"
      : s === "REFUNDED"
      ? "bg-blue-100 text-blue-800 border-blue-200"
      : "bg-gray-100 text-gray-800 border-gray-200";

  const text = LABELS[s] ?? s;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded border text-xs ${color} ${className || ""}`}
      title={`Estado de pago: ${text}`}
    >
      {text}
    </span>
  );
}
