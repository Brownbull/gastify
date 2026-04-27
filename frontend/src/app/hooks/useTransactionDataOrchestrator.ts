/**
 * useTransactionDataOrchestrator - Composes transaction, recent scans,
 * and paginated transactions with merge logic.
 *
 * Story 15b-4f: App.tsx fan-out reduction
 */
import { useMemo } from 'react';
import { useTransactions } from '../../hooks/useTransactions';
import { useRecentScans } from '../../hooks/useRecentScans';
import { usePaginatedTransactions } from '../../hooks/usePaginatedTransactions';
import type { Transaction } from '../../types/transaction';
import type { User } from 'firebase/auth';
import type { Services } from '../../contexts/AuthContext';

export function useTransactionDataOrchestrator(
    user: User | null,
    services: Services | null,
) {
    const transactions = useTransactions(user, services);
    // Recent scans sorted by createdAt (for "Últimos Escaneados" - ensures recently scanned
    // receipts appear even if their transaction date is outside the top 100 by date)
    const recentScans = useRecentScans(user, services);

    // HistoryView gets pagination via useHistoryViewData hook internally
    const { transactions: paginatedTransactions } = usePaginatedTransactions(user, services);

    // Merge recentScans into paginatedTransactions for RecentScansView
    const transactionsWithRecentScans = useMemo(() => {
        const txMap = new Map<string, Transaction>();
        for (const tx of paginatedTransactions) {
            if (tx.id) txMap.set(tx.id, tx);
        }
        for (const tx of recentScans) {
            if (tx.id && !txMap.has(tx.id)) {
                txMap.set(tx.id, tx);
            }
        }
        return Array.from(txMap.values());
    }, [paginatedTransactions, recentScans]);

    return {
        transactions,
        recentScans,
        paginatedTransactions,
        transactionsWithRecentScans,
    };
}
