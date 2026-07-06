import { ApiRequestError, apiRequest } from "./client";
import type {
  AuthResponse,
  AuthUser,
  SignInInput,
  SignUpInput,
} from "../lib/types";

type AuthAction = "sign in" | "sign up";

function getAuthDebugError(action: AuthAction, error: unknown) {
  if (!(error instanceof ApiRequestError)) {
    return error instanceof Error ? error : new Error(`Unable to ${action}`);
  }

  const { contentType, method, responseBody, status, statusText, url } =
    error.details;
  const lines = [
    `Unable to ${action}: ${status} ${statusText}`.trim(),
    `Request failed: ${method} ${url}`,
  ];

  if (contentType) {
    lines.push(`Response type: ${contentType}`);
  }

  if (responseBody) {
    lines.push(`Response body: ${responseBody}`);
  }

  if (status === 404 && responseBody.includes(`Cannot ${method} /auth/`)) {
    lines.push(
      "Hint: the backend mounts auth routes under /api. Set VITE_API_URL to your backend URL ending in /api.",
    );
  }

  return new Error(lines.join("\n"));
}

export async function signIn(input: SignInInput) {
  try {
    return await apiRequest<AuthResponse>("/auth/signin", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch (error) {
    throw getAuthDebugError("sign in", error);
  }
}

export async function signUp(input: SignUpInput) {
  try {
    return await apiRequest<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch (error) {
    throw getAuthDebugError("sign up", error);
  }
}

export async function fetchCurrentUser() {
  return apiRequest<{ user: AuthUser }>("/auth/me");
}
