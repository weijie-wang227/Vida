import assert from "node:assert/strict";
import test from "node:test";
import {
  createPasswordRecord,
  INVALID_SIGN_IN_MESSAGE,
  PASSWORD_HASH_POLICY,
  verifyPassword,
  verifyPasswordAndUpgrade,
} from "../services/passwordHashing.js";

const password = "correct horse battery staple";
const legacyPassword = "legacy-password";
const legacyRecord = {
  passwordSalt: "00112233445566778899aabbccddeeff",
  passwordHash:
    "b6758039ef898cc0fc5bb22a9ce9d467afe0cd8ffcc4d07933d0da17e01eff393d4994011b53a8bae7fbb63f09faa38b30fcfead9f227c76697451c3f846d3e6",
};

test("new password hashes identify their algorithm, version, and measured policy", async () => {
  let hashingCompleted = false;
  const recordPromise = createPasswordRecord(password).then((record) => {
    hashingCompleted = true;
    return record;
  });

  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(hashingCompleted, false, "hashing must yield the Node.js event loop");

  const record = await recordPromise;
  assert.match(record.passwordSalt, /^[A-Za-z0-9_-]{22}$/);
  assert.match(
    record.passwordHash,
    /^\$scrypt\$v=1\$N=32768,r=8,p=3,l=64\$[A-Za-z0-9_-]{86}$/,
  );
  assert.deepEqual(PASSWORD_HASH_POLICY, {
    algorithm: "scrypt",
    version: 1,
    N: 32768,
    r: 8,
    p: 3,
    keyLength: 64,
    configuredMemoryBytes: 32 * 1024 * 1024,
    maxmem: 64 * 1024 * 1024,
  });
  assert.equal(await verifyPassword(password, record), true);
  assert.equal(await verifyPassword("incorrect password", record), false);

  let saveCalls = 0;
  assert.equal(
    await verifyPasswordAndUpgrade(password, {
      ...record,
      async save() {
        saveCalls += 1;
      },
    }),
    true,
  );
  assert.equal(saveCalls, 0, "current hashes must not be rewritten");
});

test("legacy implicit-default scrypt hashes continue to verify", async () => {
  assert.equal(await verifyPassword(legacyPassword, legacyRecord), true);
  assert.equal(await verifyPassword("incorrect-password", legacyRecord), false);
});

test("successful participant and vendor legacy signins lazily persist upgrades", async () => {
  for (const accountKind of ["participant", "vendor"] as const) {
    let saveCalls = 0;
    const account = {
      ...legacyRecord,
      async save() {
        saveCalls += 1;
      },
    };

    assert.equal(
      await verifyPasswordAndUpgrade(legacyPassword, account),
      true,
      `${accountKind} legacy password should verify`,
    );
    assert.equal(saveCalls, 1, `${accountKind} upgrade should be persisted once`);
    assert.notEqual(account.passwordSalt, legacyRecord.passwordSalt);
    assert.match(account.passwordHash, /^\$scrypt\$v=1\$/);
    assert.equal(await verifyPassword(legacyPassword, account), true);
  }
});

test("incorrect legacy passwords do not upgrade or persist", async () => {
  let saveCalls = 0;
  const account = {
    ...legacyRecord,
    async save() {
      saveCalls += 1;
    },
  };

  assert.equal(
    await verifyPasswordAndUpgrade("incorrect-password", account),
    false,
  );
  assert.equal(saveCalls, 0);
  assert.deepEqual(
    { passwordHash: account.passwordHash, passwordSalt: account.passwordSalt },
    legacyRecord,
  );
});

test("malformed and unsupported stored password records fail closed", async () => {
  const validEncodedKey = Buffer.alloc(64).toString("base64url");
  const validEncodedSalt = Buffer.alloc(16).toString("base64url");
  const malformedRecords = [
    {},
    { passwordHash: "not-a-hash", passwordSalt: "not-a-salt" },
    {
      passwordHash: `$scrypt$v=2$N=32768,r=8,p=3,l=64$${validEncodedKey}`,
      passwordSalt: validEncodedSalt,
    },
    {
      passwordHash: `$scrypt$v=1$N=1048576,r=8,p=1,l=64$${validEncodedKey}`,
      passwordSalt: validEncodedSalt,
    },
    {
      passwordHash: "$scrypt$v=1$N=32768,r=8,p=3,l=64$invalid=base64",
      passwordSalt: validEncodedSalt,
    },
    { passwordHash: "00".repeat(63), passwordSalt: "00".repeat(16) },
  ];

  for (const record of malformedRecords) {
    assert.equal(await verifyPassword(password, record), false);
  }
});

test("participant and vendor password failures share one generic response", () => {
  assert.equal(
    INVALID_SIGN_IN_MESSAGE,
    "We could not sign you in. Check your email and password, then try again.",
  );
  assert.doesNotMatch(INVALID_SIGN_IN_MESSAGE, /hash|record|algorithm|malformed/i);
});
