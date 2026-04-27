/**
 * Total Validation Logic
 *
 * Validates that the extracted total roughly matches the sum of item prices.
 * Detects missing/extra digit errors in OCR extraction.
 *
 * Story: Prompt improvement - Total validation rule
 */

import type { Transaction, TransactionItem } from '@/types/transaction';

/** Discrepancy threshold (40%) - beyond this, show warning dialog */
export const TOTAL_DISCREPANCY_THRESHOLD = 0.4;

/**
 * Result of total validation check.
 */
export interface TotalValidationResult {
  /** Whether the total is valid (discrepancy <= threshold) */
  isValid: boolean;
  /** The extracted total from AI */
  extractedTotal: number;
  /** Sum of (price × quantity) for all items */
  itemsSum: number;
  /** Absolute discrepancy as a decimal (0.0 - 1.0+) */
  discrepancy: number;
  /** Human-readable discrepancy percentage */
  discrepancyPercent: number;
  /** Suggested correction if pattern detected (e.g., missing digit) */
  suggestedTotal: number | null;
  /** Type of error detected */
  errorType: 'none' | 'missing_digit' | 'extra_digit' | 'unknown';
}

/**
 * Calculate the sum of all items.
 *
 * NOTE: The AI returns `price` as the LINE TOTAL (already multiplied by quantity),
 * not the unit price. So we just sum the prices directly without multiplying by qty.
 *
 * Example: Receipt shows "180 EXTRA COLOR × $144 = $25,920"
 * AI returns: { name: "EXTRA COLOR", price: 25920, quantity: 180 }
 * We should sum: 25920 (not 25920 × 180)
 *
 * @param items - Array of transaction items
 * @returns Total sum of all items
 */
export function calculateItemsSum(items: TransactionItem[]): number {
  if (!Array.isArray(items) || items.length === 0) {
    return 0;
  }

  // totalPrice is already the line total (qty × unit price), so just sum prices
  return items.reduce((sum, item) => {
    const price = typeof item.totalPrice === 'number' ? item.totalPrice : 0;
    return sum + price;
  }, 0);
}

/**
 * Calculate the discrepancy between two values.
 *
 * @param total - The extracted total
 * @param itemsSum - The calculated items sum
 * @returns Discrepancy as a decimal (0.0 means equal, 0.5 means 50% difference)
 */
export function calculateDiscrepancy(total: number, itemsSum: number): number {
  if (total === 0 && itemsSum === 0) {
    return 0;
  }

  const maxValue = Math.max(total, itemsSum);
  if (maxValue === 0) {
    return 0;
  }

  return Math.abs(total - itemsSum) / maxValue;
}

/**
 * Detect if the error is a missing or extra digit pattern.
 *
 * Missing digit: items sum is ~10x+ the total (e.g., 102052 vs 10205)
 * Extra digit: total is ~10x+ the items sum (e.g., 102052 vs 1020520)
 *
 * We use a wider range (5-20) because:
 * - Receipts may have some items not extracted
 * - Prices may vary slightly in extraction
 * - The key insight is detecting order-of-magnitude errors
 *
 * @param total - The extracted total
 * @param itemsSum - The calculated items sum
 * @returns The error type and suggested correction
 */
function detectDigitError(
  total: number,
  itemsSum: number
): { errorType: TotalValidationResult['errorType']; suggestedTotal: number | null } {
  if (total === 0 || itemsSum === 0) {
    return { errorType: 'unknown', suggestedTotal: null };
  }

  const ratio = itemsSum / total;

  // Missing digit: items sum is ~10x+ the total (ratio between 5 and 20)
  // This catches cases like 102052 vs 10205 (ratio ~10)
  // Wider range accounts for incomplete item extraction
  if (ratio >= 5 && ratio <= 20) {
    return { errorType: 'missing_digit', suggestedTotal: itemsSum };
  }

  // Extra digit: total is ~10x+ the items sum (ratio between 0.05 and 0.2)
  // This catches cases like 10205 vs 102050 (ratio ~0.1)
  if (ratio >= 0.05 && ratio <= 0.2) {
    return { errorType: 'extra_digit', suggestedTotal: itemsSum };
  }

  return { errorType: 'unknown', suggestedTotal: itemsSum };
}

/**
 * Validate that the transaction total matches the sum of items.
 *
 * @param transaction - The transaction to validate
 * @returns Validation result with discrepancy info and suggested correction
 *
 * @example
 * const result = validateTotal(scanResult);
 * if (!result.isValid && result.errorType === 'missing_digit') {
 *   // Show dialog: "Total parece incorrecto. ¿Usar $102,052 en vez de $10,205?"
 * }
 */
export function validateTotal(transaction: Transaction): TotalValidationResult {
  const extractedTotal = typeof transaction.total === 'number' ? transaction.total : 0;
  const itemsSum = calculateItemsSum(transaction.items);
  const discrepancy = calculateDiscrepancy(extractedTotal, itemsSum);
  const discrepancyPercent = Math.round(discrepancy * 100);
  const isValid = discrepancy <= TOTAL_DISCREPANCY_THRESHOLD;

  // If invalid, try to detect the error pattern
  if (!isValid) {
    const { errorType, suggestedTotal } = detectDigitError(extractedTotal, itemsSum);
    return {
      isValid,
      extractedTotal,
      itemsSum,
      discrepancy,
      discrepancyPercent,
      suggestedTotal,
      errorType,
    };
  }

  return {
    isValid,
    extractedTotal,
    itemsSum,
    discrepancy,
    discrepancyPercent,
    suggestedTotal: null,
    errorType: 'none',
  };
}

/**
 * Check if a transaction needs total validation warning.
 * Quick check without full validation result.
 *
 * @param transaction - The transaction to check
 * @returns true if total vs items discrepancy exceeds threshold
 */
export function needsTotalValidation(transaction: Transaction): boolean {
  const extractedTotal = typeof transaction.total === 'number' ? transaction.total : 0;
  const itemsSum = calculateItemsSum(transaction.items);
  const discrepancy = calculateDiscrepancy(extractedTotal, itemsSum);
  return discrepancy > TOTAL_DISCREPANCY_THRESHOLD;
}
