import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Types } from "mongoose";
import { isMongoConnected } from "./db.js";
import { UserModel, type UserDocument } from "./models/VidaData.js";

type TokenPayload = {
  sub: string;
  email: string;
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

const tokenDurationSeconds = 60 * 60 * 24 * 7;
const passwordKeyLength = 64;

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

function hashPassword(password: string, salt: string) {
  return scryptSync(password, salt, passwordKeyLength).toString("hex");
}

function safeCompare(a: string, b: string) {
  const aBuffer = Buffer.from(a, "hex");
  const bBuffer = Buffer.from(b, "hex");

  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}

function signPayload(payloadPart: string) {
  return createHmac("sha256", getAuthSecret())
    .update(payloadPart)
    .digest("base64url");
}

function createTokenPayload(user: AuthUserRecord): TokenPayload {
  const now = Math.floor(Date.now() / 1000);

  return {
    sub: String(user._id),
    email: normalizeEmail(user.email),
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

    if (!payload.sub || !payload.email || payload.exp < Date.now() / 1000) {
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

export function createPasswordRecord(password: string) {
  const passwordSalt = randomBytes(16).toString("hex");

  return {
    passwordSalt,
    passwordHash: hashPassword(password, passwordSalt),
  };
}

export function verifyPassword(password: string, user: AuthUserRecord) {
  if (!user.passwordHash || !user.passwordSalt) {
    return false;
  }

  return safeCompare(hashPassword(password, user.passwordSalt), user.passwordHash);
}

export function createAuthToken(user: AuthUserRecord) {
  const payloadPart = Buffer.from(JSON.stringify(createTokenPayload(user))).toString(
    "base64url",
  );

  return `${payloadPart}.${signPayload(payloadPart)}`;
}

export async function findAuthenticatedUser(authorizationHeader?: string) {
  const token = authorizationHeader?.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return null;
  }

  const payload = verifyToken(token);

  if (!payload) {
    return null;
  }

  return isMongoConnected()
    ? UserModel.findOne({ email: normalizeEmail(payload.email) })
    : null;
}

export function createAvatarUrl(name: string, email: string) {
  const seed = encodeURIComponent(name.trim() || email);

  return `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&backgroundColor=c9993a&textColor=0e0e0f`;
}
