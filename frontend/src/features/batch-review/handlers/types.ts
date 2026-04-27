/**
 * Story 14e-14a: Batch Review Handler Types
 * Story 14e-14b: Edit and Save Handler Types
 * Story 14e-14c: Discard and Credit Check Handler Types
 *
 * Type definitions for batch review handler dependencies.
 * Part 1 of 4: Handler directory structure, context types, navigation handlers.
 * Part 2 of 4: Edit and save handler types.
 * Part 3 of 4: Discard and credit check handler types.
 *
 * Architecture Reference:
 * - docs/sprint-artifacts/epic14e-feature-architecture/architecture-decision.md
 * - src/features/scan/handlers/processScan/types.ts (pattern reference)
 */

import type { User } from 'firebase/auth';
import type { ScanState, ScanDialogType, BatchCompleteDialogData } from '@shared/types/scanWorkflow';
import type { Transaction } from '@/types/transaction';
import type { StoreCategory } from '../../../../shared/schema/categories';
import type { CategoryMapping } from '@/types/categoryMapping';
import type { View } from '@app/types';
import type { Services } from '@/contexts/AuthContext';
import type { UserCredits } from '@/types/scan';
// Story 14e-42: Import FindItemNameMatchFn for dependency injection
import type { FindItemNameMatchFn } from '@/features/categories';

// =============================================================================
// Navigation Handler Context (AC2)
// =============================================================================

/**
 * Context interface for batch navigation handlers.
 * Contains all dependencies needed for navigating between batch receipts.
 */
export interface BatchNavigationContext {
  /** Current scan state containing batch receipts and editing index */
  scanState: ScanState;

  /** Function to update the batch editing index in scan context */
  setBatchEditingIndexContext: (index: number | null) => void;

  /**
   * Current transaction being edited.
   * Used to determine if transaction update is needed during navigation.
   */
  currentTransaction: Transaction | null;

  /**
   * Function to set the current transaction.
   * Called when navigating to update the editor with the new receipt's transaction.
   */
  setCurrentTransaction: (tx: Transaction | null) => void;
}

// =============================================================================
// Edit Handler Context (Story 14e-14b, AC1)
// =============================================================================

/**
 * Context interface for batch edit handler.
 * Contains all dependencies needed to edit a receipt during batch review.
 *
 * Source: src/App.tsx:1626-1635 (handleBatchEditReceipt)
 */
export interface BatchEditContext {
  /**
   * Function to update the batch editing index in scan context.
   * Index is 0-based internally (UI shows 1-based).
   */
  setBatchEditingIndexContext: (index: number | null) => void;

  /**
   * Function to set the current transaction for editing.
   * Called when entering edit mode with the receipt's transaction.
   */
  setCurrentTransaction: (tx: Transaction | null) => void;

  /**
   * Function to set the transaction editor mode.
   * 'existing' for batch editing, 'new' for new transactions.
   */
  setTransactionEditorMode: (mode: 'new' | 'existing') => void;

  /**
   * Function to navigate to a specific view.
   * Called to navigate to 'transaction-editor' view.
   */
  navigateToView: (view: View) => void;
}

// =============================================================================
// Save Handler Context (Story 14e-14b, AC1)
// =============================================================================

/**
 * Category mapping result from applyCategoryMappings.
 * Reused from processScan types pattern.
 */
export interface CategoryMappingResult {
  /** Transaction with category mappings applied */
  transaction: Transaction;
  /** IDs of mappings that were applied */
  appliedMappingIds: string[];
}

/**
 * Merchant match result from findMerchantMatch.
 * Reused from processScan types pattern.
 */
export interface MerchantMatchResult {
  /** The matched mapping */
  mapping: {
    /** Mapping ID */
    id?: string;
    /** Target/normalized merchant name */
    targetMerchant: string;
    /** Normalized merchant key for lookups */
    normalizedMerchant: string;
    /** Optional store category override */
    storeCategory?: StoreCategory;
  };
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Item name mapping result.
 * Reused from processScan types pattern.
 */
export interface ItemNameMappingResult {
  /** Transaction with item name mappings applied */
  transaction: Transaction;
  /** IDs of item name mappings that were applied */
  appliedIds: string[];
}

/**
 * Context interface for batch save transaction handler.
 * Contains all dependencies needed to save a transaction during batch review.
 *
 * Source: src/App.tsx:1945-2008 (handleBatchSaveTransaction)
 */
export interface SaveContext {
  /** Firebase services (Auth, Firestore, appId) - null if not initialized */
  services: Services | null;

  /** Current authenticated Firebase user - null if not signed in */
  user: User | null;

  /**
   * Category mappings from user's learned preferences.
   */
  mappings: CategoryMapping[];

  /** Apply category mappings to a transaction */
  applyCategoryMappings: (
    transaction: Transaction,
    mappings: CategoryMapping[]
  ) => CategoryMappingResult;

  /** Find a merchant match for the given merchant name */
  findMerchantMatch: (merchant: string) => MerchantMatchResult | null;

  /**
   * Find item name match for a merchant and item (Story 14e-42).
   * Used with applyItemNameMappings utility from @features/categories.
   */
  findItemNameMatch: FindItemNameMatchFn;
}

// =============================================================================
// Save Complete Handler Context (Story 14e-14b, AC1)
// =============================================================================

/**
 * Batch processing controller interface.
 * Provides reset functionality for batch state.
 */
export interface BatchProcessingController {
  /** Reset the batch processing state */
  reset: () => void;
}

/**
 * Context interface for batch save complete handler.
 * Contains all dependencies needed to handle completion of batch save.
 *
 * Source: src/App.tsx:1929-1942 (handleBatchSaveComplete)
 */
export interface SaveCompleteContext {
  /**
   * Function to set/clear batch images.
   * Called with empty array to clear batch images after save.
   */
  setBatchImages: (images: string[]) => void;

  /** Batch processing controller with reset capability */
  batchProcessing: BatchProcessingController;

  /** Function to reset the scan context to idle state */
  resetScanContext: () => void;

  /**
   * Function to show a scan dialog.
   * Used to show BATCH_COMPLETE dialog with summary.
   */
  showScanDialog: (type: ScanDialogType, data: BatchCompleteDialogData) => void;

  /** Function to set the current view */
  setView: (view: View) => void;
}

// =============================================================================
// Discard Handler Context (Story 14e-14c, AC1)
// =============================================================================

/**
 * Context interface for batch discard handlers.
 * Contains all dependencies needed for discarding batch results.
 *
 * Source: src/App.tsx:1904-1926 (handleBatchReviewBack, handleBatchDiscardConfirm, handleBatchDiscardCancel)
 */
export interface DiscardContext {
  /**
   * Whether there are batch receipts to potentially discard.
   * When true, shows confirmation dialog instead of immediately discarding.
   */
  hasBatchReceipts: boolean;

  /**
   * Function to show a scan dialog.
   * Used to show BATCH_DISCARD confirmation dialog.
   */
  showScanDialog: (type: ScanDialogType, data: object) => void;

  /** Function to dismiss the current scan dialog */
  dismissScanDialog: () => void;

  /**
   * Function to set/clear batch images.
   * Called with empty array to clear batch images on discard.
   */
  setBatchImages: (images: string[]) => void;

  /** Batch processing controller with reset capability */
  batchProcessing: BatchProcessingController;

  /** Function to reset the scan context to idle state */
  resetScanContext: () => void;

  /** Function to set the current view */
  setView: (view: View) => void;
}

// =============================================================================
// Credit Check Handler Context (Story 14e-14c, AC1)
// =============================================================================

/**
 * Re-export CreditCheckResult from creditService for handler usage.
 */
export type { CreditCheckResult } from '@/services/creditService';

/**
 * User credits type for credit check operations.
 */
export type { UserCredits } from '@/types/scan';

/**
 * Context interface for batch credit check handler.
 * Contains all dependencies needed for validating credits before batch processing.
 *
 * Source: src/App.tsx:1642-1646 (handleBatchConfirmWithCreditCheck)
 */
export interface CreditCheckContext {
  /**
   * Current user credit balance.
   * Contains both normal and super credit amounts.
   */
  userCredits: UserCredits;

  /**
   * Function to check if user has sufficient credits for an operation.
   * For batch operations, uses super credits with isSuper=true.
   */
  checkCreditSufficiency: (
    userCredits: {
      remaining: number;
      used: number;
      superRemaining: number;
      superUsed: number;
    },
    requiredCredits: number,
    isSuper: boolean
  ) => {
    sufficient: boolean;
    available: number;
    required: number;
    remaining: number;
    shortage: number;
    maxProcessable: number;
    creditType: 'normal' | 'super';
  };

  /**
   * Function to store the credit check result for dialog display.
   */
  setCreditCheckResult: (
    result: {
      sufficient: boolean;
      available: number;
      required: number;
      remaining: number;
      shortage: number;
      maxProcessable: number;
      creditType: 'normal' | 'super';
    } | null
  ) => void;

  /**
   * Function to show/hide the credit warning dialog.
   */
  setShowCreditWarning: (show: boolean) => void;
}
