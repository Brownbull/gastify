/**
 * Story 14e-18b: Credit Handlers Extraction
 *
 * Credit warning dialog handlers extracted to the credit feature module.
 * Uses factory pattern with props-based dependency injection.
 *
 * Pattern: Epic 14c-refactor.20 - handler extraction pattern
 * @see src/App.tsx (original implementations)
 * @see src/services/creditService.ts (checkCreditSufficiency)
 */

import type { UserCredits } from '@/types/scan';
import type { CreditCheckResult } from '@/services/creditService';
import { checkCreditSufficiency } from '@/services/creditService';

/**
 * Context interface for credit handler dependencies.
 * Follows props-based dependency injection pattern.
 */
export interface CreditHandlerContext {
  /** Current user credits */
  credits: UserCredits;
  /** State setter for showing credit warning dialog */
  setShowCreditWarning: (show: boolean) => void;
  /** State setter for credit check result */
  setCreditCheckResult: (result: CreditCheckResult | null) => void;
  /** Optional callback when user confirms batch with credits */
  onBatchConfirmed?: () => void | Promise<void>;
}

/**
 * Factory for batch confirm with credit check handler.
 * Called before batch processing to verify sufficient super credits.
 *
 * Batch uses 1 super credit regardless of image count.
 * This is the batch pricing model - users pay a flat rate for batch scans.
 *
 * @param ctx - Handler context with dependencies
 * @returns Handler function that checks credits and shows warning dialog
 *
 * @example
 * ```typescript
 * const handleBatchConfirm = createBatchConfirmWithCreditCheck({
 *   credits: userCredits,
 *   setShowCreditWarning,
 *   setCreditCheckResult,
 * });
 * ```
 */
export function createBatchConfirmWithCreditCheck(ctx: CreditHandlerContext): () => void {
  return () => {
    // Batch uses 1 super credit regardless of image count
    const result = checkCreditSufficiency(ctx.credits, 1, true);
    ctx.setCreditCheckResult(result);
    ctx.setShowCreditWarning(true);
  };
}

/**
 * Factory for credit warning confirm handler.
 * Called when user confirms proceeding with the batch operation.
 *
 * @param ctx - Handler context with dependencies
 * @returns Handler function that dismisses dialog and triggers batch processing
 *
 * @example
 * ```typescript
 * const handleConfirm = createCreditWarningConfirm({
 *   credits: userCredits,
 *   setShowCreditWarning,
 *   setCreditCheckResult,
 *   onBatchConfirmed: startBatchProcessing,
 * });
 * ```
 */
export function createCreditWarningConfirm(ctx: CreditHandlerContext): () => void | Promise<void> {
  return async () => {
    ctx.setShowCreditWarning(false);
    ctx.setCreditCheckResult(null);
    await ctx.onBatchConfirmed?.();
  };
}

/**
 * Factory for credit warning cancel handler.
 * Called when user cancels the batch operation from the warning dialog.
 *
 * @param ctx - Handler context with dependencies
 * @returns Handler function that dismisses dialog without proceeding
 *
 * @example
 * ```typescript
 * const handleCancel = createCreditWarningCancel({
 *   credits: userCredits,
 *   setShowCreditWarning,
 *   setCreditCheckResult,
 * });
 * ```
 */
export function createCreditWarningCancel(ctx: CreditHandlerContext): () => void {
  return () => {
    ctx.setShowCreditWarning(false);
    ctx.setCreditCheckResult(null);
  };
}
