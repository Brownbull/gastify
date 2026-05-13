import createClient from "openapi-fetch";
import type { paths } from "./api-types";

let currentToken: string | null = null;

export const apiClient = createClient<paths>({
  baseUrl: "/",
});

apiClient.use({
  onRequest({ request }) {
    if (currentToken) {
      request.headers.set("Authorization", `Bearer ${currentToken}`);
    }
    return request;
  },
});

export function setAuthToken(token: string | null) {
  currentToken = token;
}
