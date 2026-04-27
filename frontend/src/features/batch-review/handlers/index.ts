/**
 * Story 14e-14a: Batch Review Handlers
 * Story 14e-14b: Edit and Save Handlers
 * Story 14e-14c: Discard and Credit Check Handlers
 *
 * Barrel export for batch review handler functions.
 * Part 1 of 4: Navigation handlers.
 * Part 2 of 4: Edit + save handlers.
 * Part 3 of 4: Discard + credit check handlers.
 *
 * Part 4 (14e-14d): App.tsx integration
 */

// Types (Story 14e-14a, 14e-14b, 14e-14c)
export type {
  BatchNavigationContext,
  BatchEditContext,
  SaveContext,
  SaveCompleteContext,
  CategoryMappingResult,
  MerchantMatchResult,
  ItemNameMappingResult,
  BatchProcessingController,
  DiscardContext,
  CreditCheckContext,
} from './types';

// Navigation handlers (Story 14e-14a)
export { navigateToPreviousReceipt, navigateToNextReceipt } from './navigation';

// Edit handler (Story 14e-14b)
export { editBatchReceipt } from './editReceipt';

// Save handlers (Story 14e-14b)
export { saveBatchTransaction, handleSaveComplete } from './save';

// Discard handlers (Story 14e-14c)
export { handleReviewBack, confirmDiscard, cancelDiscard } from './discard';

// Credit check handler (Story 14e-14c)
export { confirmWithCreditCheck } from './creditCheck';

// Utilities (Story 14e-14d - Code Review consolidation)
export { buildTransactionWithThumbnail } from './utils';
