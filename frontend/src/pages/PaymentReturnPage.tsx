import { CheckCircle2, Clock3, RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { fetchPaymentStatus } from "../api/payments";
import type { PaymentStatusResponse } from "../lib/types";

const pollingIntervalMs = 2_000;
const maximumPolls = 15;

export function PaymentReturnPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get("paymentId")?.trim() ?? "";
  const [payment, setPayment] = useState<PaymentStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polls, setPolls] = useState(0);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function loadPayment() {
      if (!paymentId) {
        setError("The payment reference is missing.");
        return;
      }

      try {
        const response = await fetchPaymentStatus(paymentId);

        if (!active) {
          return;
        }

        setPayment(response);
        setError(null);

        if (
          ["creating", "pending"].includes(response.status) &&
          polls < maximumPolls
        ) {
          timer = setTimeout(() => setPolls((value) => value + 1), pollingIntervalMs);
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to confirm this payment.",
          );
        }
      }
    }

    void loadPayment();

    return () => {
      active = false;

      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [paymentId, polls]);

  const isPending =
    !error &&
    (!payment || ["creating", "pending"].includes(payment.status));
  const isPaid = payment?.status === "paid";
  const needsReview = payment?.status === "needs_review";
  const failed =
    Boolean(error) ||
    ["failed", "expired", "cancelled", "refunded"].includes(
      payment?.status ?? "",
    );

  return (
    <div className="flex h-full min-h-full items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
        {isPaid ? (
          <CheckCircle2 className="mx-auto text-emerald-500" size={42} />
        ) : needsReview || failed ? (
          <TriangleAlert className="mx-auto text-amber-500" size={42} />
        ) : (
          <Clock3 className="mx-auto animate-pulse text-accent" size={42} />
        )}

        <h1 className="mt-4 text-lg font-bold text-foreground">
          {isPaid
            ? "Payment confirmed"
            : needsReview
              ? "Payment needs review"
              : failed
                ? "Payment not completed"
                : "Confirming your payment"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {isPaid
            ? "Your place is confirmed and the session group is ready."
            : payment?.failureReason ||
              error ||
              (polls >= maximumPolls
                ? "Confirmation is taking longer than expected. You can safely check again."
                : "Please keep this page open while Vida waits for HitPay.")}
        </p>

        <div className="mt-5 grid gap-2">
          {isPaid && payment?.groupId !== undefined && (
            <button
              type="button"
              onClick={() => window.location.assign(`/groups/${payment.groupId}`)}
              className="rounded-xl bg-accent px-4 py-3 text-sm font-bold text-accent-foreground"
            >
              Open session group
            </button>
          )}
          {isPending && polls >= maximumPolls && (
            <button
              type="button"
              onClick={() => setPolls(0)}
              className="flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-accent-foreground"
            >
              <RotateCcw size={15} />
              Check again
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              navigate(
                payment?.activityId
                  ? `/activities/${payment.activityId}`
                  : "/activities",
              )
            }
            className="rounded-xl border border-border px-4 py-3 text-sm font-semibold text-foreground"
          >
            Back to activities
          </button>
        </div>
      </div>
    </div>
  );
}
