import assert from "node:assert/strict";
import test from "node:test";
import { createPasswordRecord, verifyPassword } from "../services/auth.js";
import {
  PASSWORD_POLICY,
  PASSWORD_VALIDATION_MESSAGE,
  validatePasswordInput,
} from "../services/passwordPolicy.js";

test("password policy retains the eight-character minimum", () => {
  assert.deepEqual(validatePasswordInput("a".repeat(7)), {
    ok: false,
    message: PASSWORD_VALIDATION_MESSAGE,
  });
  assert.deepEqual(validatePasswordInput("a".repeat(8)), {
    ok: true,
    password: "a".repeat(8),
  });
});

test("password policy accepts and preserves the exact UTF-8 byte maximum", () => {
  const password = "a".repeat(PASSWORD_POLICY.maximumUtf8Bytes);
  const validation = validatePasswordInput(password);

  assert.equal(Buffer.byteLength(password, "utf8"), 1024);
  assert.deepEqual(validation, { ok: true, password });
});

test("password policy rejects values above the UTF-8 byte maximum", async () => {
  const password = "a".repeat(PASSWORD_POLICY.maximumUtf8Bytes + 1);

  assert.equal(Buffer.byteLength(password, "utf8"), 1025);
  assert.deepEqual(validatePasswordInput(password), {
    ok: false,
    message: PASSWORD_VALIDATION_MESSAGE,
  });
  await assert.rejects(
    createPasswordRecord(password),
    /Invalid password input/,
  );
});

test("password maximum measures Unicode UTF-8 bytes without truncation", async () => {
  const exactMaximum = "é".repeat(512);
  const aboveMaximum = `${exactMaximum}a`;
  const differentPassword = `${"é".repeat(511)}ê`;

  assert.equal(Buffer.byteLength(exactMaximum, "utf8"), 1024);
  assert.equal(Buffer.byteLength(aboveMaximum, "utf8"), 1025);
  assert.deepEqual(validatePasswordInput(exactMaximum), {
    ok: true,
    password: exactMaximum,
  });
  assert.deepEqual(validatePasswordInput(aboveMaximum), {
    ok: false,
    message: PASSWORD_VALIDATION_MESSAGE,
  });

  const passwordRecord = await createPasswordRecord(exactMaximum);
  assert.equal(await verifyPassword(exactMaximum, passwordRecord), true);
  assert.equal(await verifyPassword(differentPassword, passwordRecord), false);
});

test("password validation rejects non-string input types", () => {
  for (const value of [undefined, null, 12345678, true, {}, []]) {
    assert.deepEqual(validatePasswordInput(value), {
      ok: false,
      message: PASSWORD_VALIDATION_MESSAGE,
    });
  }
});

test("optional Google-link confirmation accepts omission but not wrong types", () => {
  assert.deepEqual(validatePasswordInput(undefined, { optional: true }), {
    ok: true,
    password: undefined,
  });
  assert.deepEqual(validatePasswordInput("", { optional: true }), {
    ok: true,
    password: undefined,
  });
  assert.deepEqual(validatePasswordInput(null, { optional: true }), {
    ok: false,
    message: PASSWORD_VALIDATION_MESSAGE,
  });
});

test("password validation preserves surrounding whitespace", () => {
  const password = "  a long passphrase with spaces  ";

  assert.deepEqual(validatePasswordInput(password), {
    ok: true,
    password,
  });
});
