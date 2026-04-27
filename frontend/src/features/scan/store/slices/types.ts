/**
 * Story 16-1: Shared types for scan store slices
 *
 * Defines all slice interfaces and the combined ScanFullStore type.
 * Each slice creator imports from here to avoid circular dependencies.
 */

import type {
  ScanState,
  ScanPhase,
  CreditType,
  DialogState,
  ScanDialogType,
} from '../../types/scanStateMachine';
import type { Transaction } from '@/types/transaction';
import type { BatchReceipt } from '@/types/batchReceipt';
import type { FirestoreScanStatus } from '@/types/pendingScan';

// =============================================================================
// Core Slice
// =============================================================================

export interface ScanCoreSlice {
  // State (images moved to useScanWorkflowStore — Story 16-6)
  phase: ScanState['phase'];
  mode: ScanState['mode'];
  requestId: ScanState['requestId'];
  userId: ScanState['userId'];
  startedAt: ScanState['startedAt'];
  results: ScanState['results'];
  activeResultIndex: ScanState['activeResultIndex'];
  error: ScanState['error'];
  storeType: ScanState['storeType'];
  currency: ScanState['currency'];

  // Actions
  startSingle: (userId: string) => void;
  startBatch: (userId: string) => void;
  startStatement: (userId: string) => void;
  addImage: (image: string) => void;
  removeImage: (index: number) => void;
  setImages: (images: string[]) => void;
  processStart: (creditType: CreditType, creditsCount: number) => void;
  processSuccess: (results: Transaction[]) => void;
  processError: (error: string) => void;
  updateResult: (index: number, updates: Partial<Transaction>) => void;
  setActiveResult: (index: number) => void;
  saveStart: () => void;
  saveSuccess: () => void;
  saveError: (error: string) => void;
  cancel: () => void;
  reset: () => void;
  restoreState: (state: Partial<ScanState>) => void;
}

// Internal-only type — not exported to consumers
export interface ScanCoreSliceInternal extends ScanCoreSlice {
  _guardPhase: (expected: ScanPhase | ScanPhase[], actionName: string) => boolean;
}

// =============================================================================
// Batch Slice
// =============================================================================

export interface ScanBatchSlice {
  // State moved to useScanWorkflowStore (Story 16-6):
  // - batchProgress, batchReceipts, batchEditingIndex
  // Actions remain here with phase guards, write to shared workflow store
  batchItemStart: (index: number) => void;
  batchItemSuccess: (index: number, result: Transaction) => void;
  batchItemError: (index: number, error: string) => void;
  batchComplete: (batchReceipts?: BatchReceipt[]) => void;
  setBatchReceipts: (receipts: BatchReceipt[]) => void;
  updateBatchReceipt: (id: string, updates: Partial<BatchReceipt>) => void;
  discardBatchReceipt: (id: string) => void;
  clearBatchReceipts: () => void;
  setBatchEditingIndex: (index: number | null) => void;
}

// =============================================================================
// Credit Slice
// =============================================================================

export interface ScanCreditSlice {
  // State
  creditStatus: ScanState['creditStatus'];
  creditType: ScanState['creditType'];
  creditsCount: ScanState['creditsCount'];

  // Actions
  refundCredit: () => void;
}

// =============================================================================
// Dialog Slice
// =============================================================================

// =============================================================================
// Dialog Result Types (discriminated by ScanDialogType)
// =============================================================================

export interface CurrencyMismatchResult { choice: 'detected' | 'default' }
export interface TotalMismatchResult { choice: 'items_sum' | 'original' }
export interface QuickSaveResult { choice: 'edit' | 'save' }
export interface ScanCompleteResult { choice: 'save' | 'edit' }
export interface CancelWarningResult { confirmed: boolean }
export interface BatchCancelWarningResult { confirmed: boolean }
export interface DiscardWarningResult { confirmed: boolean }
export interface BatchDiscardResult { confirmed: boolean }
export interface BatchCompleteResult { acknowledged: boolean }

export type ScanDialogResultMap = {
  currency_mismatch: CurrencyMismatchResult;
  total_mismatch: TotalMismatchResult;
  quicksave: QuickSaveResult;
  scan_complete: ScanCompleteResult;
  cancel_warning: CancelWarningResult;
  batch_cancel_warning: BatchCancelWarningResult;
  discard_warning: DiscardWarningResult;
  batch_discard: BatchDiscardResult;
  batch_complete: BatchCompleteResult;
};

export interface ScanDialogSlice {
  // State
  activeDialog: ScanState['activeDialog'];

  // Actions
  showDialog: (dialog: DialogState) => boolean;
  resolveDialog: <T extends ScanDialogType>(type: T, result: ScanDialogResultMap[T]) => void;
  dismissDialog: () => void;
}

// =============================================================================
// Overlay Types (Story 16-2: migrated from useScanOverlayState/useScanState)
// =============================================================================

export type ScanOverlayState = 'idle' | 'uploading' | 'processing' | 'ready' | 'error';

export type ScanErrorType =
  | 'network'
  | 'timeout'
  | 'api'
  | 'invalid'
  | 'unknown';

// =============================================================================
// UI Slice
// =============================================================================

export interface ScanUISlice {
  // State
  skipScanCompleteModal: boolean;
  isRescanning: boolean;

  // Overlay state (Story 16-2: merged from useScanOverlayState)
  overlayState: ScanOverlayState;
  overlayProgress: number;
  overlayEta: number | null;
  overlayError: { type: ScanErrorType; message: string } | null;
  processingHistory: number[];
  processingStartedAt: number | null;

  // Actions
  setSkipScanCompleteModal: (value: boolean) => void;
  setIsRescanning: (value: boolean) => void;

  // Overlay actions (Story 16-2)
  startOverlayUpload: () => void;
  setOverlayProgress: (pct: number) => void;
  startOverlayProcessing: () => void;
  setOverlayReady: () => void;
  setOverlayError: (type: ScanErrorType, message: string) => void;
  resetOverlay: () => void;
  retryOverlay: () => void;
  pushProcessingTime: (seconds: number) => void;
}

// =============================================================================
// Pending Slice (Story 18-13b)
// =============================================================================

export interface ScanPendingSlice {
  // State
  pendingScanId: string | null;
  pendingScanDeadline: number | null;
  pendingScanStatus: FirestoreScanStatus | null;
  processedScanId: string | null;

  // Actions
  setPendingScan: (scanId: string, deadline: number) => void;
  clearPendingScan: () => void;
  setPendingScanStatus: (status: FirestoreScanStatus) => void;
  setProcessedScanId: (scanId: string) => void;
}

// =============================================================================
// Combined Store Type
// =============================================================================

// Internal store type includes _guardPhase (used by slice creators)
export type ScanFullStoreInternal = ScanCoreSliceInternal &
  ScanBatchSlice &
  ScanCreditSlice &
  ScanDialogSlice &
  ScanUISlice &
  ScanPendingSlice;

// Public store type hides _guardPhase from consumers
export type ScanFullStore = ScanCoreSlice &
  ScanBatchSlice &
  ScanCreditSlice &
  ScanDialogSlice &
  ScanUISlice &
  ScanPendingSlice;
