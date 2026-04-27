/**
 * useDerivedItems Hook
 *
 * Story 14.31: Items History View
 * Epic 14: Core Implementation
 *
 * React Query-based hook for caching flattened items derived from transactions.
 *
 * Key design decisions:
 * 1. Items are derived from transactions, not fetched separately
 * 2. Uses React Query's caching for memoization and performance
 * 3. Recomputes items only when transactions change
 * 4. Filter/search state managed locally (not in cache)
 *
 * Benefits:
 * - Instant data on navigation (from cache)
 * - Automatic recomputation when transactions update
 * - Shared cache across components
 * - No loading spinner when returning to Items view
 *
 * @example
 * ```tsx
 * const { items, filteredItems, isLoading, setFilters } = useDerivedItems(transactions);
 * ```
 */

import { useMemo, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Transaction } from '@/types/transaction';
import type { FlattenedItem, ItemFilters, UseItemsResult } from '@/types/item';
import {
    flattenTransactionItems,
    filterItems,
    sortItemsByDate,
} from './useItems';

// ============================================================================
// Constants
// ============================================================================

/**
 * Cache key prefix for derived items.
 * Full key pattern: ['items', 'derived', transactionsHash]
 */
const ITEMS_CACHE_PREFIX = 'items-derived';

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Default empty filters state.
 */
const defaultFilters: ItemFilters = {};

/**
 * Hook for working with flattened items from transactions using React Query caching.
 *
 * This hook provides:
 * - Memoized flattening of transaction items
 * - Filter and search state management
 * - Automatic cache invalidation when transactions change
 *
 * @param transactions - Array of transactions (from useTransactions cache)
 * @param isLoading - Loading state from parent (e.g., from useTransactions)
 * @returns UseItemsResult with items, filters, and helper functions
 */
export function useDerivedItems(
    transactions: Transaction[],
    isLoading: boolean = false
): UseItemsResult {
    const queryClient = useQueryClient();

    // Filter state (local, not cached - changes frequently)
    const [filters, setFilters] = useState<ItemFilters>(defaultFilters);
    const [searchTerm, setSearchTerm] = useState('');

    // Create a stable cache key based on transactions content
    // This allows React Query to cache the flattened items
    // Story 14.31 Session 2: Include content hash to detect when items are modified
    const cacheKey = useMemo(() => {
        if (transactions.length === 0) return `${ITEMS_CACHE_PREFIX}-empty`;

        // Create a simple content hash that changes when any item content changes
        // This detects:
        // 1. Transactions added/removed (length changes)
        // 2. Items added/removed (item count changes)
        // 3. Item content modified (name, price changes)
        let contentHash = 0;
        for (const tx of transactions) {
            // Include transaction ID in hash
            contentHash += tx.id?.length || 0;
            // Include each item's name and price in hash
            for (const item of tx.items || []) {
                // Simple string hash: sum of char codes
                const name = item.name || '';
                for (let i = 0; i < name.length; i++) {
                    contentHash += name.charCodeAt(i);
                }
                // Include price (multiplied to make it significant)
                contentHash += Math.floor((item.totalPrice || 0) * 100);
            }
        }

        return `${ITEMS_CACHE_PREFIX}-${transactions.length}-${contentHash}`;
    }, [transactions]);

    // Flatten all items from transactions (memoized)
    // This is the expensive computation we want to cache
    const items = useMemo(() => {
        // Check if we have a cached result for this key
        const cached = queryClient.getQueryData<FlattenedItem[]>([ITEMS_CACHE_PREFIX, cacheKey]);
        if (cached) {
            return cached;
        }

        // Compute flattened items
        const flattened = flattenTransactionItems(transactions);
        // Sort by date (newest first) by default
        const sorted = sortItemsByDate(flattened, 'desc');

        // Store in React Query cache for reuse
        queryClient.setQueryData([ITEMS_CACHE_PREFIX, cacheKey], sorted);

        return sorted;
    }, [transactions, cacheKey, queryClient]);

    // Apply filters (memoized, but not cached - filters change often)
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

export default useDerivedItems;
