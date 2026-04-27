/**
 * TrendsView Treemap & Trend Grouping Helpers
 *
 * Story 15-TD-5: Split from helpers.ts
 *
 * Treemap display logic (threshold grouping with "Mas" aggregation)
 * and trend category grouping for sparklines.
 */

import { getCategoryPillColors } from '@/config/categoryColors';
import { applyTreemapGrouping, type MasEntryFactory } from '@/utils/categoryAggregation';
import { calculateChange } from '@features/analytics/utils/periodComparison';
import type { CategoryData, TrendData } from './types';

/**
 * Apply treemap display logic to category data:
 * 1. All categories >10%
 * 2. First category <=10% (highest below threshold)
 * 3. "Otro" aggregating all remaining categories
 *
 * @param allCategories - All category data sorted by value descending
 * @param expandedCount - Number of additional categories to show from "Otro" (0 = collapsed)
 */
export function computeTreemapCategories(
    allCategories: CategoryData[],
    expandedCount: number
): { displayCategories: CategoryData[]; otroCategories: CategoryData[]; canExpand: boolean; canCollapse: boolean } {
    // Map CategoryData (value) to MasGroupable (amount) for shared utility
    const mapped = allCategories.map(c => ({ ...c, amount: c.value }));
    const masColors = getCategoryPillColors('Otro');

    const createMas: MasEntryFactory<CategoryData & { amount: number }> = (stats) => ({
        name: 'Más',
        value: stats.amount,
        amount: stats.amount,
        count: stats.count,
        itemCount: stats.itemCount,
        color: masColors.bg,
        fgColor: masColors.fg,
        percent: stats.percent,
        categoryCount: stats.categoryCount,
        transactionIds: stats.transactionIds,
    });

    const result = applyTreemapGrouping(mapped, expandedCount, createMas);

    // Strip the temporary `amount` field from results
    return {
        displayCategories: result.displayCategories.map(({ amount: _, ...rest }) => rest),
        otroCategories: result.otroCategories.map(({ amount: _, ...rest }) => rest),
        canExpand: result.canExpand,
        canCollapse: result.canCollapse,
    };
}

/**
 * Story 14.13.2: Compute trend categories with "Mas" grouping for sparklines section
 * Similar to computeTreemapCategories but works with TrendData and preserves sparkline data
 *
 * @param allTrends - All trend data sorted by value descending
 * @param expandedCount - Number of additional categories to show from "Mas" (0 = collapsed)
 */
export function computeTrendCategories(
    allTrends: TrendData[],
    expandedCount: number
): { displayTrends: TrendData[]; otroTrends: TrendData[]; canExpand: boolean; canCollapse: boolean } {
    if (allTrends.length === 0) {
        return { displayTrends: [], otroTrends: [], canExpand: false, canCollapse: false };
    }

    // Helper to check if category is aggregated "Mas" group (not the real "Otro" category)
    const isAggregatedGroup = (name: string) => name === 'Más' || name === 'More';

    // Separate categories by threshold (excluding aggregated "Mas" group from previous computations)
    const aboveThreshold = allTrends.filter(t => t.percent > 10 && !isAggregatedGroup(t.name));
    const belowThreshold = allTrends.filter(t => t.percent <= 10 && !isAggregatedGroup(t.name));

    // Start with all categories above 10%
    const displayTrends: TrendData[] = [...aboveThreshold];

    // Add first category below 10% if exists
    if (belowThreshold.length > 0) {
        displayTrends.push(belowThreshold[0]);
    }

    // Add expanded categories from "Mas"
    const expandedTrends = belowThreshold.slice(1, 1 + expandedCount);
    displayTrends.push(...expandedTrends);

    // Remaining categories go into "Mas"
    const otroTrends = belowThreshold.slice(1 + expandedCount);

    // If exactly 1 category would go into "Mas", show it directly instead
    if (otroTrends.length === 1) {
        displayTrends.push(otroTrends[0]);
    } else if (otroTrends.length > 1) {
        // Multiple categories: aggregate into "Mas"
        const masValue = otroTrends.reduce((sum, t) => sum + t.value, 0);
        const totalValue = allTrends.reduce((sum, t) => sum + t.value, 0);
        const masPercent = totalValue > 0 ? Math.round((masValue / totalValue) * 100) : 0;

        // Calculate unique transaction count by merging transaction ID sets
        const masTransactionIds = new Set<string>();
        otroTrends.forEach(t => {
            if (t.transactionIds) {
                t.transactionIds.forEach(id => masTransactionIds.add(id));
            } else {
                for (let i = 0; i < t.count; i++) {
                    masTransactionIds.add(`${t.name}-${i}`);
                }
            }
        });
        const masCount = masTransactionIds.size;

        // Sum item counts for "Mas" group
        const masItemCount = otroTrends.reduce((sum, t) => sum + (t.itemCount || 0), 0);

        // Calculate aggregate previous value and change
        const masPreviousValue = otroTrends.reduce((sum, t) => sum + (t.previousValue || 0), 0);
        const changeResult = calculateChange(masValue, masPreviousValue);

        // Aggregate sparkline data by summing values for each point (sparkline is number[])
        const aggregatedSparkline: number[] = [];
        if (otroTrends.length > 0 && otroTrends[0].sparkline?.length) {
            const sparklineLength = otroTrends[0].sparkline.length;
            for (let i = 0; i < sparklineLength; i++) {
                let valueSum = 0;
                otroTrends.forEach(t => {
                    if (t.sparkline?.[i] !== undefined) {
                        valueSum += t.sparkline[i];
                    }
                });
                aggregatedSparkline.push(valueSum);
            }
        }

        // Use gray color for aggregated "Mas" group
        const masColors = getCategoryPillColors('Otro');
        displayTrends.push({
            name: 'Más',
            value: masValue,
            count: masCount,
            itemCount: masItemCount,
            color: masColors.bg,
            fgColor: masColors.fg,
            percent: masPercent,
            categoryCount: otroTrends.length,
            transactionIds: masTransactionIds,
            sparkline: aggregatedSparkline,
            change: changeResult.percent,
            previousValue: masPreviousValue,
            changeDirection: changeResult.direction,
        });
    }

    // Determine expand/collapse state (only if 2+ categories would go to Mas)
    const canExpand = otroTrends.length > 1;
    const canCollapse = expandedCount > 0;

    return { displayTrends, otroTrends, canExpand, canCollapse };
}
