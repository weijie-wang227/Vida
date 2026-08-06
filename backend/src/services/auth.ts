import { createHmac, timingSafeEqual } from "node:crypto";
import type { Types } from "mongoose";
import { isMongoConnected } from "../db.js";
import {
  UserModel,
  VendorAccountModel,
  type UserDocument,
  type VendorAccountDocument,
} from "../models/VidaData.js";
export {
  createPasswordRecord,
  INVALID_SIGN_IN_MESSAGE,
  PASSWORD_HASH_POLICY,
  verifyPassword,
  verifyPasswordAndUpgrade,
} from "./passwordHashing.js";

type AccountKind = "user" | "vendor";

type TokenPayload = {
  sub: string;
  email: string;
  kind?: AccountKind;
  iat: number;
  exp: number;
};

export type AuthUserRecord = Pick<
  UserDocument,
  "mockId" | "name" | "handle" | "email" | "avatarUrl" | "bio" | "stats"
> & {
  _id: Types.ObjectId | string;
  passwordHash?: string;
  passwordSalt?: string;
};

export type AuthVendorAccountRecord = Pick<
  VendorAccountDocument,
  "name" | "email"
> & {
  _id: Types.ObjectId | string;
  passwordHash?: string;
  passwordSalt?: string;
};

const tokenDurationSeconds = 60 * 60 * 24 * 7;

function getAuthSecret() {
  const authSecret =
    process.env.AUTH_SECRET?.trim() || process.env.JWT_SECRET?.trim();

  if (authSecret) {
    return authSecret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is required in production.");
  }

  return "vida-local-development-secret";
}

function signPayload(payloadPart: string) {
  return createHmac("sha256", getAuthSecret())
    .update(payloadPart)
    .digest("base64url");
}

function createTokenPayload(
  account: Pick<AuthUserRecord, "_id" | "email">,
  kind: AccountKind,
): TokenPayload {
  const now = Math.floor(Date.now() / 1000);

  return {
    sub: String(account._id),
    email: normalizeEmail(account.email),
    kind,
    iat: now,
    exp: now + tokenDurationSeconds,
  };
}

function verifyToken(token: string): TokenPayload | null {
  const [payloadPart, signature] = token.split(".");

  if (!payloadPart || !signature) {
    return null;
  }

  const expectedSignature = signPayload(payloadPart);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(payloadPart, "base64url").toString("utf8"),
    ) as TokenPayload;

    if (
      !payload.sub ||
      !payload.email ||
      (payload.kind !== undefined &&
        payload.kind !== "user" &&
        payload.kind !== "vendor") ||
      payload.exp < Date.now() / 1000
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function normalizeEmail(email: unknown) {
  return String(email ?? "").trim().toLowerCase();
}

export function normalizeHandle(handle: unknown, fallback: string) {
  const base = String(handle || fallback)
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9_]+/g, "");

  return `@${(base || "vidauser").slice(0, 24)}`;
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function createAuthToken(user: AuthUserRecord) {
  const payloadPart = Buffer.from(
    JSON.stringify(createTokenPayload(user, "user")),
  ).toString("base64url");

  return `${payloadPart}.${signPayload(payloadPart)}`;
}

export function createVendorAuthToken(account: AuthVendorAccountRecord) {
  const payloadPart = Buffer.from(
    JSON.stringify(createTokenPayload(account, "vendor")),
  ).toString("base64url");

  return `${payloadPart}.${signPayload(payloadPart)}`;
}

export async function findAuthenticatedUser(authorizationHeader?: string) {
  const token = authorizationHeader?.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return null;
  }

  const payload = verifyToken(token);

  if (!payload || (payload.kind !== undefined && payload.kind !== "user")) {
    return null;
  }

  return isMongoConnected()
    ? UserModel.findById(payload.sub)
    : null;
}

export async function findAuthenticatedVendorAccount(
  authorizationHeader?: string,
) {
  const token = authorizationHeader?.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return null;
  }

  const payload = verifyToken(token);

  if (!payload || payload.kind !== "vendor") {
    return null;
  }

  return isMongoConnected()
    ? VendorAccountModel.findById(payload.sub)
    : null;
}

export function createAvatarUrl(name: string, email: string) {
  const seed = encodeURIComponent(name.trim() || email);

  return `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&backgroundColor=c9993a&textColor=0e0e0f`;
}
