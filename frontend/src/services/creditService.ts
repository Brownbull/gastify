/**
 * Story 12.4: Credit Warning System - Credit Service
 *
 * Provides credit check and validation logic for batch processing.
 * Currently works with in-memory credit state; future Epic will integrate
 * with Firestore for persistent credit tracking.
 *
 * @see docs/sprint-artifacts/epic12/story-12.4-credit-warning-system.md
 */

import { UserCredits } from '../types/scan';

/**
 * Result of a credit sufficiency check.
 * Includes all data needed for the Credit Warning Dialog.
 */
export interface CreditCheckResult {
  /** Whether user has enough credits for the operation */
  sufficient: boolean;
  /** Credits currently available */
  available: number;
  /** Credits required for the operation */
  required: number;
  /** Credits that will remain after the operation (0 if insufficient) */
  remaining: number;
  /** Shortage amount (0 if sufficient) */
  shortage: number;
  /** Maximum receipts processable with available credits */
  maxProcessable: number;
  /** Story 14.15 Session 10: Type of credits being used */
  creditType: 'normal' | 'super';
}

/**
 * Check if user has sufficient credits for an operation.
 *
 * Story 14.15 Session 10: Updated to support both credit types:
 * - 'normal' credits: For single photo scans (1 photo = 1 credit)
 * - 'super' credits: For batch scans (2+ photos = 1 super credit per photo)
 *
 * @param userCredits - Current user credit state
 * @param requiredCredits - Number of credits needed (usually = image count)
 * @param isBatch - Whether this is a batch operation (2+ images)
 * @returns CreditCheckResult with all relevant data for UI display
 *
 * @example
 * ```typescript
 * // Single scan - uses normal credits
 * const result = checkCreditSufficiency(userCredits, 1, false);
 *
 * // Batch scan - uses super credits
 * const result = checkCreditSufficiency(userCredits, batchImages.length, true);
 * if (!result.sufficient) {
 *   console.log(`Need ${result.shortage} more ${result.creditType} credits`);
 * }
 * ```
 */
export function checkCreditSufficiency(
  userCredits: UserCredits,
  requiredCredits: number,
  isBatch: boolean = false
): CreditCheckResult {
  // Story 14.15 Session 10: Use super credits for batch, normal for single
  const creditType: 'normal' | 'super' = isBatch ? 'super' : 'normal';
  const available = isBatch ? userCredits.superRemaining : userCredits.remaining;
  const sufficient = available >= requiredCredits;
  const remaining = sufficient ? available - requiredCredits : 0;
  const shortage = sufficient ? 0 : requiredCredits - available;
  const maxProcessable = Math.min(available, requiredCredits);

  return {
    sufficient,
    available,
    required: requiredCredits,
    remaining,
    shortage,
    maxProcessable,
    creditType,
  };
}

/**
 * Calculate the number of credits required for a batch operation.
 * Currently: 1 credit per image.
 *
 * @param imageCount - Number of images in the batch
 * @returns Number of credits required
 */
export function calculateCreditsRequired(imageCount: number): number {
  // 1 credit per receipt
  return imageCount;
}

/**
 * Create updated credits after successful deduction.
 * Pure function - does not mutate state.
 *
 * Story 14.15 Session 10: Updated to support both credit types:
 * - 'normal' credits: Deducted for single photo scans
 * - 'super' credits: Deducted for batch scans
 *
 * @param currentCredits - Current credit state
 * @param amount - Amount to deduct
 * @param creditType - Which type of credits to deduct ('normal' or 'super')
 * @returns New credit state
 * @throws Error if insufficient credits
 */
export function deductCredits(
  currentCredits: UserCredits,
  amount: number,
  creditType: 'normal' | 'super' = 'normal'
): UserCredits {
  if (creditType === 'super') {
    if (currentCredits.superRemaining < amount) {
      throw new Error('Insufficient super credits');
    }
    return {
      remaining: currentCredits.remaining,
      used: currentCredits.used,
      superRemaining: currentCredits.superRemaining - amount,
      superUsed: currentCredits.superUsed + amount,
    };
  } else {
    if (currentCredits.remaining < amount) {
      throw new Error('Insufficient credits');
    }
    return {
      remaining: currentCredits.remaining - amount,
      used: currentCredits.used + amount,
      superRemaining: currentCredits.superRemaining,
      superUsed: currentCredits.superUsed,
    };
  }
}

/**
 * Check if credits are in a warning state (low but not exhausted).
 * Used to show visual warnings in the UI.
 *
 * @param available - Available credits
 * @param required - Credits needed
 * @returns True if credits are low (will be exhausted or nearly so)
 */
export function isLowCreditsWarning(
  available: number,
  required: number
): boolean {
  // Warning if this batch will use all remaining credits
  // or leave fewer than 10% of what we started with
  const remaining = available - required;
  return remaining <= 0 || remaining < available * 0.1;
}
