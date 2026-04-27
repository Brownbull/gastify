/**
 * Story 16-4: Shared Scan Workflow Types
 *
 * Cross-feature type definitions used by scan, batch-review, transaction-editor,
 * and app-layer code. Extracted from src/types/scanStateMachine.ts.
 *
 * Scan-internal types (actions, computed values, dialog data types) remain in
 * src/features/scan/types/scanStateMachine.ts.
 */

import type { Transaction } from '@/types/transaction';
import type { BatchReceipt, BatchReceiptStatus } from '@/types/batchReceipt';

// Re-export BatchReceipt types for consumers
export type { BatchReceipt, BatchReceiptStatus };

// =============================================================================
// Core State Types
// =============================================================================

/**
 * Scan lifecycle phases.
 *
 * State Flow:
 * IDLE → CAPTURING → SCANNING → REVIEWING → SAVED/CANCELLED
 *        (no credit)  (reserved)  (spent)
 */
export type ScanPhase =
  | 'idle' // No scan in progress - mode selector available
  | 'capturing' // Adding images - no credit spent yet
  | 'scanning' // API call in progress - credit reserved
  | 'reviewing' // Results ready for editing - credit confirmed (spent)
  | 'saving' // Saving to Firestore
  | 'error'; // Error state - credit refunded if was reserved

/**
 * Scan modes available from the mode selector.
 */
export type ScanMode =
  | 'single' // Single receipt scan (1 normal credit)
  | 'batch' // Multiple receipts (1 super credit per image)
  | 'statement'; // Credit card statement (future - placeholder)

/**
 * Dialog types that can be shown during scan flow.
 * Dialogs pause the state machine until resolved.
 */
export type ScanDialogType =
  | 'currency_mismatch' // AI detected different currency than user setting
  | 'total_mismatch' // Calculated total doesn't match receipt total
  | 'quicksave' // High-confidence scan - offer quick save
  | 'scan_complete' // Scan finished - "Save now or Edit?"
  | 'cancel_warning' // User trying to cancel after credit spent
  | 'batch_cancel_warning' // User trying to cancel batch after credits spent
  | 'discard_warning' // User trying to discard unsaved changes
  | 'batch_discard' // User trying to discard batch review results (credit already spent)
  | 'batch_complete'; // Batch save completed - show summary modal with transaction data

/**
 * Dialog type constants for type-safe comparisons.
 */
export const DIALOG_TYPES = {
  CURRENCY_MISMATCH: 'currency_mismatch',
  TOTAL_MISMATCH: 'total_mismatch',
  QUICKSAVE: 'quicksave',
  SCAN_COMPLETE: 'scan_complete',
  CANCEL_WARNING: 'cancel_warning',
  BATCH_CANCEL_WARNING: 'batch_cancel_warning',
  DISCARD_WARNING: 'discard_warning',
  BATCH_DISCARD: 'batch_discard',
  BATCH_COMPLETE: 'batch_complete',
} as const satisfies Record<string, ScanDialogType>;

/**
 * Credit status for the current scan request.
 */
export type CreditStatus =
  | 'none' // No credit interaction yet (IDLE, CAPTURING)
  | 'reserved' // Credit deducted from UI, pending API result (SCANNING)
  | 'confirmed' // Credit permanently spent (REVIEWING, SAVED)
  | 'refunded'; // Credit returned after failure (ERROR)

/**
 * Credit type used for the scan.
 */
export type CreditType = 'normal' | 'super';

// =============================================================================
// State Structure
// =============================================================================

/**
 * Batch processing progress for batch mode scans.
 */
export interface BatchProgress {
  /** Current image being processed (0-indexed) */
  current: number;
  /** Total number of images in batch */
  total: number;
  /** Successfully processed transactions */
  completed: Transaction[];
  /** Indices of failed images with error messages */
  failed: Array<{ index: number; error: string }>;
}

/**
 * Dialog state when a dialog is active.
 */
export interface DialogState<T = unknown> {
  /** Type of dialog currently shown */
  type: ScanDialogType;
  /** Data needed to render the dialog */
  data: T;
}

/**
 * Data payload for batch_complete dialog.
 */
export interface BatchCompleteDialogData {
  /** Successfully saved transactions */
  transactions: Transaction[];
  /** Number of super credits used */
  creditsUsed: number;
}

/**
 * Complete scan state machine state.
 *
 * This single object replaces 31 state variables from App.tsx.
 */
export interface ScanState {
  // === Core State ===
  phase: ScanPhase;
  mode: ScanMode;

  // === Request Identity ===
  requestId: string | null;
  userId: string | null;
  startedAt: number | null;

  // === Image Data ===
  images: string[];

  // === Results ===
  results: Transaction[];
  activeResultIndex: number;

  // === Credit Tracking ===
  creditStatus: CreditStatus;
  creditType: CreditType | null;
  creditsCount: number;

  // === Dialog State ===
  activeDialog: DialogState | null;

  // === Error State ===
  error: string | null;

  // === Batch Mode ===
  batchProgress: BatchProgress | null;
  batchReceipts: BatchReceipt[] | null;
  batchEditingIndex: number | null;

  // === Pre-scan Options ===
  storeType: string | null;
  currency: string | null;
}

// =============================================================================
// Persistence Types
// =============================================================================

/**
 * Serializable version of ScanState for localStorage persistence.
 */
export interface PersistedScanState {
  state: ScanState;
  version: number;
  persistedAt: number;
}

/**
 * Current persistence schema version.
 */
export const SCAN_STATE_VERSION = 1;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a unique request ID.
 */
export function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
