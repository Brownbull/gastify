import { useScanStore, type ScanEvent } from "../stores/scanStore";
import type { ScanResult } from "./scans";

/**
 * Scan poll-fallback mapping (D66): maps a GET /scans/{id} status row to a synthetic
 * ScanEvent and feeds the existing store reducer, so phase/progress/result derivation
 * is never re-implemented. Terminal completion carries `transaction_id` so the home
 * screen can navigate to the result transaction without the WS event.
 *
 * Pure (store + type-only ScanResult) so it is unit-testable without loading the API /
 * expo-secure-store chain. The hook wires it to getScan via ProgressFallback.
 */

interface SyntheticScanEvent {
  event_type: string;
  step: string;
  progress: number;
}

// `step` drives STEP_TO_PHASE in the scan store; progress is coarse (the WS gives the
// precise per-step value when healthy).
const SCAN_STATUS_EVENT: Record<string, SyntheticScanEvent> = {
  submitted: { event_type: "scan_progress", step: "acquire", progress: 5 },
  queued: { event_type: "scan_progress", step: "acquire", progress: 5 },
  processing: { event_type: "scan_progress", step: "load_image", progress: 20 },
  extracted: { event_type: "scan_progress", step: "stage1", progress: 50 },
  categorized: { event_type: "scan_progress", step: "stage2", progress: 75 },
  completed: { event_type: "scan_complete", step: "done", progress: 100 },
  needs_review: { event_type: "scan_complete", step: "done", progress: 100 },
  failed: { event_type: "scan_failed", step: "persist", progress: 100 },
};

const SCAN_TERMINAL_STATUSES = new Set(["completed", "needs_review", "failed"]);

/** Apply a polled scan status row to the store. Returns true when terminal. */
export function applyScanStatus(result: ScanResult): boolean {
  const mapping = SCAN_STATUS_EVENT[result.status] ?? {
    event_type: "scan_progress",
    step: "load_image",
    progress: 20,
  };

  const event: ScanEvent = {
    event_type: mapping.event_type,
    scan_id: result.id,
    step: mapping.step,
    progress_pct: mapping.progress,
    data:
      mapping.event_type === "scan_complete"
        ? { status: result.status, transaction_id: result.transaction_id ?? undefined }
        : null,
    error:
      mapping.event_type === "scan_failed"
        ? {
            code: result.error_code ?? "unknown_error",
            message: result.error_message ?? "Scan failed",
          }
        : null,
  };

  useScanStore.getState().receiveEvent(event);
  return SCAN_TERMINAL_STATUSES.has(result.status);
}
