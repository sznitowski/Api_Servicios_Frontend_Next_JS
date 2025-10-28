// src/components/payments/PaymentBadge.tsx
'use client';


type Props = { status?: string | null };


const COLORS: Record<string, string> = {
APPROVED: 'bg-green-100 text-green-800',
PENDING: 'bg-yellow-100 text-yellow-800',
IN_PROCESS: 'bg-yellow-100 text-yellow-800',
REJECTED: 'bg-red-100 text-red-800',
CANCELLED: 'bg-gray-200 text-gray-800',
REFUNDED: 'bg-blue-100 text-blue-800',
NONE: 'bg-gray-200 text-gray-800',
};


export default function PaymentBadge({ status }: Props) {
const s = (status || 'NONE').toUpperCase();
const cls = COLORS[s] || COLORS.NONE;
return (
<span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${cls}`}>
Pago: {s}
</span>
);
}