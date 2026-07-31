import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHitPayApiUrl,
  HitPayConfigurationError,
} from "../services/payments/hitpayClient.js";

test("HitPay API URLs compose the versioned payment request route", () => {
  assert.equal(
    buildHitPayApiUrl(
      "https://api.sandbox.hit-pay.com",
      "/payment-requests",
    ),
    "https://api.sandbox.hit-pay.com/v1/payment-requests",
  );
});

test("legacy base URLs ending in v1 do not duplicate the version path", () => {
  assert.equal(
    buildHitPayApiUrl(
      "https://api.sandbox.hit-pay.com/v1/",
      "/payment-requests/request-id",
    ),
    "https://api.sandbox.hit-pay.com/v1/payment-requests/request-id",
  );
});

test("HitPay API URLs reject resource paths in configuration", () => {
  assert.throws(
    () =>
      buildHitPayApiUrl(
        "https://api.sandbox.hit-pay.com/v1/payment-requests",
        "/payment-requests",
      ),
    HitPayConfigurationError,
  );
});

test("HitPay API URLs reject non-API HitPay hosts", () => {
  assert.throws(
    () =>
      buildHitPayApiUrl(
        "https://checkout.sandbox.hit-pay.com",
        "/payment-requests",
      ),
    HitPayConfigurationError,
  );
});
