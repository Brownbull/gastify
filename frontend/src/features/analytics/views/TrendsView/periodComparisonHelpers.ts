/**
 * Period Comparison Helpers
 *
 * Story 15-TD-5b: Extracted from TrendsView.tsx
 *
 * Pure computation functions for period-over-period comparison:
 * - computePreviousPeriodTotals: Aggregates spending by category from previous period
 * - computeDailySparkline: Cumulative daily sparkline data for a category
 *
 * These are pure functions with no React dependencies.
 */

import { normalizeItemCategory } from '@/utils/categoryNormalizer';
import {
    STORE_CATEGORY_GROUPS,
    ITEM_CATEGORY_GROUPS,
    ITEM_CATEGORY_TO_KEY,
} from '@/config/categoryColors';
import type { Transaction } from '@/types/transaction';
import type { DonutViewMode, TimePeriod, CurrentPeriod } from './types';

/**
 * Story 14.13.2: Compute previous period category totals for comparison
 * Aggregates spending by category from previous period transactions
 */
export function computePreviousPeriodTotals(
    previousPeriodTransactions: Transaction[],
    donutViewMode: DonutViewMode
): Map<string, number> {
    const totals = new Map<string, number>();

    // Helper to get category based on view mode
    const getCategory = (tx: Transaction): string | null => {
        switch (donutViewMode) {
            case 'store-groups': {
                const storeCat = tx.category || 'Unknown';
                // Look up the group for this store category
                // STORE_CATEGORY_GROUPS maps category -> group (e.g., 'Supermarket' -> 'supermercados')
                return STORE_CATEGORY_GROUPS[storeCat as keyof typeof STORE_CATEGORY_GROUPS] || 'otros';
            }
            case 'store-categories':
                return tx.category || 'Unknown';
            case 'item-groups': {
                // Aggregate item categories to groups
                const itemGroups = new Set<string>();
                tx.items?.forEach(item => {
                    // TransactionItem uses 'category' not 'itemCategory'
                    const itemCat = normalizeItemCategory((item.category as string) || 'Unknown');
                    const groupKey = ITEM_CATEGORY_TO_KEY[itemCat as keyof typeof ITEM_CATEGORY_TO_KEY];
                    if (groupKey) {
                        // ITEM_CATEGORY_GROUPS maps itemCategoryKey -> group (e.g., 'Produce' -> 'food-fresh')
                        const group = ITEM_CATEGORY_GROUPS[groupKey as keyof typeof ITEM_CATEGORY_GROUPS];
                        if (group) {
                            itemGroups.add(group);
                        }
                    }
                });
                // Return first group found (simplified - actual implementation uses all items)
                return itemGroups.size > 0 ? Array.from(itemGroups)[0] : null;
            }
            case 'item-categories': {
                // Use first item's category (simplified)
                const firstItem = tx.items?.[0];
                if (firstItem) {
                    // TransactionItem uses 'category' not 'itemCategory'
                    return normalizeItemCategory((firstItem.category as string) || 'Unknown');
                }
                return null;
            }
            default:
                return tx.category || 'Unknown';
        }
    };

    // For store-based modes, aggregate by transaction
    if (donutViewMode === 'store-groups' || donutViewMode === 'store-categories') {
        previousPeriodTransactions.forEach(tx => {
            const category = getCategory(tx);
            if (category) {
                totals.set(category, (totals.get(category) || 0) + tx.total);
            }
        });
    } else {
        // For item-based modes, aggregate by items
        previousPeriodTransactions.forEach(tx => {
            tx.items?.forEach(item => {
                let category: string | null = null;

                if (donutViewMode === 'item-groups') {
                    // TransactionItem uses 'category' not 'itemCategory', and 'qty' not 'quantity'
                    const itemCat = normalizeItemCategory((item.category as string) || 'Unknown');
                    const groupKey = ITEM_CATEGORY_TO_KEY[itemCat as keyof typeof ITEM_CATEGORY_TO_KEY];
                    if (groupKey) {
                        // ITEM_CATEGORY_GROUPS maps itemCategoryKey -> group (e.g., 'Produce' -> 'food-fresh')
                        category = ITEM_CATEGORY_GROUPS[groupKey as keyof typeof ITEM_CATEGORY_GROUPS] || null;
                    }
                } else {
                    // TransactionItem uses 'category' not 'itemCategory'
                    category = normalizeItemCategory((item.category as string) || 'Unknown');
                }

                if (category) {
                    // Story 18-8: totalPrice is already the line total (unitPrice * qty)
                    const itemTotal = item.totalPrice;
                    totals.set(category, (totals.get(category) || 0) + itemTotal);
                }
            });
        });
    }

    return totals;
}

/**
 * Story 14.13.2: Compute cumulative daily sparkline data for a category
 * Shows cumulative spending throughout the current period (X=days, Y=cumulative amount)
 * Each point represents the running total up to that day
 * - Week: 7 points (one per day)
 * - Month: up to 31 points (one per day)
 * - Quarter: ~90 points (one per day, may downsample)
 * - Year: ~365 points (downsampled to ~30 points)
 */
export function computeDailySparkline(
    categoryName: string,
    currentTxs: Transaction[],
    donutViewMode: DonutViewMode,
    timePeriod: TimePeriod,
    currentPeriod: CurrentPeriod
): number[] {
    // Helper to get category value from transaction based on view mode
    const getCategoryValue = (tx: Transaction): { match: boolean; value: number } => {
        switch (donutViewMode) {
            case 'store-groups': {
                const storeCat = tx.category || 'Unknown';
                const group = STORE_CATEGORY_GROUPS[storeCat as keyof typeof STORE_CATEGORY_GROUPS];
                if (group === categoryName) {
                    return { match: true, value: tx.total };
                }
                return { match: false, value: 0 };
            }
            case 'store-categories':
                return tx.category === categoryName
                    ? { match: true, value: tx.total }
                    : { match: false, value: 0 };
            case 'item-groups':
            case 'item-categories':
                // For item-based modes, sum up matching items
                let itemTotal = 0;
                tx.items?.forEach(item => {
                    const itemCat = normalizeItemCategory((item.category as string) || 'Unknown');
                    if (donutViewMode === 'item-groups') {
                        const groupKey = ITEM_CATEGORY_TO_KEY[itemCat as keyof typeof ITEM_CATEGORY_TO_KEY];
                        if (groupKey) {
                            const itemGroup = ITEM_CATEGORY_GROUPS[groupKey as keyof typeof ITEM_CATEGORY_GROUPS];
                            if (itemGroup === categoryName) {
                                itemTotal += item.totalPrice;
                            }
                        }
                    } else if (itemCat === categoryName) {
                        itemTotal += item.totalPrice;
                    }
                });
                return { match: itemTotal > 0, value: itemTotal };
            default:
                return { match: false, value: 0 };
        }
    };

    // Get the actual number of days in the current period
    const getDaysInCurrentPeriod = (): number => {
        switch (timePeriod) {
            case 'week': return 7;
            case 'month': {
                // Get actual days in the selected month
                const year = currentPeriod.year;
                const month = currentPeriod.month || 1;
                return new Date(year, month, 0).getDate();
            }
            case 'quarter': {
                // Get days in the quarter (sum of 3 months)
                const year = currentPeriod.year;
                const quarter = currentPeriod.quarter || 1;
                const startMonth = (quarter - 1) * 3;
                let days = 0;
                for (let m = 0; m < 3; m++) {
                    days += new Date(year, startMonth + m + 1, 0).getDate();
                }
                return days;
            }
            case 'year': return 365; // Will be downsampled
            default: return 30;
        }
    };

    const daysInPeriod = getDaysInCurrentPeriod();

    // Create daily buckets for current period only
    const dailyTotals = new Array(daysInPeriod).fill(0);

    // Process current period transactions - map each to its day within the period
    currentTxs.forEach(tx => {
        const result = getCategoryValue(tx);
        if (result.match) {
            const txDate = new Date(tx.date);
            let dayIndex: number;

            switch (timePeriod) {
                case 'week': {
                    // Day of week (0-6)
                    dayIndex = txDate.getDay();
                    break;
                }
                case 'month': {
                    // Day of month (0-indexed)
                    dayIndex = txDate.getDate() - 1;
                    break;
                }
                case 'quarter': {
                    // Day within the quarter
                    const txMonth = txDate.getMonth();
                    const quarterStartMonth = ((currentPeriod.quarter || 1) - 1) * 3;
                    let dayOfQuarter = txDate.getDate() - 1;
                    // Add days from previous months in the quarter
                    for (let m = quarterStartMonth; m < txMonth; m++) {
                        dayOfQuarter += new Date(currentPeriod.year, m + 1, 0).getDate();
                    }
                    dayIndex = dayOfQuarter;
                    break;
                }
                case 'year': {
                    // Day of year (0-364)
                    const startOfYear = new Date(currentPeriod.year, 0, 1);
                    dayIndex = Math.floor((txDate.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
                    break;
                }
                default:
                    dayIndex = txDate.getDate() - 1;
            }

            // Ensure index is within bounds
            dayIndex = Math.max(0, Math.min(dayIndex, daysInPeriod - 1));
            dailyTotals[dayIndex] += result.value;
        }
    });

    // Convert daily totals to cumulative totals
    const cumulativeTotals: number[] = [];
    let runningTotal = 0;
    for (let i = 0; i < dailyTotals.length; i++) {
        runningTotal += dailyTotals[i];
        cumulativeTotals.push(runningTotal);
    }

    // Downsample to reasonable number of points for display (max 20 points)
    const maxPoints = 20;
    if (cumulativeTotals.length <= maxPoints) {
        return cumulativeTotals;
    }

    // For cumulative data, sample evenly to preserve the shape
    const sampledData: number[] = [];
    const step = (cumulativeTotals.length - 1) / (maxPoints - 1);
    for (let i = 0; i < maxPoints; i++) {
        const index = Math.round(i * step);
        sampledData.push(cumulativeTotals[index]);
    }

    return sampledData;
}
