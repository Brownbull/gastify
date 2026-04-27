/**
 * usePaginatedTransactions Hook
 *
 * Story 14.27: Transaction Pagination & Lazy Loading
 * Epic 14: Core Implementation
 *
 * Combines real-time subscription (100 recent) with on-demand pagination
 * for older transactions. Uses React Query's useInfiniteQuery for efficient
 * cursor-based pagination.
 *
 * Architecture:
 * 1. Real-time listener (useTransactions) - Most recent 100 transactions
 * 2. Paginated fetch (useInfiniteQuery) - Older transactions on demand
 * 3. Merged result - Deduplicated, sorted by date desc
 *
 * @example
 * ```tsx
 * const {
 *     transactions,    // All loaded transactions (merged)
 *     hasMore,         // More pages available
 *     loadingMore,     // Fetching next page
 *     loadMore,        // Fetch next page
 *     totalLoaded,     // Count of loaded transactions
 *     isAtListenerLimit, // True if listener hit 100 limit (pagination needed)
 * } = usePaginatedTransactions(user, services);
 * ```
 */

import { useMemo, useCallback } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { User } from 'firebase/auth';
import type { PaginationCursor } from '@/repositories/types';
import { Services } from './useAuth';
import { useTransactions } from './useTransactions';
import { QUERY_KEYS } from '../lib/queryKeys';
import {
    createTransactionRepository,
    LISTENER_LIMITS,
    PAGINATION_PAGE_SIZE,
    type TransactionPage,
} from '@/repositories/transactionRepository';
import type { Transaction } from '../types/transaction';
import { getSafeDate, parseStrictNumber } from '../utils/validation';

/**
 * Return type for usePaginatedTransactions hook.
 */
export interface UsePaginatedTransactionsReturn {
    /** All loaded transactions (real-time + paginated), deduplicated and sorted */
    transactions: Transaction[];
    /** True if more pages are available */
    hasMore: boolean;
    /** True while fetching next page */
    loadingMore: boolean;
    /** True during initial load */
    isLoading: boolean;
    /** Fetch next page of transactions */
    loadMore: () => void;
    /** Total count of loaded transactions */
    totalLoaded: number;
    /** True if real-time listener hit its limit (indicates pagination may be needed) */
    isAtListenerLimit: boolean;
    /** Error from pagination fetch (if any) */
    error: Error | null;
    /** Refetch all paginated data */
    refetch: () => void;
}

/**
 * Sanitizes raw Firestore transaction data for paginated results.
 * Ensures dates are valid and numbers are properly parsed.
 */
function sanitizeTransaction(tx: Transaction): Transaction {
    return {
        ...tx,
        date: getSafeDate(tx.date),
        total: parseStrictNumber(tx.total),
        items: Array.isArray(tx.items)
            ? tx.items.map(i => ({
                ...i,
                // TODO(TD-18-8): Remove (i as any).price fallback after Firestore migration (2026-Q2)
                totalPrice: parseStrictNumber(i.totalPrice ?? (i as any).price)
            }))
            : []
    };
}

/**
 * Hook for paginated transaction loading with real-time updates.
 *
 * Combines:
 * - Real-time listener for most recent 100 transactions (live updates)
 * - On-demand pagination for older transactions (lazy loading)
 *
 * @param user - Authenticated Firebase user
 * @param services - Firebase services (db, appId)
 * @returns Paginated transactions interface
 */
export function usePaginatedTransactions(
    user: User | null,
    services: Services | null
): UsePaginatedTransactionsReturn {
    const queryClient = useQueryClient();
    const enabled = !!user && !!services;

    // Real-time subscription for most recent transactions (limited to 100)
    const realtimeTransactions = useTransactions(user, services);

    // Check if we're at the listener limit (indicates pagination may be needed)
    const isAtListenerLimit = realtimeTransactions.length >= LISTENER_LIMITS.TRANSACTIONS;

    // Stable user/app IDs for callbacks (avoids re-renders when undefined)
    const userId = user?.uid ?? '';
    const appId = services?.appId ?? '';

    // Infinite query for paginated older transactions
    const {
        data: paginatedData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: isPaginationLoading,
        error: paginationError,
        refetch,
    } = useInfiniteQuery({
        queryKey: QUERY_KEYS.transactionsPaginated(userId, appId),
        queryFn: async ({ pageParam }): Promise<TransactionPage> => {
            if (!services?.db || !userId) {
                return { transactions: [], cursor: undefined, hasMore: false };
            }

            // pageParam is the cursor (opaque PaginationCursor from previous page)
            const repo = createTransactionRepository({ db: services.db, userId, appId });
            return repo.getPage(pageParam as PaginationCursor, PAGINATION_PAGE_SIZE);
        },
        getNextPageParam: (lastPage): PaginationCursor | undefined => {
            // Return cursor for next page, or undefined if no more pages
            return lastPage.hasMore && lastPage.cursor ? lastPage.cursor : undefined;
        },
        initialPageParam: undefined as PaginationCursor | undefined,
        enabled: enabled && isAtListenerLimit, // Only enable pagination if we hit the listener limit
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 30 * 60 * 1000, // 30 minutes cache
    });

    // Merge real-time transactions with paginated transactions
    const mergedTransactions = useMemo(() => {
        // Start with real-time transactions
        const transactionMap = new Map<string, Transaction>();

        // Add real-time transactions (filter out any without IDs, though this shouldn't happen)
        for (const tx of realtimeTransactions) {
            if (tx.id) {
                transactionMap.set(tx.id, tx);
            }
        }

        // Add paginated transactions (these are older, so they won't duplicate)
        if (paginatedData?.pages) {
            for (const page of paginatedData.pages) {
                for (const tx of page.transactions) {
                    // Only add if has ID and not already in map (real-time takes precedence)
                    if (tx.id && !transactionMap.has(tx.id)) {
                        transactionMap.set(tx.id, sanitizeTransaction(tx));
                    }
                }
            }
        }

        // Convert to array and sort by date descending
        const merged = Array.from(transactionMap.values());
        merged.sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        return merged;
    }, [realtimeTransactions, paginatedData]);

    // Load more handler
    const loadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    // Refetch handler
    const handleRefetch = useCallback(() => {
        // Invalidate paginated cache to force fresh fetch
        queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.transactionsPaginated(userId, appId),
        });
        refetch();
    }, [queryClient, userId, appId, refetch]);

    // Determine if there are more pages available
    // If we haven't started pagination yet but hit listener limit, there are likely more
    const hasMore = isAtListenerLimit && (hasNextPage ?? true);

    // Dev-mode logging for pagination state monitoring (Story 14.27 AC #6)
    if (import.meta.env.DEV) {
        const pagesLoaded = paginatedData?.pages?.length ?? 0;
        if (isAtListenerLimit || pagesLoaded > 0) {
            console.log(
                `[usePaginatedTransactions] state: ` +
                `realtime=${realtimeTransactions.length}, ` +
                `paginated=${paginatedData?.pages?.reduce((sum, p) => sum + p.transactions.length, 0) ?? 0}, ` +
                `merged=${mergedTransactions.length}, ` +
                `pages=${pagesLoaded}, ` +
                `hasMore=${hasMore}, ` +
                `atLimit=${isAtListenerLimit}`
            );
        }
    }

    return {
        transactions: mergedTransactions,
        hasMore,
        loadingMore: isFetchingNextPage,
        isLoading: isPaginationLoading && mergedTransactions.length === 0,
        loadMore,
        totalLoaded: mergedTransactions.length,
        isAtListenerLimit,
        error: paginationError as Error | null,
        refetch: handleRefetch,
    };
}
