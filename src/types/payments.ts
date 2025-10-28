// src/types/payments.ts
export type PaymentRecord = {
id: number;
provider: 'MP' | 'STRIPE' | 'TRANSFER' | 'CASH' | 'DEBIT_AUTOMATIC' | 'OTHER';
method: 'card' | 'debit_card' | 'credit_card' | 'bank_transfer' | 'cash' | 'account_balance' | 'direct_debit' | 'other';
status: 'CREATED' | 'PENDING' | 'IN_PROCESS' | 'APPROVED' | 'AUTHORIZED' | 'CAPTURED' | 'REJECTED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
amount: number;
currency: string; // 'ARS'
approved_at?: string | null;
created_at: string;
external_payment_id?: string | null;
intent_id?: string | null;
};


export type RequestAggregatedPayment =
| 'NONE'
| 'PENDING'
| 'APPROVED'
| 'REJECTED'
| 'REFUNDED'
| 'CANCELLED';