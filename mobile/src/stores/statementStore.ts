import { create } from "zustand";
import type { components } from "../lib/api-types";

export type StatementPhase =
  | "idle"
  | "uploading"
  | "queued"
  | "extracting"
  | "reconciling"
  | "completed"
  | "password_required"
  | "password_invalid"
  | "failed";

export type StatementConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "closed";

export interface StatementPdfAsset {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize?: number;
}

export interface StatementEvent {
  event_type: string;
  statement_id: string;
  step: string;
  progress_pct: number;
  data?: Record<string, unknown> | null;
  error?: { code?: string; message?: string; [key: string]: unknown } | null;
}

export type StatementRecord = components["schemas"]["StatementRecordResponse"];
export type StatementUploadResponse = components["schemas"]["StatementUploadResponse"];

interface StatementState {
  phase: StatementPhase;
  statementId: string | null;
  selectedAsset: StatementPdfAsset | null;
  statement: StatementRecord | null;
  events: readonly StatementEvent[];
  progressPct: number;
  errorCode: string | null;
  errorMessage: string | null;
  duplicate: boolean;
  queued: boolean;
  connectionStatus: StatementConnectionStatus;
  reconnectAttempt: number;
  connectionMessage: string | null;
}

interface StatementActions {
  startUpload: (asset: StatementPdfAsset) => void;
  uploadComplete: (response: StatementUploadResponse) => void;
  uploadFailed: (code: string, message: string) => void;
  selectStatement: (statement: StatementRecord) => void;
  receiveEvent: (event: StatementEvent) => void;
  setConnectionStatus: (
    status: StatementConnectionStatus,
    options?: { attempt?: number; message?: string | null },
  ) => void;
  reset: () => void;
}

type StatementStore = StatementState & StatementActions;

const INITIAL_STATE: StatementState = {
  phase: "idle",
  statementId: null,
  selectedAsset: null,
  statement: null,
  events: [],
  progressPct: 0,
  errorCode: null,
  errorMessage: null,
  duplicate: false,
  queued: false,
  connectionStatus: "idle",
  reconnectAttempt: 0,
  connectionMessage: null,
};

const STEP_TO_PHASE: Record<string, StatementPhase> = {
  queued: "queued",
  picked_up: "extracting",
  llm_start: "extracting",
  llm_end: "extracting",
  reconciling: "reconciling",
  completed: "completed",
  password_required: "password_required",
  password_invalid: "password_invalid",
  failed: "failed",
};

const STATEMENT_STATUSES = new Set<StatementRecord["status"]>([
  "uploaded",
  "password_required",
  "password_invalid",
  "queued",
  "extracting",
  "extracted",
  "reconciling",
  "completed",
  "failed",
]);

export const TERMINAL_STATEMENT_EVENTS = new Set([
  "statement_completed",
  "statement_failed",
  "statement_password_required",
  "statement_password_invalid",
]);

export const useStatementStore = create<StatementStore>()((set) => ({
  ...INITIAL_STATE,

  startUpload: (asset) =>
    set({
      ...INITIAL_STATE,
      phase: "uploading",
      selectedAsset: asset,
      progressPct: 5,
    }),

  uploadComplete: (response) =>
    set({
      phase: phaseForStatement(response.statement),
      statementId: response.statement.id,
      selectedAsset: null,
      statement: response.statement,
      events: [],
      progressPct: response.queued ? 10 : response.password_required ? 100 : 0,
      errorCode: response.password_required ? "PASSWORD_REQUIRED" : null,
      errorMessage: response.password_required
        ? "Statement PDF requires a password"
        : null,
      duplicate: response.duplicate,
      queued: response.queued,
      connectionStatus: response.queued ? "connecting" : "closed",
      reconnectAttempt: 0,
      connectionMessage: response.queued ? "Connecting to statement progress" : null,
    }),

  uploadFailed: (code, message) =>
    set({
      phase: "failed",
      errorCode: code,
      errorMessage: message,
      progressPct: 0,
      connectionStatus: "closed",
      connectionMessage: null,
    }),

  selectStatement: (statement) =>
    set({
      phase: phaseForStatement(statement),
      statementId: statement.id,
      selectedAsset: null,
      statement,
      events: [],
      progressPct:
        statement.status === "completed" || statement.status === "extracted"
          ? 100
          : 0,
      errorCode:
        statement.status === "password_required"
          ? "PASSWORD_REQUIRED"
          : statement.status === "password_invalid"
            ? "PASSWORD_INVALID"
            : null,
      errorMessage: null,
      duplicate: false,
      queued: false,
      connectionStatus: "idle",
      reconnectAttempt: 0,
      connectionMessage: null,
    }),

  receiveEvent: (event) =>
    set((state) => {
      if (event.event_type === "heartbeat") return state;

      const phase = STEP_TO_PHASE[event.step] ?? state.phase;
      const eventStatus = statementStatusFromEvent(event.data);
      const isFailure =
        phase === "failed" ||
        phase === "password_required" ||
        phase === "password_invalid";

      return {
        events: [...state.events, event],
        phase,
        statement:
          eventStatus && state.statement?.id === event.statement_id
            ? { ...state.statement, status: eventStatus }
            : state.statement,
        progressPct: event.progress_pct,
        connectionStatus: TERMINAL_STATEMENT_EVENTS.has(event.event_type)
          ? "closed"
          : state.connectionStatus,
        connectionMessage: TERMINAL_STATEMENT_EVENTS.has(event.event_type)
          ? null
          : state.connectionMessage,
        ...(isFailure
          ? {
              errorCode: event.error?.code ?? null,
              errorMessage: event.error?.message ?? null,
            }
          : {}),
      };
    }),

  setConnectionStatus: (status, options) =>
    set({
      connectionStatus: status,
      reconnectAttempt: options?.attempt ?? 0,
      connectionMessage: options?.message ?? null,
    }),

  reset: () => set(INITIAL_STATE),
}));

function phaseForStatement(statement: StatementRecord): StatementPhase {
  if (statement.status === "password_required") return "password_required";
  if (statement.status === "password_invalid") return "password_invalid";
  if (statement.status === "failed") return "failed";
  if (statement.status === "completed" || statement.status === "extracted") {
    return "completed";
  }
  if (statement.status === "reconciling") return "reconciling";
  if (statement.status === "extracting") return "extracting";
  if (statement.status === "queued" || statement.status === "uploaded") {
    return "queued";
  }
  return "idle";
}

function statementStatusFromEvent(
  data: StatementEvent["data"],
): StatementRecord["status"] | null {
  const status = data?.status;
  if (typeof status !== "string") return null;
  if (!STATEMENT_STATUSES.has(status as StatementRecord["status"])) return null;
  return status as StatementRecord["status"];
}
