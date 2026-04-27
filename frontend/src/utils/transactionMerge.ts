import type { Transaction } from '@/types/transaction';

/**
 * Merge recent scans with paginated transactions, deduplicating by ID.
 * Recent scans appear at the top of the merged array.
 *
 * @param paginatedTransactions - Base paginated transactions
 * @param recentScans - Recent scan transactions to merge (may be null/undefined)
 * @returns Deduplicated merged array with recent scans first
 *
 * @note When recentScans is non-empty, paginated transactions without an `id`
 * are excluded from the result (they cannot be deduplicated). When recentScans
 * is null/undefined/empty, paginatedTransactions is returned as-is.
 */
export function mergeTransactionsWithRecentScans(
    paginatedTransactions: Transaction[],
    recentScans: Transaction[] | null | undefined
): Transaction[] {
    if (!recentScans?.length) return paginatedTransactions;

    const recentIds = new Set(
        recentScans.filter((s) => s.id).map((s) => s.id)
    );

    const filteredPaginated = paginatedTransactions.filter(
        (tx) => tx.id && !recentIds.has(tx.id)
    );

    return [...recentScans, ...filteredPaginated];
}
