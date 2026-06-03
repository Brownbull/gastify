import type { BatchItemPatch } from "../stores/batchScanStore";
import type { ScanResult } from "./scans";

/**
 * Maps a polled scan status row (`GET /scans/{id}`) to a batch item patch. The
 * backend persists a transaction on `completed` / `needs_review`, so those carry
 * `transaction_id`; `failed` carries the error. Kept dependency-free so it can be
 * unit-tested without the API client or native modules.
 */

const STATUS_PROGRESS: Record<string, number> = {
  submitted: 10,
  queued: 10,
  processing: 30,
  extracted: 55,
  categorized: 80,
};

export function scanStatusToPatch(scan: ScanResult): BatchItemPatch {
  switch (scan.status) {
    case "completed":
      return {
        status: "completed",
        progressPct: 100,
        transactionId: scan.transaction_id ?? null,
      };
    case "needs_review":
      return {
        status: "needs_review",
        progressPct: 100,
        transactionId: scan.transaction_id ?? null,
      };
    case "failed":
      return {
        status: "failed",
        progressPct: 100,
        errorCode: scan.error_code ?? "scan_failed",
        errorMessage: scan.error_message ?? null,
      };
    default:
      return {
        status: "processing",
        progressPct: STATUS_PROGRESS[scan.status] ?? 30,
      };
  }
}
