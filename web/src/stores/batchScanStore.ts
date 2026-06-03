import { create } from "zustand";

/**
 * Batch scan state. The single-scan `useScanStore` holds exactly one active scan;
 * a batch tracks N independent scans, each progressing through the async pipeline
 * on its own. The backend auto-persists every scan into a transaction, so the
 * "review" stage here is *post-persist*: a summary of what was saved / flagged /
 * failed, with per-item edit (via the created transaction) and discard.
 *
 * Progress is poll-based (`GET /scans/{id}` → status + transaction_id), so items
 * carry status + ids, not the rich extraction result — the View link opens the
 * created transaction for full detail.
 */

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
  fileName: string;
  previewUrl: string | null;
  scanId: string | null;
  transactionId: string | null;
  status: BatchItemStatus;
  progressPct: number;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface BatchItemSeed {
  localId: string;
  fileName: string;
  previewUrl: string | null;
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

/** A batch is "review" once every item has reached a terminal status. */
export function derivePhase(items: readonly BatchScanItem[]): BatchPhase {
  if (items.length === 0) return "idle";
  return items.every((item) => isTerminalStatus(item.status))
    ? "review"
    : "processing";
}

function seedToItem(seed: BatchItemSeed): BatchScanItem {
  return {
    localId: seed.localId,
    fileName: seed.fileName,
    previewUrl: seed.previewUrl,
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
