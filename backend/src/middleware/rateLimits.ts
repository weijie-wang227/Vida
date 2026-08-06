import { createHash } from "node:crypto";
import type { Request, Response } from "express";
import {
  ipKeyGenerator,
  rateLimit,
  type Options,
  type ValueDeterminingMiddleware,
} from "express-rate-limit";

const rateLimitMessage = "Too many requests. Please try again shortly.";
const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

type VidaRateLimiterOptions = Pick<
  Options,
  "identifier" | "limit" | "windowMs"
> &
  Partial<
    Pick<
      Options,
      "keyGenerator" | "skip" | "skipFailedRequests" | "skipSuccessfulRequests"
    >
  >;

type PasswordSignInRateLimitOptions = {
  accountLimit: number;
  accountWindowMs: number;
  ipLimit: number;
  ipWindowMs: number;
};

type GoogleAuthRateLimitOptions = {
  limit: number;
  windowMs: number;
};

type RateLimitPrincipalLocals = {
  user?: { _id?: unknown };
  vendorAccount?: { _id?: unknown };
  vendor?: { _id?: unknown } | null;
};

function readPositiveInteger(name: string, fallback: number) {
  const rawValue = process.env[name]?.trim();

  if (!rawValue) {
    return fallback;
  }

  const value = Number(rawValue);

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return value;
}

function getIpKey(req: Request) {
  return ipKeyGenerator(req.ip || req.socket.remoteAddress || "unknown");
}

export function getRateLimitPrincipalKey(req: Request, res: Response) {
  const locals = res.locals as RateLimitPrincipalLocals;
  const principalId =
    locals.user?._id ?? locals.vendorAccount?._id ?? locals.vendor?._id;

  return principalId ? `principal:${String(principalId)}` : `ip:${getIpKey(req)}`;
}

export function getSignInAccountKey(req: Request) {
  const email = String(req.body?.email ?? "")
    .trim()
    .toLowerCase();
  const emailDigest = createHash("sha256").update(email).digest("hex");

  return `signin-account:${emailDigest}`;
}

function skipPreflight(req: Request) {
  return req.method === "OPTIONS";
}

export function shouldSkipGeneralRateLimit(req: Request) {
  if (skipPreflight(req)) {
    return true;
  }

  const path = req.path.replace(/\/+$/, "") || "/";

  return path === "/health" || path === "/payments/webhook/hitpay";
}

function skipSafeMethod(req: Request) {
  return safeMethods.has(req.method);
}

export function createVidaRateLimiter(options: VidaRateLimiterOptions) {
  return rateLimit({
    ...options,
    legacyHeaders: false,
    standardHeaders: "draft-8",
    message: { message: rateLimitMessage },
    handler: (req, res, _next, optionsUsed) => {
      console.warn("Rate limit exceeded.", {
        client: getIpKey(req),
        method: req.method,
        path: req.originalUrl,
        policy:
          typeof optionsUsed.identifier === "string"
            ? optionsUsed.identifier
            : "dynamic",
        rayId:
          typeof req.headers["cf-ray"] === "string"
            ? req.headers["cf-ray"]
            : undefined,
      });
      res.status(optionsUsed.statusCode).json(optionsUsed.message);
    },
  });
}

export function createPasswordSignInRateLimiters(
  options: PasswordSignInRateLimitOptions,
) {
  return {
    account: createVidaRateLimiter({
      identifier: "signin-account",
      windowMs: options.accountWindowMs,
      limit: options.accountLimit,
      keyGenerator: getSignInAccountKey,
      skip: skipPreflight,
      skipSuccessfulRequests: true,
    }),
    ip: createVidaRateLimiter({
      identifier: "signin-ip",
      windowMs: options.ipWindowMs,
      limit: options.ipLimit,
      keyGenerator: getIpKey,
      skip: skipPreflight,
      skipSuccessfulRequests: true,
    }),
  };
}

export function createGoogleAuthRateLimiter(
  options: GoogleAuthRateLimitOptions,
) {
  return createVidaRateLimiter({
    identifier: "google-auth",
    windowMs: options.windowMs,
    limit: options.limit,
    keyGenerator: getIpKey,
    skip: skipPreflight,
  });
}

const principalKeyGenerator: ValueDeterminingMiddleware<string> =
  getRateLimitPrincipalKey;

export const generalApiRateLimiter = createVidaRateLimiter({
  identifier: "general-api",
  windowMs: readPositiveInteger("RATE_LIMIT_GENERAL_WINDOW_MS", 5 * 60_000),
  limit: readPositiveInteger("RATE_LIMIT_GENERAL_MAX", 600),
  skip: shouldSkipGeneralRateLimit,
});

export const signUpRateLimiter = createVidaRateLimiter({
  identifier: "signup",
  windowMs: readPositiveInteger("RATE_LIMIT_SIGNUP_WINDOW_MS", 60 * 60_000),
  limit: readPositiveInteger("RATE_LIMIT_SIGNUP_MAX", 5),
  skip: skipPreflight,
});

const configuredPasswordSignInRateLimiters = createPasswordSignInRateLimiters({
  accountWindowMs: readPositiveInteger(
    "RATE_LIMIT_SIGNIN_ACCOUNT_WINDOW_MS",
    15 * 60_000,
  ),
  accountLimit: readPositiveInteger("RATE_LIMIT_SIGNIN_ACCOUNT_MAX", 10),
  ipWindowMs: readPositiveInteger(
    "RATE_LIMIT_SIGNIN_WINDOW_MS",
    15 * 60_000,
  ),
  ipLimit: readPositiveInteger("RATE_LIMIT_SIGNIN_MAX", 10),
});

export const signInAccountRateLimiter =
  configuredPasswordSignInRateLimiters.account;
export const signInIpRateLimiter = configuredPasswordSignInRateLimiters.ip;
export const passwordSignInRateLimiters = [
  signInIpRateLimiter,
  signInAccountRateLimiter,
] as const;

// Successful requests count because Google verification and account linking
// consume resources, and a replayable valid credential must not bypass limits.
export const googleAuthRateLimiter = createGoogleAuthRateLimiter({
  windowMs: readPositiveInteger(
    "RATE_LIMIT_GOOGLE_AUTH_WINDOW_MS",
    15 * 60_000,
  ),
  limit: readPositiveInteger("RATE_LIMIT_GOOGLE_AUTH_MAX", 20),
});

export const authenticatedMutationRateLimiter = createVidaRateLimiter({
  identifier: "authenticated-mutation",
  windowMs: readPositiveInteger("RATE_LIMIT_MUTATION_WINDOW_MS", 60_000),
  limit: readPositiveInteger("RATE_LIMIT_MUTATION_MAX", 120),
  keyGenerator: principalKeyGenerator,
  skip: skipSafeMethod,
});

export const paymentCheckoutRateLimiter = createVidaRateLimiter({
  identifier: "payment-checkout",
  windowMs: readPositiveInteger("RATE_LIMIT_CHECKOUT_WINDOW_MS", 10 * 60_000),
  limit: readPositiveInteger("RATE_LIMIT_CHECKOUT_MAX", 10),
  keyGenerator: principalKeyGenerator,
  skip: skipPreflight,
});

export const paymentStatusRateLimiter = createVidaRateLimiter({
  identifier: "payment-status",
  windowMs: readPositiveInteger("RATE_LIMIT_PAYMENT_STATUS_WINDOW_MS", 60_000),
  limit: readPositiveInteger("RATE_LIMIT_PAYMENT_STATUS_MAX", 60),
  keyGenerator: principalKeyGenerator,
  skip: skipPreflight,
});

export const uploadRateLimiter = createVidaRateLimiter({
  identifier: "upload-url",
  windowMs: readPositiveInteger("RATE_LIMIT_UPLOAD_WINDOW_MS", 10 * 60_000),
  limit: readPositiveInteger("RATE_LIMIT_UPLOAD_MAX", 30),
  keyGenerator: principalKeyGenerator,
  skip: skipPreflight,
});

export const hitPayWebhookRateLimiter = createVidaRateLimiter({
  identifier: "hitpay-webhook",
  windowMs: readPositiveInteger("RATE_LIMIT_WEBHOOK_WINDOW_MS", 60_000),
  limit: readPositiveInteger("RATE_LIMIT_WEBHOOK_MAX", 120),
  skip: skipPreflight,
});
