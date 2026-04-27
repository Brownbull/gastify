/**
 * useAnalyticsTransactions Hook
 *
 * Unified data source for analytics components.
 * Returns personal transactions for analytics views.
 *
 * @example
 * ```tsx
 * function AnalyticsChart() {
 *   const { transactions } = useAnalyticsTransactions();
 *   return <Chart data={transactions} />;
 * }
 * ```
 */

import { useMemo } from 'react';
import type { Transaction } from '@/types/transaction';

// ============================================================================
// Types
// ============================================================================

/**
 * Options for the useAnalyticsTransactions hook
 */
export interface UseAnalyticsTransactionsOptions {
    /**
     * Personal transactions (from parent/App.tsx).
     */
    personalTransactions: Transaction[];

    /**
     * Shared group transactions (legacy - unused).
     */
    groupTransactions: Transaction[];

    /**
     * Loading state for group transactions
     */
    isGroupLoading?: boolean;

    /**
     * Spending breakdown by member ID (legacy - unused)
     */
    spendingByMember?: Map<string, number>;
}

/**
 * Result from the useAnalyticsTransactions hook
 */
export interface UseAnalyticsTransactionsResult {
    /**
     * The active transactions
     */
    transactions: Transaction[];

    /**
     * Whether currently viewing group data (always false)
     */
    isGroupMode: boolean;

    /**
     * Loading state
     */
    isLoading: boolean;

    /**
     * Group name (always undefined)
     */
    groupName?: string;

    /**
     * Group ID (always undefined)
     */
    groupId?: string;

    /**
     * Group member IDs (always undefined)
     */
    memberIds?: string[];

    /**
     * Spending breakdown by member ID (always undefined)
     */
    spendingByMember?: Map<string, number>;

    /**
     * Context label for analytics UI
     */
    contextLabel: string;

    /**
     * Group icon (always undefined)
     */
    groupIcon?: string;

    /**
     * Group color (always undefined)
     */
    groupColor?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Empty array constant to avoid creating new references */
const EMPTY_TRANSACTIONS: Transaction[] = [];

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook that provides a unified transaction source for analytics.
 * Returns personal transactions.
 *
 * @param options Configuration with personal transaction source
 * @returns Unified analytics data
 */
export function useAnalyticsTransactions(
    options: UseAnalyticsTransactionsOptions
): UseAnalyticsTransactionsResult {
    const {
        personalTransactions,
    } = options;

    // Memoize the result to avoid unnecessary re-renders
    const result = useMemo<UseAnalyticsTransactionsResult>(() => {
        return {
            transactions: personalTransactions || EMPTY_TRANSACTIONS,
            isGroupMode: false,
            isLoading: false,
            groupName: undefined,
            groupId: undefined,
            memberIds: undefined,
            spendingByMember: undefined,
            contextLabel: 'personal',
            groupIcon: undefined,
            groupColor: undefined,
        };
    }, [
        personalTransactions,
    ]);

    return result;
}

