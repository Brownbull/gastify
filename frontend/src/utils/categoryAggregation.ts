/**
 * Category Aggregation Utilities
 *
 * Shared logic for grouping categories by threshold ("Más" grouping)
 * and building unique product keys. Used by TrendsView, DashboardView,
 * and any component that aggregates transaction data by categories.
 *
 * Story 15-5a: Extract shared categoryAggregation.ts
 * Extracted from duplicated logic in TrendsView (5 copies) and DashboardView (4 copies).
 */

// ============================================================================
// Types
// ============================================================================

/** Minimum shape required for "Más" threshold grouping */
export interface MasGroupable {
  name: string;
  amount: number;
  count: number;
  itemCount: number;
  percent: number;
  transactionIds?: Set<string>;
}

/** Result of applying "Más" threshold grouping */
export interface MasGroupingResult<T> {
  displayCategories: T[];
  otroCategories: T[];
}

/** Extended result with expand/collapse support for treemap */
export interface TreemapGroupingResult<T> extends MasGroupingResult<T> {
  canExpand: boolean;
  canCollapse: boolean;
}

/** Factory function to create the synthetic "Más" entry */
export type MasEntryFactory<T> = (stats: {
  amount: number;
  count: number;
  itemCount: number;
  percent: number;
  categoryCount: number;
  transactionIds: Set<string>;
}) => T;

// ============================================================================
// "Más" Threshold Grouping
// ============================================================================

/** Check if a category name is a synthetic aggregated group (not a real category) */
const isAggregatedGroup = (name: string) => name === 'Más' || name === 'More';

/**
 * Merge transactionIds from multiple categories into a single Set.
 * Prevents double-counting when transactions span multiple categories.
 *
 * @param categories - Array of categories with optional transactionIds
 * @returns Merged Set of unique transaction IDs
 */
export function mergeTransactionIds<T extends { transactionIds?: Set<string>; count: number; name: string }>(
  categories: T[]
): Set<string> {
  const merged = new Set<string>();
  for (const cat of categories) {
    if (cat.transactionIds) {
      for (const id of cat.transactionIds) {
        merged.add(id);
      }
    } else {
      // Fallback for categories without transactionIds
      for (let i = 0; i < cat.count; i++) {
        merged.add(`${cat.name}-${i}`);
      }
    }
  }
  return merged;
}

/**
 * Apply "Más" threshold grouping to a sorted list of categories.
 *
 * Selection criteria:
 * 1. All categories >10% are displayed
 * 2. First category ≤10% (highest below threshold) is displayed
 * 3. If exactly 1 remaining → show it directly (no "Más")
 * 4. If 2+ remaining → aggregate into synthetic "Más" group
 *
 * @param sorted - Categories sorted by amount descending
 * @param total - Total amount for percent calculation of "Más" group
 * @param createMasEntry - Factory to create the "Más" entry in the caller's type
 * @returns Display categories and the categories aggregated into "Más"
 */
export function applyMasGrouping<T extends MasGroupable>(
  sorted: T[],
  total: number,
  createMasEntry: MasEntryFactory<T>,
): MasGroupingResult<T> {
  const aboveThreshold = sorted.filter(c => c.percent > 10 && !isAggregatedGroup(c.name));
  const belowThreshold = sorted.filter(c => c.percent <= 10 && !isAggregatedGroup(c.name));

  const result: T[] = [...aboveThreshold];

  // Add first category ≤10% if exists
  if (belowThreshold.length > 0) {
    result.push(belowThreshold[0]);
  }

  // Remaining categories that would go into "Más"
  const otroCategories = belowThreshold.slice(1);

  // If exactly 1 category would go into "Más", show it directly instead
  if (otroCategories.length === 1) {
    result.push(otroCategories[0]);
  } else if (otroCategories.length > 1) {
    const masAmount = otroCategories.reduce((sum, cat) => sum + cat.amount, 0);
    const masTransactionIds = mergeTransactionIds(otroCategories);
    const masCount = masTransactionIds.size;
    const masItemCount = otroCategories.reduce((sum, cat) => sum + cat.itemCount, 0);
    const masPercent = total > 0 ? (masAmount / total) * 100 : 0;

    result.push(createMasEntry({
      amount: masAmount,
      count: masCount,
      itemCount: masItemCount,
      percent: masPercent,
      categoryCount: otroCategories.length,
      transactionIds: masTransactionIds,
    }));
  }

  return { displayCategories: result, otroCategories };
}

/**
 * Extended "Más" grouping with expand/collapse support for treemap view.
 * Similar to applyMasGrouping but allows incrementally revealing hidden categories.
 *
 * @param allCategories - All categories (sorted by amount/value descending)
 * @param expandedCount - Number of extra categories revealed from "Más"
 * @param createMasEntry - Factory to create the "Más" entry in the caller's type
 * @returns Display categories, hidden categories, and expand/collapse state
 */
export function applyTreemapGrouping<T extends MasGroupable>(
  allCategories: T[],
  expandedCount: number,
  createMasEntry: MasEntryFactory<T>,
): TreemapGroupingResult<T> {
  if (allCategories.length === 0) {
    return { displayCategories: [], otroCategories: [], canExpand: false, canCollapse: false };
  }

  const aboveThreshold = allCategories.filter(c => c.percent > 10 && !isAggregatedGroup(c.name));
  const belowThreshold = allCategories.filter(c => c.percent <= 10 && !isAggregatedGroup(c.name));

  const displayCategories: T[] = [...aboveThreshold];

  // Add first category below 10% if exists
  if (belowThreshold.length > 0) {
    displayCategories.push(belowThreshold[0]);
  }

  // Add expanded categories from "Más"
  const expandedCategories = belowThreshold.slice(1, 1 + expandedCount);
  displayCategories.push(...expandedCategories);

  // Remaining categories go into "Más"
  const otroCategories = belowThreshold.slice(1 + expandedCount);

  if (otroCategories.length === 1) {
    displayCategories.push(otroCategories[0]);
  } else if (otroCategories.length > 1) {
    const masAmount = otroCategories.reduce((sum, c) => sum + c.amount, 0);
    const totalAmount = allCategories.reduce((sum, c) => sum + c.amount, 0);
    const masPercent = totalAmount > 0 ? Math.round((masAmount / totalAmount) * 100) : 0;
    const masTransactionIds = mergeTransactionIds(otroCategories);
    const masCount = masTransactionIds.size;
    const masItemCount = otroCategories.reduce((sum, c) => sum + (c.itemCount || 0), 0);

    displayCategories.push(createMasEntry({
      amount: masAmount,
      count: masCount,
      itemCount: masItemCount,
      percent: masPercent,
      categoryCount: otroCategories.length,
      transactionIds: masTransactionIds,
    }));
  }

  const canExpand = otroCategories.length > 1;
  const canCollapse = expandedCount > 0;

  return { displayCategories, otroCategories, canExpand, canCollapse };
}

// ============================================================================
// Product Key Builder
// ============================================================================

/**
 * Build a normalized unique product key from item name and merchant.
 * Used for counting unique products across transactions.
 *
 * @param itemName - The item/product name
 * @param merchant - The merchant/store name
 * @returns Normalized "name::merchant" key for Set-based deduplication
 */
export function buildProductKey(itemName: string, merchant: string): string {
  const normalizedName = (itemName || 'Unknown').toLowerCase().trim().replace(/\s+/g, ' ');
  const normalizedMerchant = (merchant || 'unknown').toLowerCase().trim().replace(/\s+/g, ' ');
  return `${normalizedName}::${normalizedMerchant}`;
}
