/**
 * Type definitions for TransactionEditorViewInternal
 *
 * Story 15b-2o: Extracted from TransactionEditorViewInternal.tsx
 * Pure type-only module — no runtime code, no React imports, no hooks.
 */

import type { Transaction } from '@/types/transaction';
import type { StoreCategory, ItemCategory } from '../../../../../shared/schema/categories';
import type { UserCredits } from '@/types/scan';
import type { Language } from '@/utils/translations';
import type { ItemNameMapping } from '@/types/itemNameMapping';
import type { ScanButtonState } from '@/shared/utils/scanHelpers';

export type { ScanButtonState };

/**
 * Props for TransactionEditorView component
 */
export interface TransactionEditorViewProps {
  // Core
  /** Transaction data (null for blank new transaction) */
  transaction: Transaction | null;
  /** Mode: 'new' for new transactions, 'existing' for editing */
  mode: 'new' | 'existing';
  /**
   * Story 14.24: Read-only mode for viewing transactions
   * When true:
   * - All fields are disabled/non-interactive
   * - Re-scan button is hidden
   * - Edit button appears at bottom instead of Save
   * - Clicking Edit triggers onRequestEdit callback with conflict check
   */
  readOnly?: boolean;
  /** Callback when user clicks Edit button in read-only mode */
  onRequestEdit?: () => void;

  /**
   * When true:
   * - Strict read-only mode (no Edit button shown at all)
   * - Owner info displayed in header
   * - Prevents any edit attempts
   */
  isOtherUserTransaction?: boolean;
  /** Owner profile info for display when isOtherUserTransaction is true */
  ownerProfile?: { displayName?: string; photoURL?: string | null } | null;
  /**
   * Owner's user ID for profile color in header ProfileIndicator
   * NOTE: Currently unused - prop is passed but not rendered.
   * "owner's profile icon appears in the top-left" but current implementation
   * shows text "Added by [Name]" instead. Keeping prop for future enhancement.
   */
  ownerId?: string;

  // Scan state
  /** Current state of the scan button */
  scanButtonState: ScanButtonState;
  /** Whether processing/analyzing is in progress */
  isProcessing: boolean;
  /** Estimated time remaining for processing in seconds */
  processingEta?: number | null;
  /** Error message from scan processing */
  scanError?: string | null;
  /** v9.7.0: Skip showing ScanCompleteModal (e.g., when coming from QuickSaveCard edit) */
  skipScanCompleteModal?: boolean;

  // Images
  /** Receipt image thumbnail URL (after successful scan or existing transaction) */
  thumbnailUrl?: string;
  /** Pending image URL (selected but not yet processed) */
  pendingImageUrl?: string;

  // Callbacks
  /** Callback when transaction data changes (parent-managed state) */
  onUpdateTransaction: (transaction: Transaction) => void;
  /** Callback when user saves the transaction */
  onSave: (transaction: Transaction) => Promise<void>;
  /** Callback when user clicks back/cancel */
  onCancel: () => void;
  /** Callback when user selects a photo */
  onPhotoSelect: (file: File) => void;
  /** Callback when user clicks process/scan button */
  onProcessScan: () => void;
  /** Callback to retry after error */
  onRetry: () => void;
  /** Callback for re-scan (existing transactions only) */
  onRescan?: () => Promise<void>;
  /** Whether re-scan is in progress */
  isRescanning?: boolean;
  /** Callback when user deletes transaction (existing only) */
  onDelete?: (id: string) => void;

  // Learning callbacks
  /** Save category mapping function */
  onSaveMapping?: (item: string, category: StoreCategory, source?: 'user' | 'ai') => Promise<string>;
  /** Save merchant mapping function - v9.6.1: Now accepts optional storeCategory */
  onSaveMerchantMapping?: (originalMerchant: string, targetMerchant: string, storeCategory?: StoreCategory) => Promise<string>;
  /** Save subcategory mapping function */
  onSaveSubcategoryMapping?: (item: string, subcategory: string, source?: 'user' | 'ai') => Promise<string>;
  /** v9.7.0: Save item name mapping function (per-store item name learning) */
  onSaveItemNameMapping?: (normalizedMerchant: string, originalItemName: string, targetItemName: string, targetCategory?: ItemCategory) => Promise<string>;
  /**
   * @deprecated Story 14e-25d: View uses showToast() from useToast() directly.
   * This prop is no longer needed.
   */
  onShowToast?: (text: string) => void;

  // UI
  /** Theme for styling */
  theme: 'light' | 'dark';
  /** Translation function */
  t: (key: string) => string;
  /** Currency format function */
  formatCurrency: (amount: number, currency: string) => string;
  /** Default currency code from settings */
  currency: string;
  /** Language for translations */
  lang: Language;
  /** User's credit balance */
  credits: UserCredits;
  /** Store categories for dropdown */
  storeCategories: string[];
  /** Distinct aliases for autocomplete */
  distinctAliases?: string[];

  // Context
  /** Batch context for editing from batch review queue */
  batchContext?: { index: number; total: number } | null;
  /** Callback to navigate to previous receipt in batch */
  onBatchPrevious?: () => void;
  /** Callback to navigate to next receipt in batch */
  onBatchNext?: () => void;
  /** Default city from settings */
  defaultCity?: string;
  /** Default country from settings */
  defaultCountry?: string;

  // Optional UI callbacks
  /**
   * @deprecated Story 14e-25d: View uses openModal() from useModalActions() directly.
   * This prop is no longer needed.
   */
  onCreditInfoClick?: () => void;
  /** Whether save is in progress */
  isSaving?: boolean;
  /** Animate items on initial load */
  animateItems?: boolean;
  /** Whether a credit was already used for this scan */
  creditUsed?: boolean;

  // Phase 4: Cross-Store Suggestions
  /** All item name mappings for cross-store suggestions */
  itemNameMappings?: ItemNameMapping[];

  // Batch mode
  /** Callback when user clicks batch scan button */
  onBatchModeClick?: () => void;

}
