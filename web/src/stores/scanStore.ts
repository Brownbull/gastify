import { create } from "zustand";

export type ScanPhase =
  | "idle"
  | "uploading"
  | "submitted"
  | "processing"
  | "extracting"
  | "categorizing"
  | "verified"
  | "complete"
  | "failed";

export interface ScanEvent {
  event_type: string;
  scan_id: string;
  step: string;
  progress_pct: number;
  data?: Record<string, unknown> | null;
  error?: ScanErrorDetail | null;
}

export interface ScanErrorDetail {
  code?: string;
  message?: string;
  [key: string]: unknown;
}

export interface ScanSubmissionResult {
  id: string;
  ownership_scope_id: string;
  status: string;
  original_filename: string;
  content_type: string;
  file_size_bytes: number;
  image_path: string;
  thumbnail_path: string | null;
  submitted_at: string;
}

export interface ScanResultData {
  status?: string;
  merchant_name?: string;
  transaction_date?: string;
  currency_code?: string;
  total_amount?: number;
  discount_amount?: number | null;
  gross_total_amount?: number | null;
  reconstructed_total?: number | null;
  reconciliation_severity?: string | null;
  confidence_score?: number;
  line_items?: ReadonlyArray<{
    name: string;
    qty?: number | null;
    unit_price?: number | null;
    total_price: number;
  }>;
  is_new_merchant?: boolean;
  is_unknown_merchant?: boolean;
  discrepancy?: number;
}

interface ScanState {
  phase: ScanPhase;
  scanId: string | null;
  submission: ScanSubmissionResult | null;
  progressPct: number;
  currentStep: string;
  events: readonly ScanEvent[];
  result: ScanResultData | null;
  errorCode: string | null;
  errorMessage: string | null;
}

interface ScanActions {
  startUpload: () => void;
  uploadComplete: (submission: ScanSubmissionResult) => void;
  uploadFailed: (message: string) => void;
  receiveEvent: (event: ScanEvent) => void;
  reset: () => void;
}

type ScanStore = ScanState & ScanActions;

const INITIAL_STATE: ScanState = {
  phase: "idle",
  scanId: null,
  submission: null,
  progressPct: 0,
  currentStep: "",
  events: [],
  result: null,
  errorCode: null,
  errorMessage: null,
};

const STEP_TO_PHASE: Record<string, ScanPhase> = {
  acquire: "submitted",
  load_image: "processing",
  extract: "extracting",
  categorize: "categorizing",
  verify: "verified",
  done: "complete",
};

export const useScanStore = create<ScanStore>()((set) => ({
  ...INITIAL_STATE,

  startUpload: () =>
    set({
      ...INITIAL_STATE,
      phase: "uploading",
    }),

  uploadComplete: (submission) =>
    set({
      phase: "submitted",
      scanId: submission.id,
      submission,
      progressPct: 0,
      currentStep: "submitted",
    }),

  uploadFailed: (message) =>
    set({
      phase: "failed",
      errorCode: "upload_error",
      errorMessage: message,
    }),

  receiveEvent: (event) =>
    set((state) => {
      if (event.event_type === "heartbeat") return state;

      const phase = STEP_TO_PHASE[event.step] ?? state.phase;

      const update: Partial<ScanState> = {
        phase,
        progressPct: event.progress_pct,
        currentStep: event.step,
        events: [...state.events, event],
      };

      if (event.event_type === "scan_complete" && event.data) {
        update.phase = "complete";
        update.result = event.data as unknown as ScanResultData;
      }

      if (event.event_type === "scan_failed" || event.event_type === "error") {
        update.phase = "failed";
        update.errorCode = event.error?.code ?? "unknown_error";
        update.errorMessage =
          event.error?.message ?? "An unexpected error occurred";
      }

      return update;
    }),

  reset: () => set(INITIAL_STATE),
}));
