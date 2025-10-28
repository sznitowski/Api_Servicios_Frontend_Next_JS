"use client";
import { useApi } from "@/hooks/useApi";

export type StartPaymentInput = {
  requestId: number; // ⬅️ nada más
};

// Respuesta del back (CreateIntentResDto)
export type CreateIntentRes = {
  id: string;
  init_point?: string;          // URL de pago (producción/sandbox según config)
  sandbox_init_point?: string;  // por si querés usarla en dev
};

export function usePayments() {
  const { api } = useApi();

  return {
    async start(input: StartPaymentInput) {
      // El useApi ya antepone /api → queda POST /api/payments/intent
      return api<CreateIntentRes>("/payments/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: input.requestId }), // ⬅️ sin "method"
      });
    },

    // Placeholder por si luego consultás estado por id
    async getStatus(paymentId: string) {
      return api<CreateIntentRes>(`/payments/${paymentId}`);
    },
  };
}
