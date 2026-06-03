import { create } from "zustand";
import type { ReceiptScanAsset } from "./scanStore";

/**
 * Batch scan state for mobile. The single-scan `useScanStore` holds one active
 * scan; a batch tracks N independent scans, each progressing through the async
 * pipeline on its own. The backend auto-persists every scan into a transaction,
 * so the BatchReview screen is *post-persist*: a summary of saved / needs-review
 * / failed receipts, with per-item open (the created transaction), discard, and
 * retry. Progress is poll-based (`GET /scans/{id}`), so items carry status + ids.
 */

/** A queued receipt to scan: a captured asset (camera/library) or a test case. */
export type BatchScanSource =
  | { kind: "asset"; asset: ReceiptScanAsset }
  | { kind: "testCase"; caseId: string };

export interface BatchScanInput {
  localId: string;
  label: string;
  source: BatchScanSource;
}

// Hand-off from BatchCaptureScreen to BatchReviewScreen. BatchReview owns the
// scan orchestration (single poll-loop owner), so the capture screen stages the
// queued inputs here and navigates; the review screen consumes them on mount.
let pendingBatchInputs: readonly BatchScanInput[] = [];

export function stageBatchInputs(inputs: readonly BatchScanInput[]): void {
  pendingBatchInputs = inputs;
}

export function consumeBatchInputs(): readonly BatchScanInput[] {
  const inputs = pendingBatchInputs;
  pendingBatchInputs = [];
  return inputs;
}

export type BatchItemStatus =
  | "uploading"
  | "processing"
  | "completed"
  | "needs_review"
  | "failed"
  | "discarded";

export type BatchPhase = "idle" | "processing" | "review";

export interface BatchScanItem {
  localId: string;
  label: string;
  scanId: string | null;
  transactionId: string | null;
  status: BatchItemStatus;
  progressPct: number;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface BatchItemSeed {
  localId: string;
  label: string;
}

export type BatchItemPatch = Partial<
  Pick<
    BatchScanItem,
    | "scanId"
    | "transactionId"
    | "status"
    | "progressPct"
    | "errorCode"
    | "errorMessage"
  >
>;

interface BatchScanState {
  phase: BatchPhase;
  items: readonly BatchScanItem[];
}

interface BatchScanActions {
  start: (seeds: readonly BatchItemSeed[]) => void;
  patchItem: (localId: string, patch: BatchItemPatch) => void;
  reset: () => void;
}

type BatchScanStore = BatchScanState & BatchScanActions;

const TERMINAL_STATUSES: ReadonlySet<BatchItemStatus> = new Set<BatchItemStatus>(
  ["completed", "needs_review", "failed", "discarded"],
);

const INITIAL_STATE: BatchScanState = {
  phase: "idle",
  items: [],
};

export function isTerminalStatus(status: BatchItemStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function derivePhase(items: readonly BatchScanItem[]): BatchPhase {
  if (items.length === 0) return "idle";
  return items.every((item) => isTerminalStatus(item.status))
    ? "review"
    : "processing";
}

function seedToItem(seed: BatchItemSeed): BatchScanItem {
  return {
    localId: seed.localId,
    label: seed.label,
    scanId: null,
    transactionId: null,
    status: "uploading",
    progressPct: 0,
    errorCode: null,
    errorMessage: null,
  };
}

export const useBatchScanStore = create<BatchScanStore>()((set) => ({
  ...INITIAL_STATE,

  start: (seeds) => {
    const items = seeds.map(seedToItem);
    set({ phase: derivePhase(items), items });
  },

  patchItem: (localId, patch) =>
    set((state) => {
      const items = state.items.map((item) =>
        item.localId === localId ? { ...item, ...patch } : item,
      );
      return { items, phase: derivePhase(items) };
    }),

  reset: () => set({ ...INITIAL_STATE }),
}));
