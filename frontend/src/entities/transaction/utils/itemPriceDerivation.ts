/**
 * Item Price Derivation
 *
 * Story 18-8: Derives unitPrice / totalPrice from available data.
 * Trust hierarchy: totalPrice (receipt line total) > unitPrice * qty (derived).
 *
 * @module entities/transaction/utils/itemPriceDerivation
 */

import type { TransactionItem } from '@/types/transaction';

/** Tolerance for consistency validation between unitPrice * qty and totalPrice */
export const PRICE_TOLERANCE = 0.05;

/**
 * Derive missing unitPrice or totalPrice from available data.
 *
 * NOTE: Uses Math.round — assumes integer currency (CLP). For decimal currencies
 * (USD, EUR) this will lose cents. See Epic 18.5 for currency-aware rounding.
 *
 * Rules:
 * 1. qty absent or 0 → default to 1
 * 2. Both present and consistent (within 5%) → keep both
 * 3. Both present but inconsistent → trust totalPrice, recalculate unitPrice
 * 4. Only totalPrice → derive unitPrice = totalPrice / qty
 * 5. Only unitPrice (totalPrice is 0) → derive totalPrice = unitPrice * qty
 * 6. Neither → both stay 0
 */
export function deriveItemPrices(item: TransactionItem): TransactionItem {
  const qty = (item.qty && item.qty > 0) ? item.qty : 1;
  const hasTotalPrice = typeof item.totalPrice === 'number' && item.totalPrice !== 0;
  const hasUnitPrice = typeof item.unitPrice === 'number' && item.unitPrice !== 0;

  let unitPrice: number;
  let totalPrice: number;

  if (hasTotalPrice && hasUnitPrice) {
    // Both present — check consistency
    const computed = item.unitPrice! * qty;
    const deviation = item.totalPrice === 0
      ? 0
      : Math.abs(computed - item.totalPrice) / Math.abs(item.totalPrice);

    if (deviation <= PRICE_TOLERANCE) {
      // Consistent — keep both as-is
      unitPrice = item.unitPrice!;
      totalPrice = item.totalPrice;
    } else {
      // Inconsistent — trust totalPrice, recalculate unitPrice
      totalPrice = item.totalPrice;
      unitPrice = Math.round(totalPrice / qty);
    }
  } else if (hasTotalPrice) {
    // Only totalPrice — derive unitPrice
    totalPrice = item.totalPrice;
    unitPrice = Math.round(totalPrice / qty);
  } else if (hasUnitPrice) {
    // Only unitPrice — derive totalPrice
    unitPrice = item.unitPrice!;
    totalPrice = Math.round(unitPrice * qty);
  } else {
    // Neither — both zero
    unitPrice = 0;
    totalPrice = 0;
  }

  return {
    ...item,
    qty,
    unitPrice,
    totalPrice,
  };
}

/**
 * Derive prices for an array of items.
 */
export function deriveItemsPrices(items: TransactionItem[]): TransactionItem[] {
  return items.map(deriveItemPrices);
}

/**
 * Validate consistency between unitPrice * qty and totalPrice.
 * Returns deviation as a decimal (0.0 = exact match).
 */
export function validateItemPriceConsistency(
  item: TransactionItem
): { isConsistent: boolean; deviation: number } {
  if (item.unitPrice == null || item.totalPrice === 0 || item.totalPrice < 0) {
    return { isConsistent: true, deviation: 0 };
  }

  const qty = (item.qty && item.qty > 0) ? item.qty : 1;
  const computed = item.unitPrice * qty;
  const deviation = Math.abs(computed - item.totalPrice) / Math.abs(item.totalPrice);

  return {
    isConsistent: deviation <= PRICE_TOLERANCE,
    deviation,
  };
}
