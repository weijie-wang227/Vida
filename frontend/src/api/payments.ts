import type {
  ActivityId,
  PaymentCheckoutResponse,
  PaymentStatusResponse,
} from "../lib/types";
import { apiRequest } from "./client";

export function createSessionCheckout(sessionId: ActivityId) {
  return apiRequest<PaymentCheckoutResponse>(
    `/payments/sessions/${sessionId}/checkout`,
    { method: "POST" },
  );
}

export function fetchPaymentStatus(paymentId: string) {
  return apiRequest<PaymentStatusResponse>(
    `/payments/${encodeURIComponent(paymentId)}`,
  );
}
