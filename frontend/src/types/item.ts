/**
 * Item Types
 *
 * Story 14.31: Items History View
 * Epic 14: Core Implementation
 *
 * Type definitions for flattened items extracted from transactions.
 * Used for the Items view which displays all line items across transactions.
 */

import type { ItemCategory } from '../../shared/schema/categories';

/**
 * Flattened item from a transaction.
 * Contains item data plus parent transaction context for display and navigation.
 */
export interface FlattenedItem {
    /**
     * Unique identifier for the flattened item.
     * Generated as: `${transactionId}-${itemIndex}`
     */
    id: string;

    /**
     * Item name from the receipt.
     */
    name: string;

    /**
     * Item total price (line total = unit price x qty).
     */
    totalPrice: number;

    /**
     * Price per single unit (optional, derived if missing).
     */
    unitPrice?: number;

    /**
     * Quantity purchased (defaults to 1 if not specified).
     */
    qty: number;

    /**
     * Item category (e.g., "Meat & Seafood", "Produce").
     * Uses ItemCategory type from unified schema.
     */
    category?: ItemCategory | string;

    /**
     * Optional subcategory for more specific classification.
     */
    subcategory?: string;

    // ====================================
    // Parent Transaction Context
    // ====================================

    /**
     * ID of the parent transaction.
     */
    transactionId: string;

    /**
     * Date of the parent transaction (YYYY-MM-DD format).
     */
    transactionDate: string;

    /**
     * Time of the parent transaction (HH:mm format).
     */
    transactionTime?: string;

    /**
     * Merchant name from the parent transaction.
     */
    merchantName: string;

    /**
     * Merchant alias (user-defined) from the parent transaction.
     */
    merchantAlias?: string;

    /**
     * Store category from the parent transaction.
     */
    merchantCategory?: string;

    /**
     * City from the parent transaction.
     */
    city?: string;

    /**
     * Country from the parent transaction.
     */
    country?: string;

    /**
     * Currency of the parent transaction.
     */
    currency?: string;
}

/**
 * Aggregated item - groups multiple purchases of the same product.
 * Story 14.31 Session 2: Aggregate view for items.
 */
export interface AggregatedItem {
    /**
     * Unique key for this aggregated item (normalized name + merchant).
     */
    id: string;

    /**
     * Normalized item name used for grouping.
     */
    normalizedName: string;

    /**
     * Display name (most common original name variant).
     */
    displayName: string;

    /**
     * Merchant name where this item was purchased.
     */
    merchantName: string;

    /**
     * Merchant alias (if available).
     */
    merchantAlias?: string;

    /**
     * Item category.
     */
    category?: string;

    /**
     * Item subcategory.
     */
    subcategory?: string;

    /**
     * Total amount spent on this item across all transactions.
     */
    totalAmount: number;

    /**
     * Number of times this item was purchased (sum of quantities).
     */
    purchaseCount: number;

    /**
     * Number of transactions containing this item.
     */
    transactionCount: number;

    /**
     * IDs of transactions containing this item.
     * Used for navigation to filtered transaction list.
     */
    transactionIds: string[];

    /**
     * Most recent purchase date.
     */
    lastPurchaseDate: string;

    /**
     * Average price per unit.
     */
    averagePrice: number;

    /**
     * Original flattened items that were aggregated.
     * Useful for detailed view or duplicate detection.
     */
    sourceItems: FlattenedItem[];
}

/**
 * Filter state for items view.
 * Similar to HistoryFilterState but focused on item-level filtering.
 */
export interface ItemFilters {
    /**
     * Filter by item category (from ITEM_CATEGORIES).
     * Supports multi-select via comma-separated values.
     */
    category?: string;

    /**
     * Filter by parent transaction date range.
     */
    dateRange?: {
        start: string; // YYYY-MM-DD
        end: string;   // YYYY-MM-DD
    };

    /**
     * Search term for item name fuzzy matching.
     */
    searchTerm?: string;

    /**
     * Filter by merchant name.
     */
    merchantName?: string;

    /**
     * Filter by city.
     */
    city?: string;
}

/**
 * Return type for useItems hook.
 */
export interface UseItemsResult {
    /**
     * All flattened items from transactions (unfiltered).
     */
    items: FlattenedItem[];

    /**
     * Items after applying all filters.
     */
    filteredItems: FlattenedItem[];

    /**
     * Total count of unfiltered items.
     */
    totalCount: number;

    /**
     * Count of filtered items.
     */
    filteredCount: number;

    /**
     * Loading state.
     */
    isLoading: boolean;

    /**
     * Current filter state.
     */
    filters: ItemFilters;

    /**
     * Update filters.
     */
    setFilters: (filters: ItemFilters) => void;

    /**
     * Current search term (debounced).
     */
    searchTerm: string;

    /**
     * Update search term.
     */
    setSearchTerm: (term: string) => void;

    /**
     * Clear all filters.
     */
    clearFilters: () => void;
}

/**
 * Navigation payload for navigating to Items view with pre-applied filters.
 * Used when clicking on item categories in Dashboard analytics.
 */
export interface ItemsNavigationPayload {
    /**
     * Pre-select an item category filter.
     */
    category?: string;

    /**
     * Pre-select an item category group filter.
     */
    itemGroup?: string;

    /**
     * Pre-apply temporal filter.
     */
    temporal?: {
        level: 'year' | 'quarter' | 'month' | 'week' | 'day';
        year?: string;
        quarter?: string;
        month?: string;
        week?: number;
        day?: string;
    };

    /**
     * Pre-fill search term.
     */
    searchTerm?: string;

    /**
     * Pre-select merchant filter.
     */
    merchantName?: string;
}
