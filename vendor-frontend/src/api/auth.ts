import { apiRequest, setAuthToken } from "./client";
import type { AuthResponse, VendorAccount } from "./types";

export type AuthMode = "signin" | "signup";

export type SignInInput = {
  email: string;
  password: string;
};

export type SignUpInput = SignInInput & {
  name: string;
};

export async function signIn(input: SignInInput) {
  const response = await apiRequest<AuthResponse>("/vendor-auth/signin", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setAuthToken(response.token);

  return response;
}

export async function signUp(input: SignUpInput) {
  const response = await apiRequest<AuthResponse>("/vendor-auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setAuthToken(response.token);

  return response;
}

export async function signInWithGoogle(credential: string, password?: string) {
  const response = await apiRequest<AuthResponse>("/vendor-auth/google", {
    method: "POST",
    body: JSON.stringify({ credential, password }),
  });
  setAuthToken(response.token);

  return response;
}

export function fetchCurrentVendorAccount() {
  return apiRequest<{ account: VendorAccount }>("/vendor-auth/me");
}
