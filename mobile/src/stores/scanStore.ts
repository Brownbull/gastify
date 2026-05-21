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

export type ScanConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "closed";

export interface ReceiptScanAsset {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize?: number;
  width?: number;
  height?: number;
  source: "camera" | "library" | "test-case";
}

export interface ScanSubmissionResult {
  id: string;
  ownership_scope_id: string;
  status: string;
  original_filename: string;
  content_type: string;
  file_size_bytes: number;
  image_path: string;
  thumbnail_path?: string | null;
  submitted_at: string;
}

export interface ScanErrorDetail {
  code?: string;
  message?: string;
  [key: string]: unknown;
}

export interface ScanEvent {
  event_type: string;
  scan_id: string;
  step: string;
  progress_pct: number;
  data?: Record<string, unknown> | null;
  error?: ScanErrorDetail | null;
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
  is_new_merchant?: boolean;
  is_unknown_merchant?: boolean;
  discrepancy?: number;
  line_items?: ReadonlyArray<{
    name: string;
    qty?: number | null;
    unit_price?: number | null;
    total_price: number;
  }>;
  [key: string]: unknown;
}

interface ScanState {
  phase: ScanPhase;
  scanId: string | null;
  selectedAsset: ReceiptScanAsset | null;
  submission: ScanSubmissionResult | null;
  progressPct: number;
  currentStep: string;
  events: readonly ScanEvent[];
  result: ScanResultData | null;
  errorCode: string | null;
  errorMessage: string | null;
  connectionStatus: ScanConnectionStatus;
  reconnectAttempt: number;
  connectionMessage: string | null;
}

interface ScanActions {
  startUpload: (asset: ReceiptScanAsset) => void;
  uploadComplete: (submission: ScanSubmissionResult) => void;
  failScan: (code: string, message: string) => void;
  receiveEvent: (event: ScanEvent) => void;
  setConnectionStatus: (
    status: ScanConnectionStatus,
    options?: { attempt?: number; message?: string | null },
  ) => void;
  reset: () => void;
}

type ScanStore = ScanState & ScanActions;

const INITIAL_STATE: ScanState = {
  phase: "idle",
  scanId: null,
  selectedAsset: null,
  submission: null,
  progressPct: 0,
  currentStep: "",
  events: [],
  result: null,
  errorCode: null,
  errorMessage: null,
  connectionStatus: "idle",
  reconnectAttempt: 0,
  connectionMessage: null,
};

const STEP_TO_PHASE: Record<string, ScanPhase> = {
  acquire: "submitted",
  load_image: "processing",
  stage1: "extracting",
  extract: "extracting",
  stage2: "categorizing",
  categorize: "categorizing",
  math_gate: "verified",
  persist: "verified",
  done: "complete",
};

export const TERMINAL_SCAN_EVENTS = new Set(["scan_complete", "scan_failed"]);

export const useScanStore = create<ScanStore>()((set) => ({
  ...INITIAL_STATE,

  startUpload: (asset) =>
    set({
      ...INITIAL_STATE,
      phase: "uploading",
      selectedAsset: asset,
    }),

  uploadComplete: (submission) =>
    set({
      phase: "submitted",
      scanId: submission.id,
      submission,
      progressPct: 0,
      currentStep: "submitted",
      connectionStatus: "connecting",
      reconnectAttempt: 0,
      connectionMessage: "Connecting to scan progress",
      errorCode: null,
      errorMessage: null,
    }),

  failScan: (code, message) =>
    set({
      phase: "failed",
      errorCode: code,
      errorMessage: message,
      connectionStatus: "closed",
      connectionMessage: null,
    }),

  receiveEvent: (event) =>
    set((state) => {
      if (event.event_type === "heartbeat") return state;

      const phase = STEP_TO_PHASE[event.step] ?? state.phase;
      const next: Partial<ScanState> = {
        phase,
        progressPct: event.progress_pct,
        currentStep: event.step,
        events: [...state.events, event],
      };

      if (event.event_type === "scan_complete") {
        next.phase = "complete";
        next.result = parseScanResult(event.data);
        next.connectionStatus = "closed";
        next.connectionMessage = null;
      }

      if (event.event_type === "scan_failed" || event.event_type === "error") {
        next.phase = "failed";
        next.errorCode = normalizeErrorCode(event.error?.code ?? "unknown_error");
        next.errorMessage =
          event.error?.message ?? "An unexpected scan error occurred";
        next.connectionStatus = "closed";
        next.connectionMessage = null;
      }

      return next;
    }),

  setConnectionStatus: (status, options) =>
    set({
      connectionStatus: status,
      reconnectAttempt: options?.attempt ?? 0,
      connectionMessage: options?.message ?? null,
    }),

  reset: () => set(INITIAL_STATE),
}));

function parseScanResult(data: Record<string, unknown> | null | undefined): ScanResultData {
  const d: Record<string, unknown> = data ?? {};
  return {
    status: typeof d.status === "string" ? d.status : "completed",
    merchant_name: typeof d.merchant_name === "string" ? d.merchant_name : undefined,
    transaction_date: typeof d.transaction_date === "string" ? d.transaction_date : undefined,
    currency_code: typeof d.currency_code === "string" ? d.currency_code : undefined,
    total_amount: typeof d.total_amount === "number" ? d.total_amount : undefined,
    discount_amount: typeof d.discount_amount === "number" ? d.discount_amount : undefined,
    gross_total_amount: typeof d.gross_total_amount === "number" ? d.gross_total_amount : undefined,
    reconstructed_total: typeof d.reconstructed_total === "number" ? d.reconstructed_total : undefined,
    reconciliation_severity: typeof d.reconciliation_severity === "string" ? d.reconciliation_severity : undefined,
    confidence_score: typeof d.confidence_score === "number" ? d.confidence_score : undefined,
    is_new_merchant: typeof d.is_new_merchant === "boolean" ? d.is_new_merchant : undefined,
    is_unknown_merchant: typeof d.is_unknown_merchant === "boolean" ? d.is_unknown_merchant : undefined,
    discrepancy: typeof d.discrepancy === "number" ? d.discrepancy : undefined,
    line_items: Array.isArray(d.line_items) ? d.line_items : undefined,
  };
}

function normalizeErrorCode(code: string): string {
  return code.toLowerCase();
}
