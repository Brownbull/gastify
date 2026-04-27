/**
 * History View Constants and Pure Helpers
 *
 * Extracted from HistoryView.tsx (Story 15b-2c) for decomposition.
 * Contains page size options, sort configuration, and sort logic.
 */

import type { Transaction } from '@/types/transaction';
import type { SortOption } from '@features/history/components/SortControl';

// ============================================================================
// Page Size
// ============================================================================

/**
 * Story 14.14: Page size options for transaction list pagination.
 * Default is 15 items per page, with options to switch to 30 or 60.
 */
export const PAGE_SIZE_OPTIONS = [15, 30, 60] as const;
export type PageSizeOption = typeof PAGE_SIZE_OPTIONS[number];
export const DEFAULT_PAGE_SIZE: PageSizeOption = 15;

// ============================================================================
// Sort Options
// ============================================================================

/**
 * Story 14.31 Session 3: Sort options for History view.
 * - Date (newest first) - default
 * - Total (highest/lowest)
 * - Store name (A-Z)
 */
export type HistorySortKey = 'date' | 'total' | 'merchant';
export const HISTORY_SORT_OPTIONS: SortOption[] = [
    { key: 'date', labelEn: 'Date', labelEs: 'Fecha' },
    { key: 'total', labelEn: 'Total', labelEs: 'Total' },
    { key: 'merchant', labelEn: 'Store', labelEs: 'Tienda' },
];
export const DEFAULT_HISTORY_SORT_KEY: HistorySortKey = 'date';
export const DEFAULT_HISTORY_SORT_DIRECTION: 'asc' | 'desc' = 'desc';

// ============================================================================
// Sort Logic
// ============================================================================

/**
 * Story 14.31 Session 3: Sort transactions within date groups.
 * When sorting by non-date criteria, items within each date group are sorted.
 */
export function sortTransactionsWithinGroups(
    txs: Transaction[],
    sortBy: HistorySortKey,
    direction: 'asc' | 'desc'
): Transaction[] {
    if (sortBy === 'date') {
        // For date sort, sort all transactions by date
        return [...txs].sort((a, b) => {
            const comparison = a.date.localeCompare(b.date);
            return direction === 'desc' ? -comparison : comparison;
        });
    }

    // For non-date sorts, group by date first, then sort within groups
    const grouped = new Map<string, Transaction[]>();
    for (const tx of txs) {
        const date = tx.date;
        if (!grouped.has(date)) {
            grouped.set(date, []);
        }
        grouped.get(date)!.push(tx);
    }

    // Sort each group by the selected criteria
    for (const [_date, groupTxs] of grouped) {
        groupTxs.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'total':
                    comparison = a.total - b.total;
                    break;
                case 'merchant':
                    comparison = (a.alias || a.merchant).localeCompare(b.alias || b.merchant);
                    break;
            }
            return direction === 'desc' ? -comparison : comparison;
        });
    }

    // Flatten back to array, maintaining date order (newest first by default)
    const sortedDates = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a));
    const result: Transaction[] = [];
    for (const date of sortedDates) {
        result.push(...grouped.get(date)!);
    }
    return result;
}
