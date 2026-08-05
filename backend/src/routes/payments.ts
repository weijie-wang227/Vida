import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  paymentCheckoutRateLimiter,
  paymentStatusRateLimiter,
} from "../middleware/rateLimits.js";
import {
  beginHitPayCheckout,
  getPaymentStatusForUser,
  PaymentServiceError,
  processHitPayWebhook,
} from "../services/payments/paymentService.js";

export const paymentRouter = Router();
export const hitPayWebhookRouter = Router();

function sendPaymentError(res: any, error: unknown) {
  if (!(error instanceof PaymentServiceError)) {
    return false;
  }

  res.status(error.status).json({
    message: error.message,
    ...error.details,
  });
  return true;
}

// Creates or reuses a sandbox HitPay checkout for one paid session.
paymentRouter.post(
  "/sessions/:sessionId/checkout",
  requireAuth,
  paymentCheckoutRateLimiter,
  async (req, res, next) => {
    try {
      const checkout = await beginHitPayCheckout(
        res.locals.user,
        String(req.params.sessionId),
      );

      res.status(201).json(checkout);
    } catch (error) {
      if (sendPaymentError(res, error)) {
        return;
      }

      next(error);
    }
  },
);

// Returns the authenticated user's local payment state.
paymentRouter.get("/:paymentId", requireAuth, paymentStatusRateLimiter, async (req, res, next) => {
  try {
    res.json(
      await getPaymentStatusForUser(
        String(req.params.paymentId),
        res.locals.user._id,
      ),
    );
  } catch (error) {
    if (sendPaymentError(res, error)) {
      return;
    }

    next(error);
  }
});

// Receives dashboard-registered HitPay payment_request webhooks.
hitPayWebhookRouter.post("/", async (req, res, next) => {
  try {
    if (!Buffer.isBuffer(req.body)) {
      res.status(400).json({ message: "Expected a raw webhook body." });
      return;
    }

    const result = await processHitPayWebhook(req.body, {
      signature:
        typeof req.headers["hitpay-signature"] === "string"
          ? req.headers["hitpay-signature"]
          : undefined,
      eventObject:
        typeof req.headers["hitpay-event-object"] === "string"
          ? req.headers["hitpay-event-object"]
          : undefined,
      eventType:
        typeof req.headers["hitpay-event-type"] === "string"
          ? req.headers["hitpay-event-type"]
          : undefined,
    });

    res.json(result);
  } catch (error) {
    if (sendPaymentError(res, error)) {
      return;
    }

    next(error);
  }
});

export default paymentRouter;
