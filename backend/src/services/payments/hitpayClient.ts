import crypto from "node:crypto";
import {
  formatSgdAmount,
  parseHitPayAmountToMinor,
  sgdCurrency,
} from "./money.js";

const requestTimeoutMs = 15_000;
const allowedHitPayApiHosts = new Set([
  "api.sandbox.hit-pay.com",
  "api.hit-pay.com",
]);

export type HitPayPaymentRequest = {
  id: string;
  amount: string;
  currency: string;
  status: string;
  reference_number?: string;
  url?: string;
  payments?: Array<{
    id?: string;
    status?: string;
    amount?: string | number;
    currency?: string;
    fees?: string | number;
    payment_type?: string;
    status_reason?: string;
    status_reason_code?: string;
  }>;
};

type CreateHitPayPaymentRequestInput = {
  amountMinor: number;
  referenceNumber: string;
  purpose: string;
  customer: {
    name?: string;
    email?: string;
  };
  redirectUrl: string;
};

export class HitPayConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HitPayConfigurationError";
  }
}

export class HitPayRequestError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "HitPayRequestError";
  }
}

function getHitPayApiKey() {
  const apiKey = process.env.HITPAY_API_KEY?.trim();

  if (!apiKey) {
    throw new HitPayConfigurationError(
      "HITPAY_API_KEY is required for sandbox payments.",
    );
  }

  return apiKey;
}

function getHitPayWebhookSalt() {
  const salt = process.env.HITPAY_WEBHOOK_SALT?.trim();

  if (!salt) {
    throw new HitPayConfigurationError(
      "HITPAY_WEBHOOK_SALT is required for HitPay webhooks.",
    );
  }

  return salt;
}

function getConfiguredHitPayApiUrl() {
  const configuredUrl =
    process.env.HITPAY_API_URL?.trim() ||
    process.env.HITPAY_URL_BASE?.trim();

  if (!configuredUrl) {
    throw new HitPayConfigurationError(
      "HITPAY_API_URL is required for HitPay payments.",
    );
  }

  return configuredUrl;
}

export function buildHitPayApiUrl(configuredUrl: string, path: string) {
  let apiUrl: URL;

  try {
    apiUrl = new URL(configuredUrl);
  } catch {
    throw new HitPayConfigurationError(
      "HITPAY_API_URL must be a valid HTTPS URL.",
    );
  }

  if (apiUrl.protocol !== "https:") {
    throw new HitPayConfigurationError("HitPay API URL must use HTTPS.");
  }

  if (!allowedHitPayApiHosts.has(apiUrl.hostname.toLowerCase())) {
    throw new HitPayConfigurationError(
      "HITPAY_API_URL must use HitPay's official sandbox or production API host.",
    );
  }

  if (apiUrl.username || apiUrl.password || apiUrl.search || apiUrl.hash) {
    throw new HitPayConfigurationError(
      "HITPAY_API_URL must not contain credentials, query parameters, or a fragment.",
    );
  }

  const configuredPath = apiUrl.pathname.replace(/\/+$/, "");

  if (configuredPath && configuredPath !== "/v1") {
    throw new HitPayConfigurationError(
      "HITPAY_API_URL must contain only the API origin, without a resource path.",
    );
  }

  if (!path.startsWith("/")) {
    throw new HitPayConfigurationError("HitPay API paths must start with '/'.");
  }

  return `${apiUrl.origin}/v1${path}`;
}

async function hitPayRequest<T>(path: string, init: RequestInit): Promise<T> {
  const url = buildHitPayApiUrl(getConfiguredHitPayApiUrl(), path);
  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-BUSINESS-API-KEY": getHitPayApiKey(),
    "X-Requested-With": "XMLHttpRequest",
  });

  if (init.headers) {
    new Headers(init.headers).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      headers,
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
  } catch (error) {
    console.error("[HitPay] request failed", {
      method: init.method ?? "GET",
      url,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  const responseText = await response.text();
  let payload: unknown = null;

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = responseText;
    }
  }

  if (!response.ok) {
    const providerMessage =
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof payload.message === "string"
        ? payload.message
        : `HitPay request failed with status ${response.status}.`;

    throw new HitPayRequestError(providerMessage, response.status);
  }

  return payload as T;
}

export async function createHitPayPaymentRequest(
  input: CreateHitPayPaymentRequestInput,
) {
  return hitPayRequest<HitPayPaymentRequest>("/payment-requests", {
    method: "POST",
    body: JSON.stringify({
      amount: formatSgdAmount(input.amountMinor),
      currency: sgdCurrency,
      name: input.customer.name,
      email: input.customer.email,
      purpose: input.purpose.slice(0, 255),
      reference_number: input.referenceNumber,
      redirect_url: input.redirectUrl,
      allow_repeated_payments: false,
      expires_after: "5 mins",
      send_email: false,
      send_sms: false,
    }),
  });
}

export async function getHitPayPaymentRequest(requestId: string) {
  return hitPayRequest<HitPayPaymentRequest>(
    `/payment-requests/${encodeURIComponent(requestId)}`,
    { method: "GET" },
  );
}

export function verifyHitPayWebhookSignature(
  rawBody: Buffer,
  signature: string | undefined,
) {
  if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", getHitPayWebhookSalt())
    .update(rawBody)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const signatureBuffer = Buffer.from(signature, "hex");

  return (
    expectedBuffer.length === signatureBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  );
}

export function validateHitPayPaymentPayload(
  payload: HitPayPaymentRequest,
  expected: {
    providerRequestId: string;
    referenceNumber: string;
    amountMinor: number;
    currency: string;
  },
) {
  return (
    payload.id === expected.providerRequestId &&
    payload.reference_number === expected.referenceNumber &&
    parseHitPayAmountToMinor(payload.amount) === expected.amountMinor &&
    String(payload.currency).toUpperCase() === expected.currency
  );
}
