import { auth } from "@/lib/firebase";
import type { ScanSubmissionResult } from "@/stores/scanStore";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

/**
 * Network primitives for batch scanning. Batch scanning has no dedicated backend
 * endpoint — it is N sequential calls to the existing single-scan pipeline
 * (`POST /api/v1/scans`) followed by per-scan status polling
 * (`GET /api/v1/scans/{id}`). The backend auto-persists a transaction during async
 * processing, so there is no separate "save" call; reaching `completed` /
 * `needs_review` *is* the save and populates `transaction_id`.
 *
 * Every call takes injectable `fetchImpl` / `tokenProvider` so the orchestration
 * hook stays unit-testable without Firebase or a live network.
 */

export type ScanLifecycleStatus =
  | "submitted"
  | "queued"
  | "processing"
  | "extracted"
  | "categorized"
  | "completed"
  | "needs_review"
  | "failed";

export interface ScanStatusResult {
  id: string;
  status: ScanLifecycleStatus | string;
  error_code: string | null;
  error_message: string | null;
  transaction_id: string | null;
}

export interface BatchScanRequestOptions {
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  tokenProvider?: () => Promise<string | null>;
  apiBase?: string;
}

export class BatchScanError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "BatchScanError";
    this.code = code;
  }
}

async function defaultTokenProvider(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

async function resolveToken(
  options: BatchScanRequestOptions,
): Promise<string> {
  const tokenProvider = options.tokenProvider ?? defaultTokenProvider;
  const token = await tokenProvider();
  if (!token) {
    throw new BatchScanError("auth_error", "Sign in again before scanning");
  }
  return token;
}

/** Upload a single receipt image. Returns immediately with the submitted scan. */
export async function submitScan(
  file: File,
  options: BatchScanRequestOptions = {},
): Promise<ScanSubmissionResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const apiBase = options.apiBase ?? API_BASE;
  const token = await resolveToken(options);

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetchImpl(`${apiBase}/api/v1/scans`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
    signal: options.signal,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { detail?: string }
      | null;
    throw new BatchScanError(
      "upload_error",
      body?.detail ?? `Upload failed (${response.status})`,
    );
  }

  return (await response.json()) as ScanSubmissionResult;
}

/** Poll the authoritative status row for a scan (replica-safe, no stream). */
export async function getScanStatus(
  scanId: string,
  options: BatchScanRequestOptions = {},
): Promise<ScanStatusResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const apiBase = options.apiBase ?? API_BASE;
  const token = await resolveToken(options);

  const response = await fetchImpl(`${apiBase}/api/v1/scans/${scanId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    signal: options.signal,
  });

  if (!response.ok) {
    throw new BatchScanError(
      "status_error",
      `Status check failed (${response.status})`,
    );
  }

  return (await response.json()) as ScanStatusResult;
}

/** Re-queue a quota-throttled (`queued`) or failed scan for another pass. */
export async function triggerProcess(
  scanId: string,
  options: BatchScanRequestOptions = {},
): Promise<void> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const apiBase = options.apiBase ?? API_BASE;
  const token = await resolveToken(options);

  const response = await fetchImpl(`${apiBase}/api/v1/scans/${scanId}/process`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    signal: options.signal,
  });

  if (!response.ok) {
    throw new BatchScanError(
      "retry_error",
      `Retry failed (${response.status})`,
    );
  }
}

/**
 * Discard a batch-created transaction by deleting it. Reuses the Phase 2
 * batch-delete endpoint so a discarded receipt leaves no trace in the ledger.
 */
export async function discardTransactions(
  transactionIds: readonly string[],
  options: BatchScanRequestOptions = {},
): Promise<void> {
  if (transactionIds.length === 0) return;
  const fetchImpl = options.fetchImpl ?? fetch;
  const apiBase = options.apiBase ?? API_BASE;
  const token = await resolveToken(options);

  const response = await fetchImpl(
    `${apiBase}/api/v1/transactions/batch-delete`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ transaction_ids: transactionIds }),
      signal: options.signal,
    },
  );

  if (!response.ok) {
    throw new BatchScanError(
      "discard_error",
      `Discard failed (${response.status})`,
    );
  }
}
