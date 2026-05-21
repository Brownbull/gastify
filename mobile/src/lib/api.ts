import createClient from "openapi-fetch";
import type { paths } from "./api-types";
import { mobileConfig } from "./mobileConfig";
import { getSecureAuthToken } from "./secureAuthToken";

let currentToken: string | null = null;

export const apiClient = createClient<paths>({
  baseUrl: mobileConfig.apiBaseUrl,
});

apiClient.use({
  async onRequest({ request }) {
    return attachAuthHeader(request);
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
