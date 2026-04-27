/**
 * Confidence Check Logic
 *
 * Story 11.2: Quick Save Card Component (AC #5, #6)
 * Determines whether to show QuickSaveCard or navigate to EditView.
 *
 * Confidence is calculated based on field completeness heuristics:
 * - Merchant: 20 points (required)
 * - Total: 25 points (required)
 * - Date: 15 points
 * - Category: 15 points
 * - Items: 25 points (at least 1 item with name and price)
 *
 * Threshold: 85% (0.85) for Quick Save eligibility
 */

import type { Transaction } from '../types/transaction';
import { hasValidItems } from '@/utils/transactionValidation';

/** Confidence threshold for showing Quick Save Card */
export const QUICK_SAVE_CONFIDENCE_THRESHOLD = 0.85;

/** Weight distribution for confidence calculation */
const CONFIDENCE_WEIGHTS = {
  merchant: 20,
  total: 25,
  date: 15,
  category: 15,
  items: 25,
} as const;

const MAX_SCORE = Object.values(CONFIDENCE_WEIGHTS).reduce((a, b) => a + b, 0);

/**
 * Calculate confidence score for a transaction based on field completeness.
 *
 * @param transaction - The transaction to evaluate
 * @returns Confidence score between 0 and 1
 *
 * @example
 * const confidence = calculateConfidence(scanResult);
 * // Returns 0.92 for a well-parsed receipt
 */
export function calculateConfidence(transaction: Transaction): number {
  let score = 0;

  // Merchant check (required - 20 points)
  if (transaction.merchant && transaction.merchant.trim().length > 0) {
    score += CONFIDENCE_WEIGHTS.merchant;
  }

  // Total check (required - 25 points)
  // Must be a valid positive number
  if (typeof transaction.total === 'number' && transaction.total > 0) {
    score += CONFIDENCE_WEIGHTS.total;
  }

  // Date check (15 points)
  // Must be a valid date string
  if (transaction.date && isValidDate(transaction.date)) {
    score += CONFIDENCE_WEIGHTS.date;
  }

  // Category check (15 points)
  // Must have a valid non-"Other" category
  if (transaction.category && transaction.category !== 'Other') {
    score += CONFIDENCE_WEIGHTS.category;
  }

  // Items check (25 points)
  // At least 1 item with name and valid price
  if (hasValidItems(transaction.items)) {
    score += CONFIDENCE_WEIGHTS.items;
  }

  return score / MAX_SCORE;
}

/**
 * Check if a date string is valid.
 */
function isValidDate(dateStr: string): boolean {
  try {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

/**
 * Determine if Quick Save should be shown based on confidence.
 *
 * @param transaction - The transaction from scan result
 * @returns true if Quick Save should be shown, false for EditView
 *
 * @example
 * if (shouldShowQuickSave(scanResult)) {
 *   showQuickSaveCard();
 * } else {
 *   navigateToEditView();
 * }
 */
export function shouldShowQuickSave(transaction: Transaction): boolean {
  // Check required fields first
  if (!transaction.merchant || transaction.merchant.trim().length === 0) {
    return false;
  }

  if (typeof transaction.total !== 'number' || transaction.total <= 0) {
    return false;
  }

  // Story 14.24: Must have at least one valid item to show QuickSaveCard
  // Transactions without items should always go to EditView for completion
  if (!hasValidItems(transaction.items)) {
    return false;
  }

  // Calculate confidence and check threshold
  const confidence = calculateConfidence(transaction);
  return confidence >= QUICK_SAVE_CONFIDENCE_THRESHOLD;
}

/**
 * Get detailed confidence breakdown for debugging/display.
 *
 * @param transaction - The transaction to analyze
 * @returns Object with individual field scores and total
 */
export function getConfidenceBreakdown(transaction: Transaction): {
  merchant: boolean;
  total: boolean;
  date: boolean;
  category: boolean;
  items: boolean;
  score: number;
  meetsThreshold: boolean;
} {
  const breakdown = {
    merchant: Boolean(transaction.merchant && transaction.merchant.trim().length > 0),
    total: typeof transaction.total === 'number' && transaction.total > 0,
    date: Boolean(transaction.date && isValidDate(transaction.date)),
    category: Boolean(transaction.category && transaction.category !== 'Other'),
    items: hasValidItems(transaction.items),
    score: 0,
    meetsThreshold: false,
  };

  breakdown.score = calculateConfidence(transaction);
  breakdown.meetsThreshold = breakdown.score >= QUICK_SAVE_CONFIDENCE_THRESHOLD;

  return breakdown;
}

export default shouldShowQuickSave;
