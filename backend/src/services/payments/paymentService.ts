import mongoose, {
  Types,
  type ClientSession,
  type HydratedDocument,
} from "mongoose";
import {
  ActivityModel,
  BlacklistModel,
  ChatModel,
  SessionModel,
  SessionParticipationModel,
  type ActivityDocument,
  type EntityId,
  type SessionParticipationStatus,
} from "../../models/VidaData.js";
import {
  PaymentModel,
  type PaymentDocument,
  type PaymentStatus,
} from "../../models/Payment.js";
import { addUserToVendorConsolidated } from "../../utils/data.js";
import { asObject } from "../../utils/mongoose.js";
import { getSessionSelector } from "../../utils/routeSelectors.js";
import {
  createHitPayPaymentRequest,
  getHitPayPaymentRequest,
  type HitPayPaymentRequest,
  validateHitPayPaymentPayload,
  verifyHitPayWebhookSignature,
} from "./hitpayClient.js";
import {
  minimumHitPayAmountMinor,
  parseHitPayAmountToMinor,
  sgdCurrency,
  sgdToMinor,
} from "./money.js";

const paymentReservationMs = 15 * 60 * 1000;
const activeParticipationStatuses: SessionParticipationStatus[] = [
  "registered",
  "approved",
  "attended",
  "no_show",
];

export class PaymentServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "PaymentServiceError";
  }
}

type CheckoutUser = {
  _id: Types.ObjectId | string;
  name?: string;
  email?: string;
};

type HitPayWebhookHeaders = {
  signature?: string;
  eventObject?: string;
  eventType?: string;
};

function getFrontendUrl() {
  const configuredUrl = process.env.FRONTEND_URL?.trim();
  const frontendUrl = (configuredUrl || "http://localhost:5173").replace(
    /\/+$/,
    "",
  );

  if (!/^https?:\/\//.test(frontendUrl)) {
    throw new PaymentServiceError("FRONTEND_URL must be an HTTP(S) URL.", 500);
  }

  return frontendUrl;
}

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}

function paymentFailureReason(payload: HitPayPaymentRequest) {
  const providerPayment = payload.payments?.find(
    (payment) => payment.status === "failed",
  );

  return (
    providerPayment?.status_reason ||
    providerPayment?.status_reason_code ||
    "Payment failed."
  );
}

function getProviderPayment(payload: HitPayPaymentRequest) {
  return (
    payload.payments?.find((payment) => payment.status === "succeeded") ??
    payload.payments?.[0]
  );
}

function assertMatchingPaymentPayload(
  payment: PaymentDocument,
  payload: HitPayPaymentRequest,
) {
  if (
    !validateHitPayPaymentPayload(payload, {
      providerRequestId: String(payment.providerRequestId),
      referenceNumber: String(payment.referenceNumber),
      amountMinor: Number(payment.amountMinor),
      currency: String(payment.currency),
    })
  ) {
    throw new PaymentServiceError(
      "HitPay payment details do not match the Vida payment.",
      409,
    );
  }
}

async function releaseReservationInTransaction(
  payment: PaymentDocument,
  dbSession: ClientSession,
) {
  if (!payment.reservationActive) {
    return;
  }

  await SessionModel.updateOne(
    {
      _id: payment.sessionId,
      pendingPaymentCount: { $gt: 0 },
    },
    { $inc: { pendingPaymentCount: -1 } },
    { session: dbSession },
  );
  payment.reservationActive = false;
}

async function setTerminalPaymentStatus(
  paymentId: EntityId,
  status: Extract<PaymentStatus, "failed" | "expired" | "cancelled">,
  reason?: string,
) {
  return mongoose.connection.transaction(async (dbSession) => {
    const payment = await PaymentModel.findById(paymentId).session(dbSession);

    if (!payment || payment.status === "paid" || payment.status === "refunded") {
      return payment;
    }

    await releaseReservationInTransaction(payment, dbSession);
    payment.status = status;
    payment.providerStatus = status;
    payment.failureReason = reason;
    payment.failedAt = new Date();
    await payment.save({ session: dbSession });

    return payment;
  });
}

async function completePaidPayment(
  paymentId: EntityId,
  payload: HitPayPaymentRequest,
) {
  return mongoose.connection.transaction(async (dbSession) => {
    const payment = await PaymentModel.findById(paymentId).session(dbSession);

    if (!payment) {
      throw new PaymentServiceError("Payment not found.", 404);
    }

    if (payment.status === "paid") {
      return payment;
    }

    if (payment.status === "refunded") {
      return payment;
    }

    assertMatchingPaymentPayload(asObject(payment), payload);

    const [scheduledSession, activity, existingParticipation] =
      await Promise.all([
        SessionModel.findById(payment.sessionId).session(dbSession),
        ActivityModel.findById(payment.activityId).session(dbSession),
        SessionParticipationModel.findOne({
          userId: payment.userId,
          sessionId: payment.sessionId,
        }).session(dbSession),
      ]);

    if (!scheduledSession || !activity) {
      await releaseReservationInTransaction(payment, dbSession);
      payment.status = "needs_review";
      payment.providerStatus = payload.status;
      payment.failureReason =
        "Payment completed, but the linked session or activity no longer exists.";
      await payment.save({ session: dbSession });
      return payment;
    }

    const blacklist = await BlacklistModel.findOne({
      user: payment.userId,
      group: scheduledSession.chat,
    })
      .select("_id")
      .session(dbSession);

    if (
      blacklist ||
      (existingParticipation &&
        activeParticipationStatuses.includes(existingParticipation.status) &&
        String(existingParticipation.paymentId ?? "") !== String(payment._id))
    ) {
      await releaseReservationInTransaction(payment, dbSession);
      payment.status = "needs_review";
      payment.providerStatus = payload.status;
      payment.failureReason = blacklist
        ? "Payment completed after the user became ineligible for this group."
        : "Payment completed for a session that was already joined.";
      await payment.save({ session: dbSession });
      return payment;
    }

    const sessionCapacityFilter = payment.reservationActive
      ? {
          _id: scheduledSession._id,
          pendingPaymentCount: { $gt: 0 },
        }
      : {
          _id: scheduledSession._id,
          isOpen: true,
          isActive: true,
          $expr: {
            $lt: [
              {
                $add: [
                  { $ifNull: ["$registeredCount", 0] },
                  { $ifNull: ["$pendingPaymentCount", 0] },
                ],
              },
              "$spots",
            ],
          },
        };
    const sessionIncrements: Record<string, number> = {
      registeredCount: 1,
      grossRevenueMinor: Number(payment.amountMinor),
    };

    if (payment.reservationActive) {
      sessionIncrements.pendingPaymentCount = -1;
    }

    const reservedSession = await SessionModel.findOneAndUpdate(
      sessionCapacityFilter,
      { $inc: sessionIncrements },
      { returnDocument: "after", session: dbSession },
    );

    if (!reservedSession) {
      payment.reservationActive = false;
      payment.status = "needs_review";
      payment.providerStatus = payload.status;
      payment.failureReason =
        "Payment completed after the reserved place was no longer available.";
      await payment.save({ session: dbSession });
      return payment;
    }

    const now = new Date();

    if (existingParticipation) {
      existingParticipation.role = "participant";
      existingParticipation.status = "registered";
      existingParticipation.paymentId = payment._id;
      existingParticipation.amountPaidMinor = payment.amountMinor;
      existingParticipation.currency = sgdCurrency;
      existingParticipation.registeredAt = now;
      existingParticipation.attendanceMarkedAt = undefined;
      existingParticipation.reviewPromptSentAt = undefined;
      await existingParticipation.save({ session: dbSession });
    } else {
      await SessionParticipationModel.create(
        [
          {
            userId: payment.userId,
            sessionId: payment.sessionId,
            role: "participant",
            status: "registered",
            paymentId: payment._id,
            amountPaidMinor: payment.amountMinor,
            currency: sgdCurrency,
            registeredAt: now,
          },
        ],
        { session: dbSession },
      );
    }

    await ActivityModel.findByIdAndUpdate(
      activity._id,
      {
        $inc: {
          registeredCount: 1,
          grossRevenueMinor: Number(payment.amountMinor),
          totalRevenue: Number(payment.amountMinor) / 100,
        },
      },
      { session: dbSession },
    );

    const group = await ChatModel.findByIdAndUpdate(
      scheduledSession.chat,
      { $addToSet: { members: payment.userId } },
      { returnDocument: "after", session: dbSession },
    );

    if (!group) {
      throw new PaymentServiceError("Session group not found.", 404);
    }

    await addUserToVendorConsolidated(
      activity.host,
      payment.userId,
      now,
      dbSession,
    );

    const providerPayment = getProviderPayment(payload);
    payment.status = "paid";
    payment.providerStatus = payload.status;
    payment.providerPaymentId = providerPayment?.id;
    payment.paymentMethod = providerPayment?.payment_type;
    payment.providerFeeMinor =
      parseHitPayAmountToMinor(providerPayment?.fees) ?? 0;
    payment.reservationActive = false;
    payment.paidAt = now;
    payment.failureReason = undefined;
    await payment.save({ session: dbSession });

    return payment;
  });
}

async function processHitPayState(
  payment: PaymentDocument,
  payload: HitPayPaymentRequest,
) {
  assertMatchingPaymentPayload(payment, payload);
  const status = String(payload.status).toLowerCase();

  if (status === "completed" || status === "succeeded") {
    return completePaidPayment(payment._id, payload);
  }

  if (
    status === "failed" ||
    status === "expired" ||
    status === "canceled" ||
    status === "cancelled" ||
    status === "inactive"
  ) {
    const localStatus: "failed" | "expired" | "cancelled" =
      status === "expired"
        ? "expired"
        : status === "canceled" ||
            status === "cancelled" ||
            status === "inactive"
          ? "cancelled"
          : "failed";

    return setTerminalPaymentStatus(
      payment._id,
      localStatus,
      paymentFailureReason(payload),
    );
  }

  return payment;
}

export async function releaseExpiredPaymentReservations(now = new Date()) {
  const expiredPayments = await PaymentModel.find({
    reservationActive: true,
    status: { $in: ["creating", "pending"] },
    expiresAt: { $lte: now },
  })
    .select("_id")
    .limit(100);

  for (const payment of expiredPayments) {
    await setTerminalPaymentStatus(
      payment._id,
      "expired",
      "Payment was not confirmed before the reservation expired.",
    );
  }

  return expiredPayments.length;
}

export async function beginHitPayCheckout(
  user: CheckoutUser,
  sessionRouteId: string,
) {
  await releaseExpiredPaymentReservations();
  const sessionSelector = getSessionSelector(sessionRouteId);

  if (sessionSelector.length === 0) {
    throw new PaymentServiceError("Session not found.", 404);
  }

  const scheduledSession = await SessionModel.findOne({
    $or: sessionSelector,
    isOpen: true,
    isActive: true,
  }).populate<{ activity: ActivityDocument }>("activity");

  if (!scheduledSession) {
    throw new PaymentServiceError("Open session not found.", 404);
  }

  const activity = scheduledSession.activity;
  const amountMinor = sgdToMinor(scheduledSession.priceSgd);

  if (amountMinor === 0) {
    throw new PaymentServiceError(
      "This session is free and does not require checkout.",
      409,
      { free: true },
    );
  }

  if (amountMinor < minimumHitPayAmountMinor) {
    throw new PaymentServiceError(
      "Paid sessions must cost at least S$0.30.",
      400,
    );
  }

  const existingParticipation = await SessionParticipationModel.exists({
    userId: user._id,
    sessionId: scheduledSession._id,
    status: { $in: activeParticipationStatuses },
  });

  if (existingParticipation) {
    throw new PaymentServiceError("This session has already been joined.", 409);
  }

  const blacklist = await BlacklistModel.exists({
    user: user._id,
    group: scheduledSession.chat,
  });

  if (blacklist) {
    throw new PaymentServiceError(
      "You cannot join this session because you are blacklisted from its group.",
      403,
    );
  }

  const activePayment = await PaymentModel.findOne({
    userId: user._id,
    sessionId: scheduledSession._id,
    reservationActive: true,
    status: { $in: ["creating", "pending"] },
  });

  if (activePayment?.status === "pending" && activePayment.checkoutUrl) {
    return serializeCheckoutPayment(activePayment);
  }

  if (activePayment) {
    throw new PaymentServiceError(
      "A payment request is already being prepared. Please try again shortly.",
      409,
      { paymentId: String(activePayment._id) },
    );
  }

  const paymentId = new Types.ObjectId();
  const referenceNumber = `VIDA-${paymentId.toHexString().toUpperCase()}`;
  const expiresAt = new Date(Date.now() + paymentReservationMs);
  let payment: HydratedDocument<PaymentDocument>;

  try {
    payment = await mongoose.connection.transaction(async (dbSession) => {
      const reservedSession = await SessionModel.findOneAndUpdate(
        {
          _id: scheduledSession._id,
          isOpen: true,
          isActive: true,
          $expr: {
            $lt: [
              {
                $add: [
                  { $ifNull: ["$registeredCount", 0] },
                  { $ifNull: ["$pendingPaymentCount", 0] },
                ],
              },
              "$spots",
            ],
          },
        },
        { $inc: { pendingPaymentCount: 1 } },
        { returnDocument: "after", session: dbSession },
      );

      if (!reservedSession) {
        throw new PaymentServiceError("This session is full.", 409);
      }

      const [createdPayment] = await PaymentModel.create(
        [
          {
            _id: paymentId,
            provider: "hitpay",
            referenceNumber,
            userId: user._id,
            sessionId: scheduledSession._id,
            activityId: activity._id,
            amountMinor,
            currency: sgdCurrency,
            status: "creating",
            expiresAt,
            reservationActive: true,
          },
        ],
        { session: dbSession },
      );

      return createdPayment;
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new PaymentServiceError(
        "A payment request already exists for this session.",
        409,
      );
    }

    throw error;
  }

  try {
    const redirectUrl = new URL("/payments/return", `${getFrontendUrl()}/`);
    redirectUrl.searchParams.set("paymentId", String(payment._id));
    const hitPayPayment = await createHitPayPaymentRequest({
      amountMinor,
      referenceNumber,
      purpose: `${String(activity.title ?? "Vida activity")} — ${String(
        scheduledSession.title ?? "Session",
      )}`,
      customer: {
        name: user.name,
        email: user.email,
      },
      redirectUrl: redirectUrl.toString(),
    });

    if (!hitPayPayment.id || !hitPayPayment.url) {
      throw new PaymentServiceError(
        "HitPay did not return a checkout URL.",
        502,
      );
    }

    if (
      hitPayPayment.reference_number !== referenceNumber ||
      parseHitPayAmountToMinor(hitPayPayment.amount) !== amountMinor ||
      String(hitPayPayment.currency).toUpperCase() !== sgdCurrency
    ) {
      throw new PaymentServiceError(
        "HitPay returned mismatched payment details.",
        502,
      );
    }

    const updatedPayment = await PaymentModel.findOneAndUpdate(
      { _id: payment._id, status: "creating" },
      {
        $set: {
          providerRequestId: hitPayPayment.id,
          providerStatus: hitPayPayment.status,
          checkoutUrl: hitPayPayment.url,
          status: "pending",
        },
      },
      { returnDocument: "after" },
    );

    if (!updatedPayment) {
      throw new PaymentServiceError(
        "Unable to persist the HitPay checkout.",
        500,
      );
    }

    payment = asObject(
      updatedPayment,
    );

    return serializeCheckoutPayment(payment);
  } catch (error) {
    await setTerminalPaymentStatus(
      payment._id,
      "failed",
      error instanceof Error ? error.message : "Unable to create HitPay payment.",
    );
    throw error;
  }
}

function serializeCheckoutPayment(payment: PaymentDocument) {
  return {
    paymentId: String(payment._id),
    status: payment.status,
    checkoutUrl: payment.checkoutUrl,
    amountMinor: Number(payment.amountMinor),
    currency: payment.currency,
    expiresAt:
      payment.expiresAt instanceof Date
        ? payment.expiresAt.toISOString()
        : new Date(payment.expiresAt).toISOString(),
  };
}

export async function getPaymentStatusForUser(
  paymentId: string,
  userId: EntityId,
) {
  if (!Types.ObjectId.isValid(paymentId)) {
    throw new PaymentServiceError("Payment not found.", 404);
  }

  await releaseExpiredPaymentReservations();
  let payment = await PaymentModel.findOne({ _id: paymentId, userId });

  if (!payment) {
    throw new PaymentServiceError("Payment not found.", 404);
  }

  if (payment.status === "pending" && payment.providerRequestId) {
    try {
      const providerPayment = await getHitPayPaymentRequest(
        payment.providerRequestId,
      );
      payment = (await processHitPayState(
        payment,
        providerPayment,
      )) as typeof payment;
    } catch (error) {
      if (error instanceof PaymentServiceError) {
        throw error;
      }
      // Webhooks remain authoritative; a transient fallback status check should
      // not turn a pending payment into a client-facing server error.
    }
  }

  const session = await SessionModel.findById(payment.sessionId)
    .select("mockId activity chat")
    .populate<{ activity: { mockId: number } }>("activity", "mockId")
    .populate<{ chat: { mockId: number } }>("chat", "mockId");

  return {
    ...serializeCheckoutPayment(payment),
    failureReason: payment.failureReason,
    sessionId: session?.mockId ?? String(payment.sessionId),
    activityId: session?.activity.mockId ?? String(payment.activityId),
    groupId: session?.chat.mockId,
    joined: payment.status === "paid",
  };
}

export async function processHitPayWebhook(
  rawBody: Buffer,
  headers: HitPayWebhookHeaders,
) {
  if (!verifyHitPayWebhookSignature(rawBody, headers.signature)) {
    throw new PaymentServiceError("Invalid HitPay signature.", 401);
  }

  if (
    headers.eventObject !== "payment_request" ||
    !["completed", "failed"].includes(headers.eventType ?? "")
  ) {
    return { ignored: true };
  }

  let payload: HitPayPaymentRequest;

  try {
    payload = JSON.parse(rawBody.toString("utf8")) as HitPayPaymentRequest;
  } catch {
    throw new PaymentServiceError("Invalid HitPay webhook JSON.", 400);
  }

  const payment = await PaymentModel.findOne({
    $or: [
      { providerRequestId: payload.id },
      ...(payload.reference_number
        ? [{ referenceNumber: payload.reference_number }]
        : []),
    ],
  });

  if (!payment) {
    return { ignored: true };
  }

  if (!payment.providerRequestId) {
    payment.providerRequestId = payload.id;
    await payment.save();
  }

  if (headers.eventType === "completed") {
    await completePaidPayment(payment._id, payload);
  } else {
    assertMatchingPaymentPayload(asObject(payment), payload);
    await setTerminalPaymentStatus(
      payment._id,
      "failed",
      paymentFailureReason(payload),
    );
  }

  return { processed: true, paymentId: String(payment._id) };
}

let maintenanceTimer: NodeJS.Timeout | null = null;

export function startPaymentMaintenance() {
  if (maintenanceTimer) {
    return;
  }

  maintenanceTimer = setInterval(() => {
    void releaseExpiredPaymentReservations().catch((error) => {
      console.error("Unable to release expired payment reservations.", error);
    });
  }, 60_000);
  maintenanceTimer.unref();
}
