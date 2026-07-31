import mongoose, { Schema, Types } from "mongoose";

export const paymentStatuses = [
  "creating",
  "pending",
  "paid",
  "failed",
  "expired",
  "cancelled",
  "needs_review",
  "refund_pending",
  "refunded",
] as const;

export type PaymentStatus = (typeof paymentStatuses)[number];

export type PaymentDocument = {
  _id: Types.ObjectId;
  provider: "hitpay";
  referenceNumber: string;
  providerRequestId?: string;
  providerPaymentId?: string;
  userId: Types.ObjectId;
  sessionId: Types.ObjectId;
  activityId: Types.ObjectId;
  amountMinor: number;
  refundedAmountMinor: number;
  providerFeeMinor: number;
  currency: "SGD";
  status: PaymentStatus;
  providerStatus?: string;
  checkoutUrl?: string;
  failureReason?: string;
  expiresAt: Date;
  reservationActive: boolean;
  paymentMethod?: string;
  paidAt?: Date;
  failedAt?: Date;
  refundedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const paymentSchema = new Schema<PaymentDocument>(
  {
    provider: {
      type: String,
      enum: ["hitpay"],
      required: true,
      default: "hitpay",
    },
    referenceNumber: { type: String, required: true, unique: true, trim: true },
    providerRequestId: { type: String, trim: true },
    providerPaymentId: { type: String, trim: true },
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    sessionId: { type: Schema.Types.ObjectId, required: true, ref: "Session" },
    activityId: { type: Schema.Types.ObjectId, required: true, ref: "Activity" },
    amountMinor: { type: Number, required: true, min: 0 },
    refundedAmountMinor: { type: Number, required: true, default: 0, min: 0 },
    providerFeeMinor: { type: Number, required: true, default: 0, min: 0 },
    currency: {
      type: String,
      enum: ["SGD"],
      required: true,
      default: "SGD",
    },
    status: {
      type: String,
      enum: paymentStatuses,
      required: true,
      default: "creating",
    },
    providerStatus: { type: String, trim: true },
    checkoutUrl: { type: String, trim: true },
    failureReason: { type: String, trim: true, maxlength: 500 },
    expiresAt: { type: Date, required: true },
    reservationActive: { type: Boolean, required: true, default: true },
    paymentMethod: { type: String, trim: true },
    paidAt: { type: Date },
    failedAt: { type: Date },
    refundedAt: { type: Date },
  },
  { timestamps: true },
);

paymentSchema.index({ providerRequestId: 1 }, { unique: true, sparse: true });
paymentSchema.index(
  { userId: 1, sessionId: 1 },
  {
    unique: true,
    partialFilterExpression: { reservationActive: true },
    name: "one_active_payment_reservation_per_user_session",
  },
);
paymentSchema.index({ status: 1, expiresAt: 1, reservationActive: 1 });
paymentSchema.index({ userId: 1, createdAt: -1 });

export const PaymentModel = mongoose.model<PaymentDocument>(
  "Payment",
  paymentSchema,
  "payments",
);
