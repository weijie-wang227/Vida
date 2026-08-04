import { ApiRequestError, apiRequest } from "./client";
import type {
  AuthResponse,
  AuthUser,
  SignInInput,
  SignUpInput,
} from "../lib/types";

type AuthAction = "sign in" | "sign up" | "sign in with Google";

function getAuthUserError(action: AuthAction, error: unknown) {
  if (!(error instanceof ApiRequestError)) {
    return new Error(
      `Unable to ${action} right now. Check your connection and try again.`,
    );
  }

  if ([400, 401, 409].includes(error.details.status)) {
    return new Error(error.message);
  }

  return new Error(`Unable to ${action} right now. Please try again later.`);
}

export async function signIn(input: SignInInput) {
  try {
    return await apiRequest<AuthResponse>("/auth/signin", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch (error) {
    throw getAuthUserError("sign in", error);
  }
}

export async function signUp(input: SignUpInput) {
  try {
    return await apiRequest<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch (error) {
    throw getAuthUserError("sign up", error);
  }
}

export async function signInWithGoogle(credential: string, password?: string) {
  try {
    return await apiRequest<AuthResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential, password }),
    });
  } catch (error) {
    throw getAuthUserError("sign in with Google", error);
  }
}

export async function fetchCurrentUser() {
  return apiRequest<{ user: AuthUser }>("/auth/me");
}
