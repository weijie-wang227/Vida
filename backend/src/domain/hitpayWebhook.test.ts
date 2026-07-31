import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { verifyHitPayWebhookSignature } from "../services/payments/hitpayClient.js";

test("HitPay webhook signatures are checked against the raw body", () => {
  const previousSalt = process.env.HITPAY_WEBHOOK_SALT;
  process.env.HITPAY_WEBHOOK_SALT = "sandbox-test-salt";

  try {
    const rawBody = Buffer.from('{"id":"payment-request-id","status":"completed"}');
    const signature = crypto
      .createHmac("sha256", "sandbox-test-salt")
      .update(rawBody)
      .digest("hex");

    assert.equal(verifyHitPayWebhookSignature(rawBody, signature), true);
    assert.equal(
      verifyHitPayWebhookSignature(
        Buffer.from('{"id":"payment-request-id","status":"failed"}'),
        signature,
      ),
      false,
    );
  } finally {
    if (previousSalt === undefined) {
      delete process.env.HITPAY_WEBHOOK_SALT;
    } else {
      process.env.HITPAY_WEBHOOK_SALT = previousSalt;
    }
  }
});
