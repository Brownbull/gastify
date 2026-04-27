/**
 * Item Name Mappings Utility
 *
 * Story 14e-42: Extract applyItemNameMappings
 *
 * Pure utility function for applying learned item name mappings to transactions.
 * This function is used in the scan flow and batch processing to automatically
 * rename items based on user's learned preferences (e.g., "COCA COLA 2L" → "Coca-Cola").
 *
 * @module features/categories/utils/itemNameMappings
 */

import type { Transaction, TransactionItem } from '@/types/transaction';

// =============================================================================
// Constants
// =============================================================================

/**
 * Minimum confidence score required for an item name match to be applied.
 * Matches at or below this threshold are ignored to avoid false positives.
 */
const ITEM_NAME_MATCH_CONFIDENCE_THRESHOLD = 0.7;

// =============================================================================
// Types
// =============================================================================

/**
 * Match result from findItemNameMatch hook.
 * Represents a potential item name mapping with confidence score.
 */
export interface ItemNameMatchResult {
  /** The mapping details */
  mapping: {
    /** Optional unique identifier for the mapping (for usage tracking) */
    id?: string;
    /** The target (preferred) item name to apply */
    targetItemName: string;
    /** Optional target category to apply alongside the name */
    targetCategory?: string;
  };
  /** Confidence score (0-1) indicating match quality */
  confidence: number;
}

/**
 * Function type for item name matching (dependency injection).
 *
 * This type allows the pure utility function to receive the matching
 * logic as a parameter, maintaining testability and decoupling from hooks.
 *
 * @param normalizedMerchant - Normalized merchant name (item mappings are scoped per-store)
 * @param itemName - The item name to find a mapping for
 * @returns The match result or null if no match found
 */
export type FindItemNameMatchFn = (
  normalizedMerchant: string,
  itemName: string
) => ItemNameMatchResult | null;

/**
 * Result of applying item name mappings to a transaction.
 */
export interface ApplyItemNameMappingsResult {
  /** Transaction with updated item names */
  transaction: Transaction;
  /** List of mapping IDs that were applied (for usage tracking) */
  appliedIds: string[];
}

// =============================================================================
// Main Function
// =============================================================================

/**
 * Applies learned item name mappings to a transaction's items.
 *
 * This is a **pure function** with no side effects:
 * - Does not mutate the input transaction
 * - Returns a new transaction object with updated items
 * - No hooks or async operations inside
 *
 * Only applies mappings when confidence > 0.7 threshold.
 * When a mapping includes a targetCategory, it is also applied and marked as 'learned'.
 *
 * @param transaction - Transaction with items to process
 * @param normalizedMerchant - Normalized merchant name from merchant mapping
 * @param findItemNameMatch - Function to find matching item name mapping
 * @returns Object with updated transaction and list of applied mapping IDs
 *
 * @example
 * ```typescript
 * // Basic usage with dependency injection
 * const result = applyItemNameMappings(tx, 'JUMBO', findItemNameMatch);
 *
 * // result.transaction has updated item names
 * // result.appliedIds contains mapping IDs for usage tracking
 *
 * // Increment usage for applied mappings (fire-and-forget)
 * result.appliedIds.forEach(id => incrementItemNameMappingUsage(id));
 * ```
 *
 * @example
 * ```typescript
 * // Example transformation:
 * // Input item: { name: "COCA COLA 2L", category: "beverages" }
 * // Mapping: { targetItemName: "Coca-Cola 2L", targetCategory: "soft_drinks" }
 * // Output: { name: "Coca-Cola 2L", category: "soft_drinks", categorySource: "learned" }
 * ```
 */
export function applyItemNameMappings(
  transaction: Transaction,
  normalizedMerchant: string,
  findItemNameMatch: FindItemNameMatchFn
): ApplyItemNameMappingsResult {
  const appliedIds: string[] = [];

  // Create new items array with learned names applied
  const updatedItems = transaction.items.map((item: TransactionItem): TransactionItem => {
    // Try to find a mapping for this item name at this merchant
    const match = findItemNameMatch(normalizedMerchant, item.name);

    // Only apply if confidence is high enough (matching merchant mapping threshold)
    if (match && match.confidence > ITEM_NAME_MATCH_CONFIDENCE_THRESHOLD) {
      // Track applied mapping ID for usage increment
      if (match.mapping.id) {
        appliedIds.push(match.mapping.id);
      }

      // Return updated item with learned name (and optionally category)
      return {
        ...item,
        name: match.mapping.targetItemName,
        // Apply learned category if mapping has one
        ...(match.mapping.targetCategory && { category: match.mapping.targetCategory }),
        // Mark as learned (consistent with merchantSource pattern)
        categorySource: match.mapping.targetCategory ? ('learned' as const) : item.categorySource,
      };
    }

    // No match - return item unchanged
    return item;
  });

  return {
    transaction: {
      ...transaction,
      items: updatedItems,
    },
    appliedIds,
  };
}
