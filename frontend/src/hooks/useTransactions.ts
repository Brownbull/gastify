/**
 * useTransactions Hook
 *
 * Story 14.29: React Query Migration
 * Epic 14: Core Implementation
 *
 * Real-time subscription to user's transactions with React Query caching.
 *
 * Migration from direct onSnapshot to React Query benefits:
 * - Instant data on navigation (from cache)
 * - No loading spinner when returning to a view
 * - Automatic background refresh
 * - Shared cache across components
 *
 * @example
 * ```tsx
 * const transactions = useTransactions(user, services);
 * ```
 */

import { useMemo } from 'react';
import { User } from 'firebase/auth';
import { Services } from './useAuth';
import { useFirestoreSubscription } from './useFirestoreSubscription';
import { QUERY_KEYS } from '../lib/queryKeys';
import { createTransactionRepository } from '@/repositories/transactionRepository';
import { sanitizeTransactions } from '@/repositories/utils';
import type { Transaction } from '../types/transaction';

/**
 * Sorts transactions by date descending (newest first).
 */
function sortByDateDesc(transactions: Transaction[]): Transaction[] {
    return [...transactions].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );
}

/**
 * Hook for subscribing to user's transactions with React Query caching.
 *
 * @param user - Authenticated Firebase user
 * @param services - Firebase services (db, appId)
 * @returns Array of transactions (empty if not authenticated)
 */
export function useTransactions(user: User | null, services: Services | null): Transaction[] {
    const enabled = !!user && !!services;

    // Create the query key (stable reference when deps don't change)
    const queryKey = useMemo(
        () => enabled ? QUERY_KEYS.transactions(user.uid, services.appId) : ['transactions', '', ''],
        [enabled, user?.uid, services?.appId]
    );

    // Subscribe to transactions with React Query caching
    const { data } = useFirestoreSubscription<Transaction[]>(
        queryKey,
        (callback) => {
            if (!services || !user) return () => {};
            const repo = createTransactionRepository({ db: services.db, userId: user.uid, appId: services.appId });
            let cancelled = false;
            const unsubscribe = repo.subscribe((docs) => {
                if (cancelled) return;
                const sanitized = sanitizeTransactions(docs);
                const sorted = sortByDateDesc(sanitized);
                callback(sorted);
            });
            return () => { cancelled = true; unsubscribe(); };
        },
        { enabled }
    );

    // Return empty array if no data (maintains backward compatibility)
    return data ?? [];
}
