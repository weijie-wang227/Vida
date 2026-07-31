import assert from "node:assert/strict";
import test from "node:test";
import { PaymentModel } from "../models/Payment.js";

test("payments keep provider references, immutable amounts, and reservation state", async () => {
  const payment = new PaymentModel();

  for (const field of [
    "providerRequestId",
    "referenceNumber",
    "amountMinor",
    "currency",
    "status",
    "expiresAt",
    "reservationActive",
  ]) {
    assert.ok(PaymentModel.schema.path(field));
  }

  await assert.rejects(
    PaymentModel.validate({ amountMinor: -1 }, ["amountMinor"]),
    (error: any) => Boolean(error?.errors?.amountMinor),
  );
  assert.equal(payment.provider, "hitpay");
  assert.equal(payment.currency, "SGD");
  assert.equal(payment.status, "creating");
  assert.equal(payment.reservationActive, true);
});
