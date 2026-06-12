import createClient from "openapi-fetch";
import type { paths } from "./api-types";

let currentToken: string | null = null;

export const apiClient = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? "/",
});

/** Fired when any request is rate-limited (429). Detail carries the Retry-After
 * seconds (0 if absent) so a global toast can tell the user when to retry. */
export const RATE_LIMIT_EVENT = "gastify:rate-limited";

export interface RateLimitDetail {
  retryAfterSeconds: number;
}

apiClient.use({
  onRequest({ request }) {
    if (currentToken) {
      request.headers.set("Authorization", `Bearer ${currentToken}`);
    }
    return request;
  },
  onResponse({ response }) {
    if (response.status === 429 && typeof window !== "undefined") {
      const retryAfter = Number(response.headers.get("retry-after")) || 0;
      window.dispatchEvent(
        new CustomEvent<RateLimitDetail>(RATE_LIMIT_EVENT, {
          detail: { retryAfterSeconds: retryAfter },
        }),
      );
    }
    return response;
  },
});

export function setAuthToken(token: string | null) {
  currentToken = token;
}
