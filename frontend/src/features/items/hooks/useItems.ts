/**
 * useItems Hook
 *
 * Story 14.31: Items History View
 * Epic 14: Core Implementation
 *
 * Aggregates and filters line items from transactions.
 * Provides flat list of all purchased items across all transactions.
 *
 * Features:
 * - Flattens transaction.items[] arrays into FlattenedItem[]
 * - Filters by item category, date range, search term
 * - Sorts by transaction date (newest first by default)
 * - Pagination support via filteredItems.slice()
 *
 * @example
 * ```tsx
 * const { filteredItems, totalCount, setFilters, setSearchTerm } = useItems(transactions);
 * ```
 */

import { useMemo, useState, useCallback } from 'react';
import type { Transaction } from '@/types/transaction';
import type { FlattenedItem, ItemFilters, UseItemsResult, AggregatedItem } from '@/types/item';
import { normalizeItemCategory } from '@/utils/categoryNormalizer';

// ============================================================================
// Flattening Logic
// ============================================================================

/**
 * Flatten all items from transactions into a single array.
 * Each item is enriched with parent transaction context.
 *
 * @param transactions - Array of transactions with items
 * @returns Array of flattened items
 */
export function flattenTransactionItems(transactions: Transaction[]): FlattenedItem[] {
    const items: FlattenedItem[] = [];

    for (const tx of transactions) {
        if (!tx.items || tx.items.length === 0) continue;
        if (!tx.id) continue; // Skip transactions without ID

        for (let i = 0; i < tx.items.length; i++) {
            const item = tx.items[i];
            const flatItem: FlattenedItem = {
                // Unique ID for the flattened item
                id: `${tx.id}-${i}`,

                // Item data
                name: item.name,
                totalPrice: item.totalPrice,
                unitPrice: item.unitPrice,
                qty: item.qty ?? 1,
                category: item.category,
                subcategory: item.subcategory,

                // Parent transaction context
                transactionId: tx.id,
                transactionDate: tx.date,
                transactionTime: tx.time,
                merchantName: tx.merchant,
                merchantAlias: tx.alias,
                merchantCategory: tx.category,
                city: tx.city,
                country: tx.country,
                currency: tx.currency,
            };
            items.push(flatItem);
        }
    }

    return items;
}

// ============================================================================
// Filtering Logic
// ============================================================================

/**
 * Check if an item matches the category filter.
 * Supports multi-select via comma-separated values.
 *
 * @param item - Flattened item to check
 * @param categoryFilter - Category filter string (may be comma-separated)
 * @returns True if item matches the filter
 */
function matchesCategoryFilter(item: FlattenedItem, categoryFilter?: string): boolean {
    if (!categoryFilter) return true;

    // Normalize item category (handles legacy names)
    const normalizedItemCategory = normalizeItemCategory(item.category || 'Other');

    // Check if filter is multi-select
    const categories = categoryFilter.split(',').map(c => normalizeItemCategory(c.trim()));

    // Item must match at least one of the selected categories
    return categories.includes(normalizedItemCategory);
}

/**
 * Check if an item matches the date range filter.
 *
 * @param item - Flattened item to check
 * @param dateRange - Date range filter
 * @returns True if item's transaction date is within range
 */
function matchesDateRangeFilter(
    item: FlattenedItem,
    dateRange?: { start: string; end: string }
): boolean {
    if (!dateRange) return true;

    const itemDate = item.transactionDate;
    return itemDate >= dateRange.start && itemDate <= dateRange.end;
}

/**
 * Check if an item matches the search term (fuzzy match on item name).
 *
 * @param item - Flattened item to check
 * @param searchTerm - Search term to match
 * @returns True if item name contains the search term
 */
function matchesSearchTerm(item: FlattenedItem, searchTerm?: string): boolean {
    if (!searchTerm || searchTerm.trim() === '') return true;

    const term = searchTerm.toLowerCase().trim();
    const itemName = item.name.toLowerCase();

    // Simple substring match for now
    // Could be enhanced with fuse.js for fuzzy matching
    return itemName.includes(term);
}

/**
 * Check if an item matches the merchant filter.
 *
 * @param item - Flattened item to check
 * @param merchantName - Merchant name filter
 * @returns True if item's merchant matches
 */
function matchesMerchantFilter(item: FlattenedItem, merchantName?: string): boolean {
    if (!merchantName) return true;

    const term = merchantName.toLowerCase().trim();
    const merchant = item.merchantName.toLowerCase();
    const alias = item.merchantAlias?.toLowerCase() || '';

    return merchant.includes(term) || alias.includes(term);
}

/**
 * Check if an item matches the city filter.
 *
 * @param item - Flattened item to check
 * @param city - City filter
 * @returns True if item's city matches
 */
function matchesCityFilter(item: FlattenedItem, city?: string): boolean {
    if (!city) return true;
    if (!item.city) return false;

    return item.city.toLowerCase() === city.toLowerCase();
}

/**
 * Apply all filters to items array.
 *
 * @param items - Array of flattened items
 * @param filters - Filter state
 * @param searchTerm - Search term (handled separately for debouncing)
 * @returns Filtered array of items
 */
export function filterItems(
    items: FlattenedItem[],
    filters: ItemFilters,
    searchTerm: string
): FlattenedItem[] {
    return items.filter(item => {
        if (!matchesCategoryFilter(item, filters.category)) return false;
        if (!matchesDateRangeFilter(item, filters.dateRange)) return false;
        if (!matchesSearchTerm(item, searchTerm)) return false;
        if (!matchesMerchantFilter(item, filters.merchantName)) return false;
        if (!matchesCityFilter(item, filters.city)) return false;
        return true;
    });
}

// ============================================================================
// Sorting Logic
// ============================================================================

/**
 * Sort items by transaction date (newest first by default).
 * Items from the same transaction maintain their original order.
 *
 * @param items - Array of flattened items
 * @param direction - Sort direction ('desc' for newest first, 'asc' for oldest first)
 * @returns Sorted array of items
 */
export function sortItemsByDate(
    items: FlattenedItem[],
    direction: 'asc' | 'desc' = 'desc'
): FlattenedItem[] {
    return [...items].sort((a, b) => {
        const dateA = new Date(a.transactionDate).getTime();
        const dateB = new Date(b.transactionDate).getTime();

        if (direction === 'desc') {
            return dateB - dateA;
        }
        return dateA - dateB;
    });
}

/**
 * Sort items by price.
 *
 * @param items - Array of flattened items
 * @param direction - Sort direction ('desc' for highest first)
 * @returns Sorted array of items
 */
export function sortItemsByPrice(
    items: FlattenedItem[],
    direction: 'asc' | 'desc' = 'desc'
): FlattenedItem[] {
    return [...items].sort((a, b) => {
        if (direction === 'desc') {
            return b.totalPrice - a.totalPrice;
        }
        return a.totalPrice - b.totalPrice;
    });
}

/**
 * Sort items by name (alphabetically).
 *
 * @param items - Array of flattened items
 * @param direction - Sort direction ('asc' for A-Z)
 * @returns Sorted array of items
 */
export function sortItemsByName(
    items: FlattenedItem[],
    direction: 'asc' | 'desc' = 'asc'
): FlattenedItem[] {
    return [...items].sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();

        if (direction === 'asc') {
            return nameA.localeCompare(nameB);
        }
        return nameB.localeCompare(nameA);
    });
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Default empty filters state.
 */
const defaultFilters: ItemFilters = {};

/**
 * Hook for working with flattened items from transactions.
 *
 * @param transactions - Array of transactions to extract items from
 * @param isLoading - Loading state from parent (e.g., from useTransactions)
 * @returns UseItemsResult with items, filters, and helper functions
 */
export function useItems(
    transactions: Transaction[],
    isLoading: boolean = false
): UseItemsResult {
    // Filter state
    const [filters, setFilters] = useState<ItemFilters>(defaultFilters);
    const [searchTerm, setSearchTerm] = useState('');

    // Flatten all items from transactions (memoized)
    const items = useMemo(() => {
        const flattened = flattenTransactionItems(transactions);
        // Sort by date (newest first) by default
        return sortItemsByDate(flattened, 'desc');
    }, [transactions]);

    // Apply filters (memoized)
    const filteredItems = useMemo(() => {
        return filterItems(items, filters, searchTerm);
    }, [items, filters, searchTerm]);

    // Clear all filters
    const clearFilters = useCallback(() => {
        setFilters(defaultFilters);
        setSearchTerm('');
    }, []);

    return {
        items,
        filteredItems,
        totalCount: items.length,
        filteredCount: filteredItems.length,
        isLoading,
        filters,
        setFilters,
        searchTerm,
        setSearchTerm,
        clearFilters,
    };
}

// ============================================================================
// Grouping Utilities
// ============================================================================

/**
 * Group items by transaction date for display.
 * Returns a Map with date string keys and arrays of items.
 *
 * @param items - Array of flattened items
 * @returns Map of date -> items[]
 */
export function groupItemsByDate(items: FlattenedItem[]): Map<string, FlattenedItem[]> {
    const groups = new Map<string, FlattenedItem[]>();

    for (const item of items) {
        const date = item.transactionDate;
        if (!groups.has(date)) {
            groups.set(date, []);
        }
        groups.get(date)!.push(item);
    }

    return groups;
}

/**
 * Group items by category for display.
 * Returns a Map with category string keys and arrays of items.
 *
 * @param items - Array of flattened items
 * @returns Map of category -> items[]
 */
export function groupItemsByCategory(items: FlattenedItem[]): Map<string, FlattenedItem[]> {
    const groups = new Map<string, FlattenedItem[]>();

    for (const item of items) {
        const category = normalizeItemCategory(item.category || 'Other');
        if (!groups.has(category)) {
            groups.set(category, []);
        }
        groups.get(category)!.push(item);
    }

    return groups;
}

/**
 * Calculate total amount for an array of items.
 *
 * @param items - Array of flattened items
 * @returns Total price of all items
 */
export function calculateItemsTotal(items: FlattenedItem[]): number {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
}

// ============================================================================
// Item Aggregation
// ============================================================================

/**
 * Normalize item name for grouping purposes.
 * - Lowercase
 * - Trim whitespace
 * - Collapse multiple spaces
 *
 * @param name - Item name to normalize
 * @returns Normalized name for grouping
 */
export function normalizeItemNameForGrouping(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
}

/**
 * Aggregate items by normalized name + merchant.
 * Groups multiple purchases of the same product together.
 *
 * Story 14.31 Session 2: Aggregate view for items.
 *
 * @param items - Array of flattened items
 * @returns Array of aggregated items, sorted by total amount (highest first)
 */
export function aggregateItems(items: FlattenedItem[]): AggregatedItem[] {
    // Group by normalized name + merchant
    const groups = new Map<string, FlattenedItem[]>();

    for (const item of items) {
        const normalizedName = normalizeItemNameForGrouping(item.name);
        const normalizedMerchant = normalizeItemNameForGrouping(item.merchantName || 'unknown');
        const key = `${normalizedName}::${normalizedMerchant}`;

        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(item);
    }

    // Convert groups to AggregatedItems
    const aggregated: AggregatedItem[] = [];

    for (const [key, groupItems] of groups) {
        // Find the most common name variant (for display)
        const nameCounts = new Map<string, number>();
        for (const item of groupItems) {
            nameCounts.set(item.name, (nameCounts.get(item.name) || 0) + 1);
        }
        let displayName = groupItems[0].name;
        let maxCount = 0;
        for (const [name, count] of nameCounts) {
            if (count > maxCount) {
                maxCount = count;
                displayName = name;
            }
        }

        // Get unique transaction IDs
        const transactionIds = [...new Set(groupItems.map(item => item.transactionId))];

        // Calculate totals
        const totalAmount = groupItems.reduce((sum, item) => sum + item.totalPrice, 0);
        const purchaseCount = groupItems.reduce((sum, item) => sum + (item.qty || 1), 0);

        // Find most recent purchase date
        const sortedByDate = [...groupItems].sort((a, b) =>
            b.transactionDate.localeCompare(a.transactionDate)
        );
        const lastPurchaseDate = sortedByDate[0].transactionDate;

        // Get category from first item (they should all be the same)
        const firstItem = groupItems[0];

        const aggregatedItem: AggregatedItem = {
            id: key,
            normalizedName: normalizeItemNameForGrouping(firstItem.name),
            displayName,
            merchantName: firstItem.merchantName,
            merchantAlias: firstItem.merchantAlias,
            category: firstItem.category as string | undefined,
            subcategory: firstItem.subcategory,
            totalAmount,
            purchaseCount,
            transactionCount: transactionIds.length,
            transactionIds,
            lastPurchaseDate,
            averagePrice: totalAmount / purchaseCount,
            sourceItems: groupItems,
        };

        aggregated.push(aggregatedItem);
    }

    // Sort by total amount (highest first)
    return aggregated.sort((a, b) => b.totalAmount - a.totalAmount);
}

/**
 * Sort aggregated items by different criteria.
 *
 * @param items - Array of aggregated items
 * @param sortBy - Sort criteria
 * @param direction - Sort direction
 * @returns Sorted array
 */
export function sortAggregatedItems(
    items: AggregatedItem[],
    sortBy: 'totalAmount' | 'purchaseCount' | 'transactionCount' | 'name' | 'lastPurchaseDate' = 'totalAmount',
    direction: 'asc' | 'desc' = 'desc'
): AggregatedItem[] {
    return [...items].sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
            case 'totalAmount':
                comparison = a.totalAmount - b.totalAmount;
                break;
            case 'purchaseCount':
                comparison = a.purchaseCount - b.purchaseCount;
                break;
            case 'transactionCount':
                comparison = a.transactionCount - b.transactionCount;
                break;
            case 'name':
                comparison = a.displayName.localeCompare(b.displayName);
                break;
            case 'lastPurchaseDate':
                comparison = a.lastPurchaseDate.localeCompare(b.lastPurchaseDate);
                break;
        }

        return direction === 'desc' ? -comparison : comparison;
    });
}

// ============================================================================
// Available Filters Extraction
// ============================================================================

/**
 * Available filter options extracted from items data.
 */
export interface AvailableItemFilters {
    /** Unique item categories */
    categories: string[];
    /** Unique merchant names */
    merchants: string[];
    /** Unique cities */
    cities: string[];
    /** Date range of items */
    dateRange: { earliest: string; latest: string } | null;
}

/**
 * Extract available filter options from items.
 * Used to populate dropdown menus.
 *
 * @param items - Array of flattened items
 * @returns Available filter options
 */
export function extractAvailableItemFilters(items: FlattenedItem[]): AvailableItemFilters {
    const categoriesSet = new Set<string>();
    const merchantsSet = new Set<string>();
    const citiesSet = new Set<string>();
    let earliest: string | null = null;
    let latest: string | null = null;

    for (const item of items) {
        // Categories
        const category = normalizeItemCategory(item.category || 'Other');
        categoriesSet.add(category);

        // Merchants
        merchantsSet.add(item.merchantAlias || item.merchantName);

        // Cities
        if (item.city) {
            citiesSet.add(item.city);
        }

        // Date range
        const date = item.transactionDate;
        if (!earliest || date < earliest) {
            earliest = date;
        }
        if (!latest || date > latest) {
            latest = date;
        }
    }

    return {
        categories: Array.from(categoriesSet).sort(),
        merchants: Array.from(merchantsSet).sort(),
        cities: Array.from(citiesSet).sort(),
        dateRange: earliest && latest ? { earliest, latest } : null,
    };
}

export default useItems;
