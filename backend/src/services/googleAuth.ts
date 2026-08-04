import {
  OAuth2Client,
  type TokenPayload,
} from "google-auth-library";
import { normalizeEmail } from "./auth.js";

export type GoogleIdentity = {
  subject: string;
  email: string;
  name: string;
  picture?: string;
  emailIsAuthoritative: boolean;
};

type GoogleIdentityPayload = Pick<
  Partial<TokenPayload>,
  "sub" | "email" | "email_verified" | "name" | "picture" | "hd"
>;

export class GoogleAuthError extends Error {
  kind: "configuration" | "credential";

  constructor(kind: "configuration" | "credential", message: string) {
    super(message);
    this.name = "GoogleAuthError";
    this.kind = kind;
  }
}

const googleClient = new OAuth2Client();

export function isGoogleProfilePictureUrl(value?: string) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      (url.hostname === "googleusercontent.com" ||
        url.hostname.endsWith(".googleusercontent.com"))
    );
  } catch {
    return false;
  }
}

export function normalizeGooglePictureUrl(picture?: string) {
  if (!picture?.startsWith("https://")) {
    return undefined;
  }

  if (!isGoogleProfilePictureUrl(picture)) {
    return picture;
  }

  return picture.replace(/=s\d+(?:-[a-z0-9]+)*$/i, "=s256-c");
}

function getGoogleClientId() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();

  if (!clientId) {
    throw new GoogleAuthError(
      "configuration",
      "Google sign-in is not configured.",
    );
  }

  return clientId;
}

export function googleIsAuthoritativeForEmail(payload: GoogleIdentityPayload) {
  const email = normalizeEmail(payload.email);

  return (
    email.endsWith("@gmail.com") ||
    (payload.email_verified === true && Boolean(payload.hd))
  );
}

export function parseGoogleIdentity(
  payload?: GoogleIdentityPayload,
): GoogleIdentity {
  const subject = payload?.sub?.trim();
  const email = normalizeEmail(payload?.email);

  if (!payload || !subject || !email || payload.email_verified !== true) {
    throw new GoogleAuthError(
      "credential",
      "Google did not return a verified account identity.",
    );
  }

  const fallbackName = email.split("@")[0] || "Vida user";
  const name = payload.name?.trim() || fallbackName;
  const picture = normalizeGooglePictureUrl(payload.picture);

  return {
    subject,
    email,
    name,
    picture,
    emailIsAuthoritative: googleIsAuthoritativeForEmail(payload),
  };
}

export async function verifyGoogleCredential(credential: string) {
  const clientId = getGoogleClientId();

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });

    return parseGoogleIdentity(ticket.getPayload());
  } catch (error) {
    if (error instanceof GoogleAuthError) {
      throw error;
    }

    throw new GoogleAuthError(
      "credential",
      "Google sign-in could not be verified.",
    );
  }
}
