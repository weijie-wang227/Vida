import assert from "node:assert/strict";
import test from "node:test";
import { Types } from "mongoose";
import { createAuthToken, createVendorAuthToken } from "../services/auth.js";

function readTokenPayload(token: string) {
  const [payload] = token.split(".");

  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
    kind?: string;
    sub: string;
    email: string;
    iat: number;
    exp: number;
  };
}

test("user and vendor tokens carry distinct identity kinds", () => {
  const userId = new Types.ObjectId();
  const vendorAccountId = new Types.ObjectId();
  const userToken = createAuthToken({
    _id: userId,
    mockId: 1,
    name: "User",
    handle: "@user",
    email: "user@example.com",
    avatarUrl: "",
  });
  const vendorToken = createVendorAuthToken({
    _id: vendorAccountId,
    name: "Vendor",
    email: "vendor@example.com",
  });

  const userPayload = readTokenPayload(userToken);

  assert.equal(userPayload.kind, "user");
  assert.equal(userPayload.sub, String(userId));
  assert.equal(userPayload.email, "user@example.com");
  assert.equal(readTokenPayload(vendorToken).kind, "vendor");
  assert.equal(readTokenPayload(vendorToken).sub, String(vendorAccountId));
});
