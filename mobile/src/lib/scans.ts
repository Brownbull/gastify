import { apiClient } from "./api";
import { PollHttpError } from "./progressFallback";
import type { components } from "./api-types";

export type ScanResult = components["schemas"]["ScanResult"];

/**
 * GET a single scan's Postgres-backed status row (poll-fallback source of truth, D66).
 * Throws PollHttpError (carrying the HTTP status) so the fallback controller can route
 * 404 (gone) vs transient (auth/5xx). Auth header is injected by the apiClient middleware.
 */
export async function getScan(scanId: string, signal?: AbortSignal): Promise<ScanResult> {
  const { data, error, response } = await apiClient.GET("/api/v1/scans/{scan_id}", {
    params: { path: { scan_id: scanId } },
    signal,
  });
  if (error || !data) {
    throw new PollHttpError(response?.status ?? 0, "Failed to fetch scan status");
  }
  return data;
}
