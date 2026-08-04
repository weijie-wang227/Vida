import assert from "node:assert/strict";
import test from "node:test";
import { VendorAccountModel, VendorModel } from "../models/VidaData.js";

test("vendor accounts own private credentials independently from users", () => {
  const googleSubject = VendorAccountModel.schema.path("googleSubject");
  const passwordHash = VendorAccountModel.schema.path("passwordHash");
  const passwordSalt = VendorAccountModel.schema.path("passwordSalt");

  assert.equal(googleSubject?.options.select, false);
  assert.equal(passwordHash?.options.select, false);
  assert.equal(passwordSalt?.options.select, false);
});

test("vendors link to vendor accounts without a user owner field", () => {
  const account = VendorModel.schema.path("account");

  assert.equal(account?.options.ref, "VendorAccount");
  assert.equal(VendorModel.schema.path("owner"), undefined);
});
