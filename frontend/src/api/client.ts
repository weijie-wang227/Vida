const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
const authTokenStorageKey = "vida.authToken";

type ApiRequestErrorDetails = {
  path: string;
  url: string;
  method: string;
  status: number;
  statusText: string;
  contentType: string | null;
  responseBody: string;
};

export class ApiRequestError extends Error {
  details: ApiRequestErrorDetails;

  constructor(message: string, details: ApiRequestErrorDetails) {
    super(message);
    this.name = "ApiRequestError";
    this.details = details;
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

function trimResponseBody(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 500);
}

async function readErrorMessage(response: Response, responseBody: string) {
  const fallback = `API request failed (${response.status} ${response.statusText})`;

  if (!responseBody) {
    return fallback;
  }

  try {
    const data = JSON.parse(responseBody) as { message?: string };
    return data.message || fallback;
  } catch {
    return trimResponseBody(responseBody) || fallback;
  }
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = new URL(path.replace(/^\//, ""), `${apiBaseUrl.replace(/\/$/, "")}/`);
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
    const responseBody = await response.text();
    const message = await readErrorMessage(response, responseBody);

    throw new ApiRequestError(message, {
      path,
      url: url.toString(),
      method: init?.method ?? "GET",
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get("content-type"),
      responseBody: trimResponseBody(responseBody),
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const responseBody = await response.text();

  if (!responseBody) {
    return undefined as T;
  }

  return JSON.parse(responseBody) as T;
}
