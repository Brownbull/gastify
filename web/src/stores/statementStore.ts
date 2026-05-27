import { create } from "zustand";
import type { components } from "@/lib/api-types";

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

export interface StatementEvent {
  event_type: string;
  statement_id: string;
  step: string;
  progress_pct: number;
  data?: Record<string, unknown> | null;
  error?: { code?: string; message?: string } | null;
}

type StatementRecord = components["schemas"]["StatementRecordResponse"];
type StatementUploadResponse = components["schemas"]["StatementUploadResponse"];

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

interface StatementState {
  phase: StatementPhase;
  statement: StatementRecord | null;
  events: readonly StatementEvent[];
  progressPct: number;
  errorCode: string | null;
  errorMessage: string | null;
  duplicate: boolean;
  queued: boolean;
}

interface StatementActions {
  startUpload: () => void;
  uploadComplete: (response: StatementUploadResponse) => void;
  uploadFailed: (message: string, code?: string | null) => void;
  selectStatement: (statement: StatementRecord) => void;
  receiveEvent: (event: StatementEvent) => void;
  reset: () => void;
}

type StatementStore = StatementState & StatementActions;

const INITIAL_STATE: StatementState = {
  phase: "idle",
  statement: null,
  events: [],
  progressPct: 0,
  errorCode: null,
  errorMessage: null,
  duplicate: false,
  queued: false,
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

function terminalError(event: StatementEvent): Pick<
  StatementState,
  "errorCode" | "errorMessage"
> {
  return {
    errorCode: event.error?.code ?? null,
    errorMessage: event.error?.message ?? null,
  };
}

function statementStatusFromEvent(
  data: StatementEvent["data"],
): StatementRecord["status"] | null {
  const status = data?.status;
  if (typeof status !== "string") return null;
  if (!STATEMENT_STATUSES.has(status as StatementRecord["status"])) return null;
  return status as StatementRecord["status"];
}

export const useStatementStore = create<StatementStore>()((set) => ({
  ...INITIAL_STATE,

  startUpload: () =>
    set({
      ...INITIAL_STATE,
      phase: "uploading",
      progressPct: 5,
    }),

  uploadComplete: (response) =>
    set({
      phase: phaseForStatement(response.statement),
      statement: response.statement,
      events: [],
      progressPct: response.queued ? 10 : response.password_required ? 100 : 0,
      errorCode: response.password_required ? "PASSWORD_REQUIRED" : null,
      errorMessage: response.password_required
        ? "Statement PDF requires a password"
        : null,
      duplicate: response.duplicate,
      queued: response.queued,
    }),

  uploadFailed: (message, code = null) =>
    set({
      phase: "failed",
      errorCode: code,
      errorMessage: message,
      progressPct: 0,
    }),

  selectStatement: (statement) =>
    set({
      phase: phaseForStatement(statement),
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
    }),

  receiveEvent: (event) =>
    set((state) => {
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
        ...(isFailure ? terminalError(event) : {}),
      };
    }),

  reset: () => set(INITIAL_STATE),
}));
