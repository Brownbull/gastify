/**
 * Transaction Reconciliation Utility
 *
 * Pure function to reconcile item totals with receipt total.
 * Adds adjustment items (surplus/discount) when there's a discrepancy.
 *
 * Story 14e-41: Extract reconcileItemsTotal to entity
 *
 * @module entities/transaction/utils/reconciliation
 */

import type { TransactionItem } from '../types';
import { TRANSLATIONS } from '@/utils/translations';
import { roundTo } from '@/utils/numberFormat';

/**
 * Result of reconciling items with receipt total.
 */
export interface ReconcileResult {
  /** Reconciled items (may include adjustment item) */
  items: TransactionItem[];
  /** Whether there was a discrepancy that required adjustment */
  hasDiscrepancy: boolean;
  /** The discrepancy amount (positive = receipt > items, negative = items > receipt) */
  discrepancyAmount: number;
}

/**
 * Reconcile items total with receipt total.
 *
 * If there's a discrepancy between items sum and receipt total,
 * adds an adjustment item to make them match:
 * - Positive difference (receipt > items): "Unitemized charge" / "Cargo sin detallar"
 * - Negative difference (items > receipt): "Discount/Adjustment" / "Descuento/Ajuste"
 *
 * Small discrepancies (< 1 unit in the currency) are ignored to handle floating
 * point rounding. For CLP this is 1 peso, for USD this is $1.
 *
 * This is a pure function with no side effects.
 *
 * @param items - Original items from scan
 * @param receiptTotal - Total from receipt (in currency units, e.g., 5000 for CLP or 50.00 for USD)
 * @param lang - Language for adjustment item name ('en' | 'es'), defaults to 'en' if invalid
 * @returns Reconciled items and discrepancy info
 *
 * @example
 * ```typescript
 * // No discrepancy (CLP)
 * const items = [{ name: 'Coffee', price: 5000, qty: 1, category: 'Food' }];
 * const result = reconcileItemsTotal(items, 5000, 'en');
 * // result.hasDiscrepancy === false
 * // result.items === items (unchanged)
 *
 * // With discrepancy (surplus)
 * const result2 = reconcileItemsTotal(items, 7500, 'en');
 * // result2.hasDiscrepancy === true
 * // result2.items includes "Unitemized charge" item with price 2500
 *
 * // With discrepancy (discount)
 * const result3 = reconcileItemsTotal(items, 3000, 'es');
 * // result3.hasDiscrepancy === true
 * // result3.items includes "Descuento/Ajuste" item with price -2000
 * ```
 */
export function reconcileItemsTotal(
  items: TransactionItem[],
  receiptTotal: number,
  lang: 'en' | 'es'
): ReconcileResult {
  // Calculate items sum (totalPrice is already line total, not unit price)
  const itemsSum = items.reduce((sum, item) => {
    const price = typeof item.totalPrice === 'number' ? item.totalPrice : 0;
    return sum + price;
  }, 0);

  // Round to avoid floating point issues
  const roundedItemsSum = roundTo(itemsSum);
  const roundedReceiptTotal = roundTo(receiptTotal);
  const difference = roundTo(roundedReceiptTotal - roundedItemsSum);

  // Allow small discrepancies (< $1)
  if (Math.abs(difference) < 1) {
    return { items, hasDiscrepancy: false, discrepancyAmount: 0 };
  }

  // Get adjustment item name based on direction
  // Runtime validation: fallback to 'en' if invalid language
  const validLang = lang === 'en' || lang === 'es' ? lang : 'en';
  const translations = TRANSLATIONS[validLang];
  const adjustmentName = difference > 0 ? translations.surplusItem : translations.discountItem;

  // Add adjustment item
  const adjustmentItem: TransactionItem = {
    name: adjustmentName,
    totalPrice: difference,
    qty: 1,
    category: 'Other',
  };

  return {
    items: [...items, adjustmentItem],
    hasDiscrepancy: true,
    discrepancyAmount: difference,
  };
}
