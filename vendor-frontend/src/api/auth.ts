import { apiRequest, setAuthToken } from "./client";
import type { AuthResponse, AuthUser } from "./types";

export type AuthMode = "signin" | "signup";

export type SignInInput = {
  email: string;
  password: string;
};

export type SignUpInput = SignInInput & {
  name: string;
  handle?: string;
};

export async function signIn(input: SignInInput) {
  const response = await apiRequest<AuthResponse>("/auth/signin", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setAuthToken(response.token);

  return response;
}

export async function signUp(input: SignUpInput) {
  const response = await apiRequest<AuthResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setAuthToken(response.token);

  return response;
}

export function fetchCurrentUser() {
  return apiRequest<{ user: AuthUser }>("/auth/me");
}
