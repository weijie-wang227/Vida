import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { validatePasswordInput } from "./passwordPolicy.js";

const mebibyte = 1024 * 1024;
const saltLengthBytes = 16;

export const PASSWORD_HASH_POLICY = {
  algorithm: "scrypt",
  version: 1,
  N: 2 ** 15,
  r: 8,
  p: 3,
  keyLength: 64,
  configuredMemoryBytes: 32 * mebibyte,
  maxmem: 64 * mebibyte,
} as const;

const LEGACY_SCRYPT_POLICY = {
  N: 2 ** 14,
  r: 8,
  p: 1,
  keyLength: 64,
  maxmem: 32 * mebibyte,
} as const;

export const INVALID_SIGN_IN_MESSAGE =
  "We could not sign you in. Check your email and password, then try again.";

export type PasswordRecord = {
  passwordHash: string;
  passwordSalt: string;
};

type StoredPasswordRecord = {
  passwordHash?: string;
  passwordSalt?: string;
};

type PersistablePasswordRecord = StoredPasswordRecord & {
  save(): Promise<unknown>;
};

type ScryptParameters = {
  N: number;
  r: number;
  p: number;
  keyLength: number;
};

type PasswordVerification = {
  valid: boolean;
  needsUpgrade: boolean;
};

function deriveScryptKey(
  password: string,
  salt: string | Buffer,
  parameters: ScryptParameters & { maxmem: number },
) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      parameters.keyLength,
      {
        N: parameters.N,
        r: parameters.r,
        p: parameters.p,
        maxmem: parameters.maxmem,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey);
      },
    );
  });
}

function safeCompareBuffers(actual: Buffer, expected: Buffer) {
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function decodeBase64Url(value: string, expectedLength: number) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    return null;
  }

  const decoded = Buffer.from(value, "base64url");

  return decoded.length === expectedLength && decoded.toString("base64url") === value
    ? decoded
    : null;
}

function isSupportedScryptParameters(parameters: ScryptParameters) {
  const configuredMemoryBytes = 128 * parameters.N * parameters.r;

  return (
    Number.isSafeInteger(parameters.N) &&
    parameters.N >= 2 ** 13 &&
    parameters.N <= 2 ** 17 &&
    (parameters.N & (parameters.N - 1)) === 0 &&
    parameters.r === 8 &&
    Number.isSafeInteger(parameters.p) &&
    parameters.p >= 1 &&
    parameters.p <= 10 &&
    parameters.N * parameters.p <= 2 ** 17 &&
    parameters.keyLength === PASSWORD_HASH_POLICY.keyLength &&
    configuredMemoryBytes <= 128 * mebibyte
  );
}

function parseVersionedHash(passwordHash: string) {
  const match = passwordHash.match(
    /^\$scrypt\$v=(\d+)\$N=(\d+),r=(\d+),p=(\d+),l=(\d+)\$([A-Za-z0-9_-]+)$/,
  );

  if (!match) {
    return null;
  }

  const version = Number(match[1]);
  const parameters = {
    N: Number(match[2]),
    r: Number(match[3]),
    p: Number(match[4]),
    keyLength: Number(match[5]),
  };
  const expectedKey = decodeBase64Url(match[6], parameters.keyLength);

  if (
    version !== PASSWORD_HASH_POLICY.version ||
    !isSupportedScryptParameters(parameters) ||
    !expectedKey
  ) {
    return null;
  }

  return { version, parameters, expectedKey };
}

function encodeVersionedHash(derivedKey: Buffer) {
  const { algorithm, version, N, r, p, keyLength } = PASSWORD_HASH_POLICY;

  return `$${algorithm}$v=${version}$N=${N},r=${r},p=${p},l=${keyLength}$${derivedKey.toString("base64url")}`;
}

function usesCurrentPolicy(parameters: ScryptParameters) {
  return (
    parameters.N === PASSWORD_HASH_POLICY.N &&
    parameters.r === PASSWORD_HASH_POLICY.r &&
    parameters.p === PASSWORD_HASH_POLICY.p &&
    parameters.keyLength === PASSWORD_HASH_POLICY.keyLength
  );
}

async function verifyStoredPassword(
  password: string,
  account: StoredPasswordRecord,
): Promise<PasswordVerification> {
  const validation = validatePasswordInput(password);

  if (!validation.ok || !account.passwordHash || !account.passwordSalt) {
    return { valid: false, needsUpgrade: false };
  }

  try {
    if (account.passwordHash.startsWith("$")) {
      const parsedHash = parseVersionedHash(account.passwordHash);
      const salt = decodeBase64Url(account.passwordSalt, saltLengthBytes);

      if (!parsedHash || !salt) {
        return { valid: false, needsUpgrade: false };
      }

      const configuredMemoryBytes =
        128 * parsedHash.parameters.N * parsedHash.parameters.r;
      const actualKey = await deriveScryptKey(validation.password, salt, {
        ...parsedHash.parameters,
        maxmem: configuredMemoryBytes + 32 * mebibyte,
      });
      const valid = safeCompareBuffers(actualKey, parsedHash.expectedKey);

      return {
        valid,
        needsUpgrade: valid && !usesCurrentPolicy(parsedHash.parameters),
      };
    }

    if (
      !/^[0-9a-f]{128}$/i.test(account.passwordHash) ||
      !/^[0-9a-f]{32}$/i.test(account.passwordSalt)
    ) {
      return { valid: false, needsUpgrade: false };
    }

    const actualKey = await deriveScryptKey(
      validation.password,
      account.passwordSalt,
      LEGACY_SCRYPT_POLICY,
    );
    const expectedKey = Buffer.from(account.passwordHash, "hex");
    const valid = safeCompareBuffers(actualKey, expectedKey);

    return { valid, needsUpgrade: valid };
  } catch {
    return { valid: false, needsUpgrade: false };
  }
}

export async function createPasswordRecord(password: string): Promise<PasswordRecord> {
  const validation = validatePasswordInput(password);

  if (!validation.ok) {
    throw new Error("Invalid password input.");
  }

  const salt = randomBytes(saltLengthBytes);
  const derivedKey = await deriveScryptKey(validation.password, salt, {
    N: PASSWORD_HASH_POLICY.N,
    r: PASSWORD_HASH_POLICY.r,
    p: PASSWORD_HASH_POLICY.p,
    keyLength: PASSWORD_HASH_POLICY.keyLength,
    maxmem: PASSWORD_HASH_POLICY.maxmem,
  });

  return {
    passwordSalt: salt.toString("base64url"),
    passwordHash: encodeVersionedHash(derivedKey),
  };
}

export async function verifyPassword(
  password: string,
  account: StoredPasswordRecord,
) {
  return (await verifyStoredPassword(password, account)).valid;
}

export async function verifyPasswordAndUpgrade(
  password: string,
  account: PersistablePasswordRecord,
) {
  const verification = await verifyStoredPassword(password, account);

  if (!verification.valid) {
    return false;
  }

  if (verification.needsUpgrade) {
    const upgradedRecord = await createPasswordRecord(password);
    account.passwordHash = upgradedRecord.passwordHash;
    account.passwordSalt = upgradedRecord.passwordSalt;
    await account.save();
  }

  return true;
}
