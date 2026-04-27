/**
 * Story 9.10: Persistent Scan State Management
 *
 * Types for managing scan state that persists across navigation.
 * This ensures users don't lose scanned receipts when navigating away.
 *
 * Story 14d.4e: PendingScan interface is DEPRECATED.
 * Use ScanState from types/scanStateMachine.ts instead.
 * The old PendingScan was replaced by the ScanContext state machine.
 */

import type { Transaction } from './transaction';

/**
 * Status of a pending scan session.
 * @deprecated Story 14d.4e: Use ScanPhase from types/scanStateMachine.ts instead.
 * Status mapping:
 * - 'images_added' → 'capturing'
 * - 'analyzing' → 'scanning'
 * - 'analyzed' → 'reviewing'
 * - 'error' → 'error'
 */
export type PendingScanStatus = 'images_added' | 'analyzing' | 'analyzed' | 'error';

/**
 * Represents an in-progress receipt scan that persists across view navigation.
 * The scan is only cleared when the user explicitly saves or cancels the transaction.
 *
 * @deprecated Story 14d.4e: Use ScanState from types/scanStateMachine.ts instead.
 * This interface is kept for backwards compatibility with pendingScanStorage.ts migration code.
 */
export interface PendingScan {
  /** Unique identifier for this scan session */
  sessionId: string;

  /** Raw scan images (base64 data URLs) */
  images: string[];

  /** Analyzed transaction data (null until AI processing completes) */
  analyzedTransaction: Transaction | null;

  /** Timestamp when scan session was initiated */
  createdAt: Date;

  /** Current status of the scan */
  status: PendingScanStatus;

  /** Error message if status is 'error' */
  error?: string;
}

/**
 * User's scan credit balance.
 * Two tiers of credits:
 * - Normal credits: Standard scan credits
 * - Super credits: Premium/tier-two credits (displayed differently)
 */
export interface UserCredits {
  /** Remaining normal credits available for scanning */
  remaining: number;

  /** Total normal credits used */
  used: number;

  /** Remaining super credits (tier 2) available */
  superRemaining: number;

  /** Total super credits used */
  superUsed: number;
}

/**
 * Default credit allocation for new users.
 * - 1200 normal credits (temporary: set to 1200 for initial user setup)
 * - 100 super credits
 */
export const DEFAULT_CREDITS: UserCredits = {
  remaining: 1200,
  used: 0,
  superRemaining: 100,
  superUsed: 0,
};

/**
 * Generate a unique session ID for a new scan.
 */
export function generateScanSessionId(): string {
  return `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new empty PendingScan with generated session ID.
 * @deprecated Story 14d.4e: Use ScanContext from contexts/ScanContext.tsx instead.
 * The startScanContext action replaces this function.
 */
export function createPendingScan(): PendingScan {
  return {
    sessionId: generateScanSessionId(),
    images: [],
    analyzedTransaction: null,
    createdAt: new Date(),
    status: 'images_added',
  };
}

// =============================================================================
// Story 14.24: Active Transaction State Management
// =============================================================================

/**
 * Active transaction state machine states.
 * These represent the lifecycle of a single transaction being edited.
 *
 * State transitions:
 * - idle → draft (user makes changes without image)
 * - idle → image_pending (user selects image)
 * - image_pending → scanning (user initiates scan)
 * - scanning → scan_complete (scan succeeds)
 * - scanning → scan_error (scan fails)
 * - scan_error → scanning (user retries)
 * - scan_complete → editing (user edits after scan)
 * - draft | image_pending | scan_complete | scan_error → editing (any edit action)
 * - editing → idle (user saves or discards)
 */
export type ActiveTransactionState =
  | 'idle'           // No active transaction
  | 'draft'          // User made changes (no scan yet)
  | 'image_pending'  // Image loaded but not scanned
  | 'scanning'       // Scan in progress (credit reserved, not charged)
  | 'scan_complete'  // Scan successful (credit charged)
  | 'scan_error'     // Scan failed (credit NOT charged)
  | 'editing';       // User is editing (new or existing transaction)

/**
 * Source of the active transaction.
 * - 'new': Fresh transaction (from scan or manual entry)
 * - 'existing': Editing an existing saved transaction
 */
export type ActiveTransactionSource = 'new' | 'existing';

/**
 * Active transaction data structure.
 * Consolidates all state related to the transaction currently being edited.
 *
 * Story 14.24: This replaces the scattered state in App.tsx:
 * - pendingScan
 * - currentTransaction
 * - scanButtonState
 * - scanImages
 * - scanError
 * - isAnalyzing
 * - transactionEditorMode
 */
export interface ActiveTransaction {
  // Core state
  /** Current state in the state machine */
  state: ActiveTransactionState;

  // Transaction data
  /** The transaction being edited (null when idle) */
  transaction: Transaction | null;
  /** Original transaction data (for existing transactions - used for dirty checking) */
  originalTransaction: Transaction | null;

  // Source tracking
  /** Whether this is a new or existing transaction */
  source: ActiveTransactionSource;
  /** ID of existing transaction (if source is 'existing') */
  existingId?: string;

  // Scan state
  /** Pending image(s) for scanning (base64 data URLs) */
  pendingImages: string[];
  /** Thumbnail URL after successful scan */
  thumbnailUrl?: string;
  /** Full image URLs after successful scan */
  imageUrls?: string[];
  /** Error message if scan failed */
  scanError: string | null;

  // Credit tracking
  /** True while scanning (credit reserved but not confirmed) */
  creditReserved: boolean;
  /** True after successful scan (credit permanently deducted) */
  creditCharged: boolean;

  // Dirty tracking
  /** True if user has modified anything from original state */
  hasChanges: boolean;

  // Metadata
  /** Unique session ID for this active transaction */
  sessionId: string;
  /** Timestamp when this session started */
  createdAt: Date;
}

/**
 * Create a new idle ActiveTransaction state.
 */
export function createIdleActiveTransaction(): ActiveTransaction {
  return {
    state: 'idle',
    transaction: null,
    originalTransaction: null,
    source: 'new',
    pendingImages: [],
    scanError: null,
    creditReserved: false,
    creditCharged: false,
    hasChanges: false,
    sessionId: generateScanSessionId(),
    createdAt: new Date(),
  };
}

/**
 * Create a new ActiveTransaction for a fresh transaction (scan or manual entry).
 * @param initialTransaction - Optional initial transaction data
 */
export function createNewActiveTransaction(initialTransaction?: Transaction): ActiveTransaction {
  return {
    state: 'draft',
    transaction: initialTransaction || null,
    originalTransaction: null,
    source: 'new',
    pendingImages: [],
    scanError: null,
    creditReserved: false,
    creditCharged: false,
    hasChanges: false,
    sessionId: generateScanSessionId(),
    createdAt: new Date(),
  };
}

/**
 * Create a new ActiveTransaction for editing an existing transaction.
 * @param transaction - The existing transaction to edit
 */
export function createEditingActiveTransaction(transaction: Transaction): ActiveTransaction {
  return {
    state: 'editing',
    transaction: { ...transaction },
    originalTransaction: { ...transaction },
    source: 'existing',
    existingId: transaction.id,
    pendingImages: [],
    thumbnailUrl: transaction.thumbnailUrl,
    imageUrls: transaction.imageUrls,
    scanError: null,
    creditReserved: false,
    creditCharged: false,
    hasChanges: false,
    sessionId: generateScanSessionId(),
    createdAt: new Date(),
  };
}

/**
 * Check if an ActiveTransaction has meaningful content that should be preserved.
 * Used to determine if we should warn about discarding.
 */
export function hasActiveTransactionContent(active: ActiveTransaction): boolean {
  if (active.state === 'idle') return false;

  // Has pending images
  if (active.pendingImages.length > 0) return true;

  // Has transaction data with content
  if (active.transaction) {
    const t = active.transaction;
    if (t.merchant || t.alias || t.total > 0 || t.items.length > 0) return true;
  }

  // Has charged credit (most important - don't waste)
  if (active.creditCharged) return true;

  // Has uncommitted changes
  if (active.hasChanges) return true;

  return false;
}

/**
 * Result of canStartEditing check.
 */
export interface CanStartEditingResult {
  /** Whether editing can start immediately */
  allowed: boolean;
  /** If not allowed, the conflicting active transaction */
  conflict?: ActiveTransaction;
  /** Reason for conflict (for dialog messaging) */
  conflictReason?: 'has_unsaved_changes' | 'scan_in_progress' | 'credit_used';
}
