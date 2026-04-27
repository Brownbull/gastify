/**
 * Story 14e-14c: Batch Credit Check Handler
 *
 * Extracted handler for credit check before batch processing.
 * Part 3 of 4: Discard and credit check handlers.
 *
 * Source: src/App.tsx:1642-1646 (handleBatchConfirmWithCreditCheck)
 */

import type { CreditCheckContext } from './types';

/**
 * Check credit sufficiency and show warning dialog before batch processing.
 *
 * Batch processing uses 1 super credit regardless of image count.
 * This is the batch pricing model - users pay a flat rate for batch scans.
 *
 * @param context - Dependencies for credit check operation
 */
export function confirmWithCreditCheck(context: CreditCheckContext): void {
  const {
    userCredits,
    checkCreditSufficiency,
    setCreditCheckResult,
    setShowCreditWarning,
  } = context;

  // Batch uses 1 super credit regardless of image count
  const result = checkCreditSufficiency(userCredits, 1, true);
  setCreditCheckResult(result);
  setShowCreditWarning(true);
}
