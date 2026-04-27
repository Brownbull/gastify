/**
 * Type definitions for useBatchReviewHandlers hook.
 *
 * Story TD-16-3: Extracted from useBatchReviewHandlers.ts to reduce file size.
 * These types define the props interface and return type for the batch review
 * handlers hook, plus supporting interfaces for batch processing.
 */

import type { User } from 'firebase/auth';
import type { Services } from '@/contexts/AuthContext';
import type { Transaction } from '@/types/transaction';
import type { BatchReceipt } from '@/types/batchReceipt';
import type { View } from '@app/types';
import type { CategoryMapping } from '@/types/categoryMapping';
import type { UserCredits } from '@/types/scan';
import type { ScanDialogType, BatchCompleteDialogData } from '@shared/types/scanWorkflow';
import type { ScanState } from '@shared/types/scanWorkflow';
import type { ReceiptType } from '@/services/gemini';
import type { ProcessingResult } from '@features/batch-review/services/batchProcessingService';
import type {
  CategoryMappingResult,
  MerchantMatchResult,
  BatchProcessingController,
  CreditCheckResult,
} from '../handlers/types';
import type { FindItemNameMatchFn } from '@/features/categories';
import type { BatchProcessingCallbacks } from './useBatchProcessing';

// Story TD-16-3: Re-export from canonical source to avoid duplicate interface
export type { BatchProcessingCallbacks } from './useBatchProcessing';

/**
 * Extended batch processing controller.
 * Story 14e-29b: Includes startProcessing method for handleProcessingStart.
 */
export interface ExtendedBatchProcessingController {
  /** Reset the batch processing state */
  reset: () => void;
  /** Start batch processing with callbacks */
  startProcessing: (
    images: string[],
    currency: string,
    receiptType?: ReceiptType,
    callbacks?: BatchProcessingCallbacks
  ) => Promise<ProcessingResult[]>;
}

// =============================================================================
// Shared Types (TD-16-6: DRY — re-export from canonical source)
// =============================================================================

/** Re-export CreditCheckResult from creditService (single source of truth) */
export type { CreditCheckResult } from '../handlers/types';

// =============================================================================
// Props Interface (AC2)
// =============================================================================

/**
 * Props for the useBatchReviewHandlers hook.
 * Contains external dependencies needed by handlers.
 */
export interface BatchReviewHandlersProps {
  /** Current authenticated user */
  user: User | null;
  /** Firebase services (Auth, Firestore, appId) */
  services: Services | null;

  // Store state accessed via props (from App.tsx or parent)
  /** Current scan state containing batch receipts and editing index */
  scanState: ScanState;

  // Setters from parent (until fully migrated to stores)
  /** Function to update the batch editing index in scan context */
  setBatchEditingIndexContext: (index: number | null) => void;
  /** Function to set the current transaction for editing */
  setCurrentTransaction: (tx: Transaction | null) => void;
  /** Function to set the transaction editor mode */
  setTransactionEditorMode: (mode: 'new' | 'existing') => void;
  /** Function to navigate to a specific view */
  navigateToView: (view: View) => void;
  /** Function to set the current view */
  setView: (view: View) => void;
  // Story 14e-34a: setBatchImages removed - now uses useScanStore.setImages directly
  /** Batch processing controller with reset capability */
  batchProcessing: BatchProcessingController;
  /** Function to reset the scan context to idle state */
  resetScanContext: () => void;
  /** Function to show a scan dialog */
  showScanDialog: (type: ScanDialogType, data: object | BatchCompleteDialogData) => void;
  /** Function to dismiss the current scan dialog */
  dismissScanDialog: () => void;

  // Mapping functions (from App.tsx mapping hooks)
  /** Category mappings from user's learned preferences */
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

  // Credit check functions (optional - only needed for handleCreditCheckComplete)
  /** Current user credit balance */
  userCredits: UserCredits;
  /** Function to check if user has sufficient credits (optional - for batch preview credit check) */
  checkCreditSufficiency?: (
    userCredits: {
      remaining: number;
      used: number;
      superRemaining: number;
      superUsed: number;
    },
    requiredCredits: number,
    isSuper: boolean
  ) => CreditCheckResult;
  /** Function to store the credit check result for dialog display (optional) */
  setCreditCheckResult?: (result: CreditCheckResult | null) => void;
  /** Function to show/hide the credit warning dialog (optional) */
  setShowCreditWarning?: (show: boolean) => void;

  // ==========================================================================
  // Story 14e-29b: Processing handler dependencies
  // ==========================================================================

  /** Function to show/hide the batch preview modal */
  setShowBatchPreview: (show: boolean) => void;
  /** Function to trigger the credit check flow via CreditFeature */
  setShouldTriggerCreditCheck: (trigger: boolean) => void;
  // Story 14e-34a: batchImages removed - now uses useScanStore.images directly
  /** Currency for scan processing */
  scanCurrency: string;
  /** Store type for scan processing ('auto' or specific type) */
  scanStoreType: string;
  /** Extended batch processing controller with startProcessing */
  batchProcessingExtended: ExtendedBatchProcessingController;
  /** Function to set images in scan context (for single mode switch) */
  setScanImages: (images: string[]) => void;

  // ==========================================================================
  // Story 14e-33: Trust prompt clearing (optional)
  // ==========================================================================
  /** Function to clear trust prompt state when navigating away from batch review */
  clearTrustPrompt?: () => void;
}

// =============================================================================
// Return Type Interface (AC2)
// =============================================================================

/** Merchant match confidence threshold for applying learned mappings */
export const MERCHANT_CONFIDENCE_THRESHOLD = 0.7;

/**
 * Return type for the useBatchReviewHandlers hook.
 * Contains all handlers needed for batch review operations.
 */
export interface BatchReviewHandlers {
  // ==========================================================================
  // Navigation handlers (from navigation.ts)
  // ==========================================================================
  /** Navigate to previous receipt in batch */
  handlePrevious: () => void;
  /** Navigate to next receipt in batch */
  handleNext: () => void;

  // ==========================================================================
  // Edit handler (from editReceipt.ts)
  // ==========================================================================
  /** Edit a specific receipt during batch review */
  handleEditReceipt: (receipt: BatchReceipt, index: number) => void;

  // ==========================================================================
  // Save handlers (from save.ts)
  // ==========================================================================
  /** Save a single transaction during batch review */
  handleSaveTransaction: (transaction: Transaction) => Promise<string>;
  /** Handle completion of batch save */
  handleSaveComplete: (savedTransactions: Transaction[]) => void;

  // ==========================================================================
  // Discard handlers (from discard.ts)
  // ==========================================================================
  /** Handle back navigation from batch review */
  handleBack: () => void;
  /** Confirm discarding batch results */
  handleDiscardConfirm: () => void;
  /** Cancel the discard operation */
  handleDiscardCancel: () => void;

  // ==========================================================================
  // Credit check handler (from creditCheck.ts)
  // ==========================================================================
  /** Check credit sufficiency before batch processing */
  handleCreditCheckComplete: () => void;

  // ==========================================================================
  // Story 14e-29b: Processing & Navigation handlers
  // ==========================================================================
  /** Cancel batch preview and clear images */
  handleCancelPreview: () => void;
  /** Trigger credit check flow via CreditFeature */
  handleConfirmWithCreditCheck: () => void;
  /** Start batch processing after credit confirmation */
  handleProcessingStart: () => Promise<void>;
  /** Remove image from batch (switches to single mode if 1 left) */
  handleRemoveImage: (index: number) => void;

  // ==========================================================================
  // Reduce batch handler (placeholder)
  // ==========================================================================
  /** Reduce batch size when insufficient credits (placeholder - not implemented) */
  handleReduceBatch: (maxProcessable: number) => void;
}
