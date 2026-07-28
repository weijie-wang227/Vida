const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
const authTokenStorageKey = "vida.authToken";

export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function getAuthToken() {
  if (!canUseStorage()) {
    return null;
  }

  return window.localStorage.getItem(authTokenStorageKey);
}

export function setAuthToken(token: string) {
  if (canUseStorage()) {
    window.localStorage.setItem(authTokenStorageKey, token);
  }
}

export function clearAuthToken() {
  if (canUseStorage()) {
    window.localStorage.removeItem(authTokenStorageKey);
  }
}

async function readErrorMessage(response: Response) {
  const fallback = `API request failed (${response.status} ${response.statusText})`;
  const responseBody = await response.text();

  if (!responseBody) {
    return fallback;
  }

  try {
    const data = JSON.parse(responseBody) as { message?: string };
    return data.message || fallback;
  } catch {
    return responseBody.replace(/\s+/g, " ").trim().slice(0, 500) || fallback;
  }
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = new URL(
    path.replace(/^\//, ""),
    `${apiBaseUrl.replace(/\/$/, "")}/`,
  );
  const headers = new Headers(init?.headers);
  const token = getAuthToken();

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new ApiRequestError(await readErrorMessage(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
