/**
 * useRecentScans Hook
 *
 * v9.7.0 Bugfix: Separate query for "Últimos Escaneados" carousel.
 *
 * Real-time subscription to user's most recently SCANNED transactions
 * (ordered by createdAt, not transaction date).
 *
 * Problem solved:
 * The main useTransactions hook orders by transaction date (date field),
 * which excludes recently scanned receipts with old transaction dates
 * (e.g., scanning a May 2025 receipt in January 2026).
 *
 * This hook orders by createdAt (scan timestamp) to ensure newly scanned
 * receipts appear immediately in the "Últimos Escaneados" section.
 *
 * @example
 * ```tsx
 * const recentScans = useRecentScans(user, services);
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
 * Hook for subscribing to user's most recently scanned transactions.
 *
 * @param user - Authenticated Firebase user
 * @param services - Firebase services (db, appId)
 * @returns Array of recent scans (empty if not authenticated)
 */
export function useRecentScans(user: User | null, services: Services | null): Transaction[] {
    const enabled = !!user && !!services;

    // Create the query key (stable reference when deps don't change)
    const queryKey = useMemo(
        () => enabled ? QUERY_KEYS.recentScans(user.uid, services.appId) : ['transactions', 'recentScans', '', ''],
        [enabled, user?.uid, services?.appId]
    );

    // Subscribe to recent scans with React Query caching
    const { data } = useFirestoreSubscription<Transaction[]>(
        queryKey,
        (callback) => {
            if (!services || !user) return () => {};
            const repo = createTransactionRepository({ db: services.db, userId: user.uid, appId: services.appId });
            let cancelled = false;
            const unsubscribe = repo.subscribeRecentScans((docs) => {
                if (cancelled) return;
                const sanitized = sanitizeTransactions(docs);
                callback(sanitized);
            });
            return () => { cancelled = true; unsubscribe(); };
        },
        { enabled }
    );

    // Return empty array if no data (maintains backward compatibility)
    return data ?? [];
}
