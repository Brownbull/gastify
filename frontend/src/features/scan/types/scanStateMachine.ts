/**
 * Story 16-4: Scan-Internal State Machine Types
 *
 * Types used only within the scan feature: actions, computed values, dialog data
 * types, and helper functions. Cross-feature types live in
 * src/shared/types/scanWorkflow.ts.
 */

import type { Transaction } from '@/types/transaction';
import { hasItemWithPrice } from '@/utils/transactionValidation';
import type {
  ScanMode,
  ScanDialogType,
  CreditType,
  DialogState,
  ScanState,
  BatchReceipt,
  BatchCompleteDialogData,
} from '@shared/types/scanWorkflow';

// Re-export shared types for backward compat — canonical source is @shared/types/scanWorkflow
export type {
  ScanPhase,
  ScanMode,
  ScanDialogType,
  CreditType,
  CreditStatus,
  ScanState,
  BatchProgress,
  DialogState,
  BatchCompleteDialogData,
  BatchReceipt,
  BatchReceiptStatus,
  PersistedScanState,
} from '@shared/types/scanWorkflow';

export {
  DIALOG_TYPES,
  SCAN_STATE_VERSION,
  generateRequestId,
} from '@shared/types/scanWorkflow';

// =============================================================================
// Dialog Data Types (scan-internal)
// =============================================================================

/**
 * Data payload for currency_mismatch dialog.
 */
export interface CurrencyMismatchDialogData {
  detectedCurrency: string;
  pendingTransaction: Transaction;
  hasDiscrepancy?: boolean;
}

/**
 * Data payload for total_mismatch dialog.
 */
export interface TotalMismatchDialogData {
  validationResult: {
    isValid: boolean;
    extractedTotal: number;
    itemsSum: number;
    discrepancy: number;
    discrepancyPercent: number;
    suggestedTotal: number | null;
    errorType: 'none' | 'missing_digit' | 'extra_digit' | 'unknown';
  };
  pendingTransaction: Transaction;
  parsedItems?: Transaction['items'];
}

/**
 * Data payload for quicksave dialog.
 */
export interface QuickSaveDialogData {
  transaction: Transaction;
  confidence: number;
}

/**
 * Data payload for scan_complete dialog.
 */
export interface ScanCompleteDialogData {
  transaction: Transaction;
  skipComplete?: boolean;
}

/**
 * Data payload for cancel_warning dialog.
 */
export interface CancelWarningDialogData {
  creditType: CreditType;
  creditsSpent: number;
}

/**
 * Union type for all dialog data payloads.
 */
export type DialogDataPayload =
  | { type: 'currency_mismatch'; data: CurrencyMismatchDialogData }
  | { type: 'total_mismatch'; data: TotalMismatchDialogData }
  | { type: 'quicksave'; data: QuickSaveDialogData }
  | { type: 'scan_complete'; data: ScanCompleteDialogData }
  | { type: 'cancel_warning'; data: CancelWarningDialogData }
  | { type: 'batch_cancel_warning'; data: CancelWarningDialogData }
  | { type: 'discard_warning'; data: null }
  | { type: 'batch_discard'; data: null }
  | { type: 'batch_complete'; data: BatchCompleteDialogData };

// =============================================================================
// Action Types (scan-internal)
// =============================================================================

/**
 * All actions that can be dispatched to the scan state machine.
 */
export type ScanAction =
  // === Start Actions ===
  | { type: 'START_SINGLE'; payload: { userId: string } }
  | { type: 'START_BATCH'; payload: { userId: string } }
  | { type: 'START_STATEMENT'; payload: { userId: string } }

  // === Image Actions ===
  | { type: 'ADD_IMAGE'; payload: { image: string } }
  | { type: 'REMOVE_IMAGE'; payload: { index: number } }
  | { type: 'SET_IMAGES'; payload: { images: string[] } }

  // === Pre-scan Options ===
  | { type: 'SET_STORE_TYPE'; payload: { storeType: string } }
  | { type: 'SET_CURRENCY'; payload: { currency: string } }

  // === Process Actions ===
  | { type: 'PROCESS_START'; payload: { creditType: CreditType; creditsCount: number } }
  | { type: 'PROCESS_SUCCESS'; payload: { results: Transaction[] } }
  | { type: 'PROCESS_ERROR'; payload: { error: string } }

  // === Dialog Actions ===
  | { type: 'SHOW_DIALOG'; payload: DialogState }
  | { type: 'RESOLVE_DIALOG'; payload: { type: ScanDialogType; result: unknown } }
  | { type: 'DISMISS_DIALOG' }

  // === Result Actions ===
  | { type: 'UPDATE_RESULT'; payload: { index: number; updates: Partial<Transaction> } }
  | { type: 'SET_ACTIVE_RESULT'; payload: { index: number } }

  // === Save Actions ===
  | { type: 'SAVE_START' }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_ERROR'; payload: { error: string } }

  // === Batch Actions ===
  | { type: 'BATCH_ITEM_START'; payload: { index: number } }
  | { type: 'BATCH_ITEM_SUCCESS'; payload: { index: number; result: Transaction } }
  | { type: 'BATCH_ITEM_ERROR'; payload: { index: number; error: string } }
  | { type: 'BATCH_COMPLETE'; payload?: { batchReceipts: BatchReceipt[] } }

  // === Batch Receipt Actions ===
  | { type: 'SET_BATCH_RECEIPTS'; payload: { receipts: BatchReceipt[] } }
  | { type: 'UPDATE_BATCH_RECEIPT'; payload: { id: string; updates: Partial<BatchReceipt> } }
  | { type: 'DISCARD_BATCH_RECEIPT'; payload: { id: string } }
  | { type: 'CLEAR_BATCH_RECEIPTS' }

  // === Batch Editing Actions ===
  | { type: 'SET_BATCH_EDITING_INDEX'; payload: { index: number | null } }

  // === Control Actions ===
  | { type: 'CANCEL' }
  | { type: 'RESET' }

  // === Recovery Actions ===
  | { type: 'RESTORE_STATE'; payload: { state: Partial<ScanState> } }
  | { type: 'REFUND_CREDIT' };

// =============================================================================
// Computed Values Interface (scan-internal)
// =============================================================================

/**
 * Computed values derived from state.
 */
export interface ScanComputedValues {
  hasActiveRequest: boolean;
  isProcessing: boolean;
  isIdle: boolean;
  hasError: boolean;
  hasDialog: boolean;
  isBlocking: boolean;
  creditSpent: boolean;
  canNavigateFreely: boolean;
  canSave: boolean;
  currentView: ScanCurrentView;
  imageCount: number;
  resultCount: number;
}

/**
 * Possible view states derived from scan state.
 */
export type ScanCurrentView =
  | 'none'
  | 'single-capture'
  | 'batch-capture'
  | 'statement-capture'
  | 'processing'
  | 'single-review'
  | 'batch-review'
  | 'error';

/**
 * Return type of useScanStateMachine hook.
 */
export interface UseScanStateMachineReturn extends ScanComputedValues {
  state: ScanState;
  dispatch: React.Dispatch<ScanAction>;
}

// =============================================================================
// Helper Functions (scan-internal)
// =============================================================================

/**
 * Check if a transaction result is valid for saving.
 */
export function canSaveTransaction(transaction: Transaction | null): boolean {
  if (!transaction) return false;
  if (!hasItemWithPrice(transaction.items)) return false;
  if (transaction.total <= 0) return false;
  return true;
}

/**
 * Get credit type for a scan mode.
 */
export function getCreditTypeForMode(mode: ScanMode): CreditType {
  switch (mode) {
    case 'single':
      return 'normal';
    case 'batch':
    case 'statement':
      return 'super';
  }
}
