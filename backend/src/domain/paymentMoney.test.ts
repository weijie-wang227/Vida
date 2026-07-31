import assert from "node:assert/strict";
import test from "node:test";
import {
  formatSgdAmount,
  minorToSgd,
  parseHitPayAmountToMinor,
  sgdToMinor,
} from "../services/payments/money.js";

test("SGD amounts use integer minor units at provider boundaries", () => {
  assert.equal(sgdToMinor(10.235), 1024);
  assert.equal(minorToSgd(1024), 10.24);
  assert.equal(formatSgdAmount(1024), "10.24");
  assert.equal(parseHitPayAmountToMinor("10.24"), 1024);
  assert.equal(parseHitPayAmountToMinor("10.245"), null);
  assert.equal(parseHitPayAmountToMinor("not-money"), null);
});
