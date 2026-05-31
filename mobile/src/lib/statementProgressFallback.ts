import { useStatementStore, type StatementEvent } from "../stores/statementStore";
import type { StatementRecord } from "./statements";

/**
 * Statement poll-fallback mapping (ADR D62 Path A): maps a GET /statements/{id} status
 * row to a synthetic StatementEvent fed through the existing store reducer. Pure (store +
 * type-only StatementRecord) so it is unit-testable without the API / expo chain.
 *
 * CRITICAL: status 'extracted' maps to the 'reconciling' step (NOT terminal). The pipeline
 * still has a reconciling stage after extraction; latching 'extracted' as completed would
 * flip phase to 'completed' and fire the reconciliation query before buckets exist. The
 * poll keeps going until 'completed' | 'failed' | 'password_*', mirroring the WS terminal set.
 */

interface SyntheticStatementEvent {
  event_type: string;
  step: string;
  progress: number;
}

const STATEMENT_STATUS_EVENT: Record<StatementRecord["status"], SyntheticStatementEvent> = {
  uploaded: { event_type: "statement_progress", step: "queued", progress: 10 },
  queued: { event_type: "statement_progress", step: "queued", progress: 10 },
  extracting: { event_type: "statement_progress", step: "llm_start", progress: 40 },
  extracted: { event_type: "statement_progress", step: "reconciling", progress: 75 },
  reconciling: { event_type: "statement_progress", step: "reconciling", progress: 75 },
  completed: { event_type: "statement_completed", step: "completed", progress: 100 },
  failed: { event_type: "statement_failed", step: "failed", progress: 100 },
  password_required: {
    event_type: "statement_password_required",
    step: "password_required",
    progress: 100,
  },
  password_invalid: {
    event_type: "statement_password_invalid",
    step: "password_invalid",
    progress: 100,
  },
};

const STATEMENT_TERMINAL_STATUSES = new Set<StatementRecord["status"]>([
  "completed",
  "failed",
  "password_required",
  "password_invalid",
]);

/** Apply a polled statement status row to the store. Returns true when terminal. */
export function applyStatementStatus(result: StatementRecord): boolean {
  const mapping = STATEMENT_STATUS_EVENT[result.status];

  let error: StatementEvent["error"] = null;
  if (result.status === "failed") {
    error = { code: result.error_code ?? "statement_error", message: "Statement processing failed" };
  } else if (result.status === "password_required" || result.status === "password_invalid") {
    error = { code: result.status, message: "Statement PDF requires a password" };
  }

  const event: StatementEvent = {
    event_type: mapping.event_type,
    statement_id: result.id,
    step: mapping.step,
    progress_pct: mapping.progress,
    data: { status: result.status },
    error,
  };

  useStatementStore.getState().receiveEvent(event);
  return STATEMENT_TERMINAL_STATUSES.has(result.status);
}
