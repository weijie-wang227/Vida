import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateRevenueBreakdownMinor,
  CommissionConfigurationError,
  getVidaCommissionRate,
} from "../services/payments/commission.js";

test("Vida commission percentage is loaded from runtime configuration", () => {
  const previousValue = process.env.VIDA_COMMISSION_PERCENT;

  process.env.VIDA_COMMISSION_PERCENT = "10";

  try {
    assert.equal(getVidaCommissionRate(), 0.1);
  } finally {
    if (previousValue === undefined) {
      delete process.env.VIDA_COMMISSION_PERCENT;
    } else {
      process.env.VIDA_COMMISSION_PERCENT = previousValue;
    }
  }
});

test("invalid Vida commission configuration is rejected", () => {
  const previousValue = process.env.VIDA_COMMISSION_PERCENT;

  process.env.VIDA_COMMISSION_PERCENT = "101";

  try {
    assert.throws(
      () => getVidaCommissionRate(),
      CommissionConfigurationError,
    );
  } finally {
    if (previousValue === undefined) {
      delete process.env.VIDA_COMMISSION_PERCENT;
    } else {
      process.env.VIDA_COMMISSION_PERCENT = previousValue;
    }
  }
});

test("Vida commission is calculated from the configured rate", () => {
  assert.deepEqual(calculateRevenueBreakdownMinor(10_000, 0.1), {
    grossRevenueMinor: 10_000,
    commissionMinor: 1_000,
    netRevenueMinor: 9_000,
  });
});

test("commission calculations stay in integer minor units", () => {
  assert.deepEqual(calculateRevenueBreakdownMinor(305, 0.1), {
    grossRevenueMinor: 305,
    commissionMinor: 31,
    netRevenueMinor: 274,
  });
  assert.deepEqual(calculateRevenueBreakdownMinor(-100, 0.1), {
    grossRevenueMinor: 0,
    commissionMinor: 0,
    netRevenueMinor: 0,
  });
});
