/**
 * Modal Manager Types
 *
 * Story 14e-2: Defines all modal types that can be opened via the Modal Manager.
 * Each modal type has a corresponding props interface for type safety.
 *
 * @module ModalManager/types
 */

import type { Transaction } from '../../types/transaction';
import type {
  ConflictingTransaction,
  ConflictReason,
} from '../../components/dialogs/TransactionConflictDialog';
import type {
  TransactionPreview,
} from '@features/history/components/DeleteTransactionsModal';
import type {
  LearnMerchantSelection,
  ItemNameChange,
} from '../../components/dialogs/LearnMerchantDialog';
import type {
  ItemToLearn,
} from '../../components/CategoryLearningPrompt';
import type {
  SubcategoryItemToLearn,
} from '../../components/SubcategoryLearningPrompt';

// Re-export types for consumer convenience
export type { TransactionPreview } from '@features/history/components/DeleteTransactionsModal';
export type { LearnMerchantSelection, ItemNameChange } from '../../components/dialogs/LearnMerchantDialog';
export type { ItemToLearn } from '../../components/CategoryLearningPrompt';
export type { SubcategoryItemToLearn } from '../../components/SubcategoryLearningPrompt';

// =============================================================================
// Modal Type Union
// =============================================================================

/**
 * Union type of all modal types supported by the Modal Manager.
 * Each type corresponds to a specific modal component.
 */
export type ModalType =
  // Scan-related modals (managed by ScanContext until Part 2)
  | 'currencyMismatch'
  | 'totalMismatch'
  | 'quickSave'
  | 'scanComplete'
  | 'batchComplete'
  | 'batchDiscard'
  | 'creditWarning'
  // Transaction management
  | 'transactionConflict'
  | 'deleteTransactions'
  // Learning dialogs (Story 14e-5)
  | 'learnMerchant'
  | 'categoryLearning'
  | 'subcategoryLearning'
  | 'itemNameSuggestion'
  // General
  | 'creditInfo'
  | 'insightDetail'
  | 'upgradePrompt'
  | 'signOut'
  // Shared groups (stubbed - Epic 14c-refactor)
  | 'joinGroup'
  | 'leaveGroup'
  | 'deleteGroup'
  | 'transferOwnership'
  | 'removeMember'
  | 'ownerLeaveWarning';

// =============================================================================
// Props Interfaces for Each Modal
// =============================================================================

/** Props for currency mismatch dialog (scan detected different currency) */
export interface CurrencyMismatchProps {
  /** Currency detected by AI scan */
  detectedCurrency: string;
  /** User's configured currency */
  userCurrency: string;
  /** Callback when user confirms currency selection */
  onConfirm: (useCurrency: string) => void;
  /** Callback when user cancels */
  onCancel: () => void;
}

/** Props for total mismatch dialog (calculated vs receipt total) */
export interface TotalMismatchProps {
  /** Sum of item prices */
  calculatedTotal: number;
  /** Total shown on receipt */
  receiptTotal: number;
  /** Use the calculated total */
  onUseCalculated: () => void;
  /** Use the receipt total */
  onUseReceipt: () => void;
  /** Open editor to manually adjust */
  onEdit: () => void;
}

/** Props for quick save confirmation card */
export interface QuickSaveProps {
  /** Transaction to quick-save */
  transaction: Transaction;
  /** AI confidence score (0-100) */
  confidence: number;
  /** Save without editing */
  onSave: () => void;
  /** Open editor for changes */
  onEdit: () => void;
}

/** Props for scan complete modal */
export interface ScanCompleteProps {
  /** Scanned transaction */
  transaction: Transaction;
  /** Save the transaction */
  onSave: () => void;
  /** Edit before saving */
  onEdit: () => void;
}

/** Props for batch complete modal */
export interface BatchCompleteProps {
  /** Number of successfully processed receipts */
  successCount: number;
  /** Number of failed receipts */
  failedCount: number;
  /** All transactions from batch */
  transactions: Transaction[];
  /** Dismiss the modal */
  onDismiss: () => void;
}

/**
 * Props for batch discard confirmation dialog.
 * Used for both single receipt discard and batch cancel scenarios.
 *
 * Story 14e-16: Extended to support both cases:
 * - Single receipt: pass receiptId (unsavedCount optional)
 * - Batch cancel: pass unsavedCount (receiptId undefined)
 */
export interface BatchDiscardProps {
  /** Number of unsaved receipts (for batch cancel display) */
  unsavedCount?: number;
  /** Receipt ID for single receipt discard (mutually exclusive with batch cancel) */
  receiptId?: string;
  /** Confirm discard */
  onConfirm: () => void;
  /** Cancel discard */
  onCancel: () => void;
  /** Translation function */
  t: (key: string) => string;
  /** Current theme for styling */
  theme?: 'light' | 'dark';
}

/** Props for credit warning dialog */
export interface CreditWarningProps {
  /** Credits needed for operation */
  requiredCredits: number;
  /** User's available credits */
  availableCredits: number;
  /** Proceed anyway */
  onProceed: () => void;
  /** Cancel operation */
  onCancel: () => void;
}

/**
 * Props for transaction conflict dialog
 * Story 14e-5: Matches TransactionConflictDialogProps from actual component
 */
export interface TransactionConflictProps {
  /** Details of the conflicting transaction */
  conflictingTransaction: ConflictingTransaction | null;
  /** Reason for the conflict */
  conflictReason: ConflictReason | null;
  /** Callback when user chooses to continue with current view (close dialog without action) */
  onContinueCurrent?: () => void;
  /** Callback when user chooses to view/resume the conflicting transaction */
  onViewConflicting: () => void;
  /** Callback when user chooses to discard the conflicting transaction */
  onDiscardConflicting: () => void;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Translation function */
  t: (key: string) => string;
  /** Language for dynamic text */
  lang?: 'en' | 'es';
  /** Currency formatter */
  formatCurrency?: (amount: number, currency: string) => string;
}

/**
 * Props for delete transactions confirmation
 * Story 14e-5: Matches DeleteTransactionsModalProps from actual component
 */
export interface DeleteTransactionsProps {
  /** Transactions to be deleted (preview list) */
  transactions: TransactionPreview[];
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when delete is confirmed */
  onDelete: () => Promise<void>;
  /** Currency formatter */
  formatCurrency: (amount: number, currency: string) => string;
  /** Translation function */
  t: (key: string) => string;
  /** Language for pluralization */
  lang?: 'en' | 'es';
  /** Default currency */
  currency?: string;
}

/**
 * Props for learn merchant dialog
 * Story 14e-5: Matches LearnMerchantDialogProps from actual component
 */
export interface LearnMerchantProps {
  /** Original merchant name (from AI scan or previous value) */
  originalMerchant: string;
  /** User's corrected merchant name */
  correctedMerchant: string;
  /** Whether merchant alias changed */
  aliasChanged?: boolean;
  /** Whether store category changed */
  categoryChanged?: boolean;
  /** Original store category (for display) */
  originalCategory?: string;
  /** New store category (for display) */
  newCategory?: string;
  /** Item name changes to prompt for learning */
  itemNameChanges?: ItemNameChange[];
  /** Callback when user confirms - receives which items to learn */
  onConfirm: (selection: LearnMerchantSelection) => void;
  /** Callback when user dismisses the modal */
  onClose: () => void;
  /** Translation function */
  t: (key: string) => string;
  /** Current theme for styling */
  theme?: 'light' | 'dark';
}

/**
 * Props for category learning prompt
 * Story 14e-5: Matches CategoryLearningPromptProps from actual component
 */
export interface CategoryLearningProps {
  /** Items to learn (array of item name → group mappings) */
  items: ItemToLearn[];
  /** Callback when user clicks "Yes, Remember" */
  onConfirm: () => void;
  /** Callback when user dismisses the modal */
  onClose: () => void;
  /** Translation function */
  t: (key: string) => string;
  /** Current theme for styling */
  theme?: 'light' | 'dark';
  /** Loading state during async save operation */
  isLoading?: boolean;
}

/**
 * Props for subcategory learning prompt
 * Story 14e-5: Matches SubcategoryLearningPromptProps from actual component
 */
export interface SubcategoryLearningProps {
  /** Items to learn (array of item name → subcategory mappings) */
  items: SubcategoryItemToLearn[];
  /** Callback when user clicks "Yes, Remember" */
  onConfirm: () => void;
  /** Callback when user dismisses the modal */
  onClose: () => void;
  /** Translation function */
  t: (key: string) => string;
  /** Current theme for styling */
  theme?: 'light' | 'dark';
  /** Loading state during async save operation */
  isLoading?: boolean;
}

/**
 * Props for item name suggestion dialog
 * Story 14e-5: Matches ItemNameSuggestionDialogProps from actual component
 */
export interface ItemNameSuggestionProps {
  /** Original item name (from current scan) */
  originalItemName: string;
  /** Suggested item name (from another store's learned mapping) */
  suggestedItemName: string;
  /** The store where this name was learned */
  fromMerchant: string;
  /** Callback when user wants to apply the suggestion */
  onApply: () => void;
  /** Callback when user dismisses */
  onDismiss: () => void;
  /** Translation function */
  t: (key: string) => string;
  /** Current theme for styling */
  theme?: 'light' | 'dark';
}

/** Props for credit info modal */
export interface CreditInfoProps {
  /** Normal scan credits available */
  normalCredits: number;
  /** Super/premium credits available */
  superCredits: number;
  /** Close the modal */
  onClose: () => void;
  /** Open purchase flow (optional) */
  onPurchase?: () => void;
  /** Translation function (optional - Spanish fallbacks used if not provided) */
  t?: (key: string) => string;
  /** Language for fallback text */
  lang?: 'en' | 'es';
}

/** Props for insight detail modal */
export interface InsightDetailProps {
  /** ID of the insight to display */
  insightId: string;
  /** Close the modal */
  onClose: () => void;
}

/** Props for upgrade prompt modal */
export interface UpgradePromptProps {
  /** Feature requiring upgrade */
  feature: string;
  /** Proceed to upgrade */
  onUpgrade: () => void;
  /** Dismiss prompt */
  onDismiss: () => void;
}

/** Props for sign out confirmation */
export interface SignOutProps {
  /** Confirm sign out */
  onConfirm: () => void;
  /** Cancel sign out */
  onCancel: () => void;
  /** Translation function (optional - fallbacks used if not provided) */
  t?: (key: string) => string;
  /** Language for fallback text (default: 'es') */
  lang?: 'en' | 'es';
}

// =============================================================================
// Shared Groups Props (Stubbed - Epic 14c-refactor)
// =============================================================================

/** Props for join group dialog */
export interface JoinGroupProps {
  /** Share code from invite link (optional) */
  shareCode?: string;
  /** Join the group */
  onJoin: () => void;
  /** Cancel join */
  onCancel: () => void;
}

/** Props for leave group dialog */
export interface LeaveGroupProps {
  /** Name of group to leave */
  groupName: string;
  /** Confirm leave */
  onConfirm: () => void;
  /** Cancel leave */
  onCancel: () => void;
}

/** Props for delete group dialog */
export interface DeleteGroupProps {
  /** Name of group to delete */
  groupName: string;
  /** Number of members in group */
  memberCount: number;
  /** Confirm deletion */
  onConfirm: () => void;
  /** Cancel deletion */
  onCancel: () => void;
}

/** Props for transfer ownership dialog */
export interface TransferOwnershipProps {
  /** Name of the group */
  groupName: string;
  /** Available members to transfer to */
  members: { id: string; email: string }[];
  /** Transfer ownership to selected member */
  onTransfer: (newOwnerId: string) => void;
  /** Cancel transfer */
  onCancel: () => void;
}

/** Props for remove member dialog */
export interface RemoveMemberProps {
  /** Email of member to remove */
  memberEmail: string;
  /** Name of the group */
  groupName: string;
  /** Confirm removal */
  onConfirm: () => void;
  /** Cancel removal */
  onCancel: () => void;
}

/** Props for owner leave warning dialog */
export interface OwnerLeaveWarningProps {
  /** Name of the group */
  groupName: string;
  /** Transfer ownership first */
  onTransferFirst: () => void;
  /** Delete the group instead */
  onDeleteGroup: () => void;
  /** Cancel leaving */
  onCancel: () => void;
}

// =============================================================================
// Props Map (Type-Safe Modal Opening)
// =============================================================================

/**
 * Maps each ModalType to its corresponding props interface.
 * Enables type-safe modal opening with correct props.
 *
 * @example
 * ```typescript
 * // TypeScript will enforce correct props for each modal type
 * openModal('creditInfo', { normalCredits: 5, superCredits: 2, onClose: () => {} });
 *
 * // TypeScript ERROR: missing onClose
 * openModal('creditInfo', { normalCredits: 5, superCredits: 2 });
 *
 * // TypeScript ERROR: wrong props for modal type
 * openModal('creditInfo', { groupName: 'test' });
 * ```
 */
export interface ModalPropsMap {
  currencyMismatch: CurrencyMismatchProps;
  totalMismatch: TotalMismatchProps;
  quickSave: QuickSaveProps;
  scanComplete: ScanCompleteProps;
  batchComplete: BatchCompleteProps;
  batchDiscard: BatchDiscardProps;
  creditWarning: CreditWarningProps;
  transactionConflict: TransactionConflictProps;
  deleteTransactions: DeleteTransactionsProps;
  // Learning dialogs (Story 14e-5)
  learnMerchant: LearnMerchantProps;
  categoryLearning: CategoryLearningProps;
  subcategoryLearning: SubcategoryLearningProps;
  itemNameSuggestion: ItemNameSuggestionProps;
  creditInfo: CreditInfoProps;
  insightDetail: InsightDetailProps;
  upgradePrompt: UpgradePromptProps;
  signOut: SignOutProps;
  joinGroup: JoinGroupProps;
  leaveGroup: LeaveGroupProps;
  deleteGroup: DeleteGroupProps;
  transferOwnership: TransferOwnershipProps;
  removeMember: RemoveMemberProps;
  ownerLeaveWarning: OwnerLeaveWarningProps;
}
