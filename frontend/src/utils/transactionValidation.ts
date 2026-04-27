/**
 * Transaction Validation Predicates
 *
 * Story 15-2d: Shared validation predicates
 *
 * Centralizes duplicated item/transaction validation logic
 * used across scan, edit, save, and analytics flows.
 */

import type { TransactionItem } from '../types/transaction';

/**
 * Check if a single item is valid for saving.
 * Requires a non-empty name and a numeric price >= 0.
 *
 * Used by: confidenceCheck, useScanHandlers, scan validation
 */
export function isValidItem(item: TransactionItem): boolean {
  return (
    !!item.name &&
    item.name.trim().length > 0 &&
    typeof item.totalPrice === 'number' &&
    item.totalPrice >= 0
  );
}

/**
 * Check if an items array contains at least one item with price > 0.
 * Lighter check than isValidItem — doesn't require name.
 *
 * Used by: scanStateMachine.canSaveTransaction, ScanResultView, TransactionEditorView
 */
export function hasItemWithPrice(items: TransactionItem[] | undefined): boolean {
  if (!items || items.length === 0) return false;
  return items.some((item) => item.totalPrice > 0);
}

/**
 * Check if an items array contains at least one fully valid item.
 * Uses the stricter isValidItem check (name + price).
 *
 * Used by: confidenceCheck.shouldShowQuickSave, useScanHandlers
 */
export function hasValidItems(items: TransactionItem[] | undefined): boolean {
  if (!Array.isArray(items) || items.length === 0) return false;
  return items.some(isValidItem);
}
