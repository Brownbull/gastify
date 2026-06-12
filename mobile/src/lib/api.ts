import createClient from "openapi-fetch";
import type { paths } from "./api-types";
import { mobileConfig } from "./mobileConfig";
import { getSecureAuthToken } from "./secureAuthToken";

let currentToken: string | null = null;

export const apiClient = createClient<paths>({
  baseUrl: mobileConfig.apiBaseUrl,
});

/** Minimal module-level pub/sub for rate-limit (429) events — RN has no window
 * CustomEvent, so the toast subscribes to this instead. */
type RateLimitListener = (retryAfterSeconds: number) => void;
const rateLimitListeners = new Set<RateLimitListener>();

export function onRateLimited(listener: RateLimitListener): () => void {
  rateLimitListeners.add(listener);
  return () => rateLimitListeners.delete(listener);
}

apiClient.use({
  async onRequest({ request }) {
    return attachAuthHeader(request);
  },
  onResponse({ response }) {
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after")) || 0;
      for (const listener of rateLimitListeners) listener(retryAfter);
    }
    return response;
  },
});

export function setAuthToken(token: string | null) {
  currentToken = token;
}

export async function getCurrentAuthToken(): Promise<string | null> {
  return currentToken ?? (await getSecureAuthToken());
}

export async function attachAuthHeader(request: Request): Promise<Request> {
  const token = await getCurrentAuthToken();
  if (token) {
    request.headers.set("Authorization", `Bearer ${token}`);
  }

  return request;
}
