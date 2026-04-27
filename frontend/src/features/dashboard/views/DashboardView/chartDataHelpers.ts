/**
 * Chart Data Helpers for DashboardView
 *
 * Pure functions extracted from DashboardView useMemo computations.
 * These compute radar chart and bump chart data from transactions.
 *
 * Story 15-TD-5b: Extracted from DashboardView to reduce file size.
 */

import type { StoreCategoryGroup, ItemCategoryGroup } from '@/config/categoryColors';
import {
    getCategoryBackgroundAuto,
    getCategoryPillColors,
    getStoreGroupColors,
    getItemGroupColors,
    getCurrentTheme,
    getCurrentMode,
    STORE_CATEGORY_GROUPS,
    ITEM_CATEGORY_GROUPS,
    ITEM_CATEGORY_TO_KEY,
} from '@/config/categoryColors';
import { getCategoryEmoji } from '@/utils/categoryEmoji';
import {
    getStoreCategoryGroupEmoji,
    getItemCategoryGroupEmoji,
    getItemCategoryEmoji,
} from '@/utils/categoryTranslations';
import { normalizeItemCategory } from '@/utils/categoryNormalizer';
import type { TreemapViewMode, Transaction } from './types';

// ============================================================================
// Radar Chart Data
// ============================================================================

export interface RadarCategory {
    name: string;
    currAmount: number;
    prevAmount: number;
    percent: number;
    emoji: string;
    color: string;
}

export interface RadarChartData {
    categories: RadarCategory[];
    maxValue: number;
    sides: number;
    polygonType: string;
    currentMonthIdx: number;
    prevMonthIdx: number;
}

/**
 * Compute radar chart data for the "Mes a Mes" view.
 *
 * Criteria: Categories >10% + first category <=10% + "Otro" catch-all
 * - 3 categories = triangle, 4 = diamond, 5 = pentagon, 6 = hexagon (max)
 * - Minimum 3 categories required
 *
 * @param monthTransactions - Transactions for the selected month
 * @param allTx - All transactions (used to find previous month data)
 * @param selectedMonth - Currently selected month/year
 * @param treemapViewMode - Current view mode for data grouping
 */
export function computeRadarChartData(
    monthTransactions: Transaction[],
    allTx: Transaction[],
    selectedMonth: { year: number; month: number },
    treemapViewMode: TreemapViewMode,
): RadarChartData {
    // Get previous month
    const prevMonth = selectedMonth.month === 0 ? 11 : selectedMonth.month - 1;
    const prevYear = selectedMonth.month === 0 ? selectedMonth.year - 1 : selectedMonth.year;
    const prevMonthStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;

    // Get transactions for current and previous month
    const currMonthTx = monthTransactions;
    const prevMonthTx = allTx.filter(tx => tx.date.startsWith(prevMonthStr));

    // Helper to get emoji based on view mode
    const getEmojiForMode = (name: string): string => {
        switch (treemapViewMode) {
            case 'store-groups':
                return getStoreCategoryGroupEmoji(name as StoreCategoryGroup);
            case 'item-groups':
                return getItemCategoryGroupEmoji(name as ItemCategoryGroup);
            case 'item-categories':
                return getItemCategoryEmoji(name);
            case 'store-categories':
            default:
                return getCategoryEmoji(name);
        }
    };

    const getColorForMode = (name: string): string => {
        const theme = getCurrentTheme();
        const mode = getCurrentMode();
        switch (treemapViewMode) {
            case 'store-groups':
                return getStoreGroupColors(name as StoreCategoryGroup, theme, mode).bg;
            case 'item-groups':
                return getItemGroupColors(name as ItemCategoryGroup, theme, mode).bg;
            case 'store-categories':
            case 'item-categories':
            default:
                return getCategoryBackgroundAuto(name);
        }
    };

    // Aggregate data based on view mode
    const currTotals: Record<string, number> = {};
    const prevTotals: Record<string, number> = {};
    let totalCurrMonth = 0;
    let totalPrevMonth = 0;

    if (treemapViewMode === 'store-categories') {
        currMonthTx.forEach(tx => {
            const cat = tx.category || 'Otro';
            currTotals[cat] = (currTotals[cat] || 0) + tx.total;
            totalCurrMonth += tx.total;
        });
        prevMonthTx.forEach(tx => {
            const cat = tx.category || 'Otro';
            prevTotals[cat] = (prevTotals[cat] || 0) + tx.total;
            totalPrevMonth += tx.total;
        });
    } else if (treemapViewMode === 'store-groups') {
        currMonthTx.forEach(tx => {
            const cat = tx.category || 'Otro';
            const group = STORE_CATEGORY_GROUPS[cat as keyof typeof STORE_CATEGORY_GROUPS] || 'otros';
            currTotals[group] = (currTotals[group] || 0) + tx.total;
            totalCurrMonth += tx.total;
        });
        prevMonthTx.forEach(tx => {
            const cat = tx.category || 'Otro';
            const group = STORE_CATEGORY_GROUPS[cat as keyof typeof STORE_CATEGORY_GROUPS] || 'otros';
            prevTotals[group] = (prevTotals[group] || 0) + tx.total;
            totalPrevMonth += tx.total;
        });
    } else if (treemapViewMode === 'item-categories') {
        currMonthTx.forEach(tx => {
            (tx.items || []).forEach(item => {
                const cat = normalizeItemCategory(item.category || 'Other');
                currTotals[cat] = (currTotals[cat] || 0) + item.totalPrice;
                totalCurrMonth += item.totalPrice;
            });
        });
        prevMonthTx.forEach(tx => {
            (tx.items || []).forEach(item => {
                const cat = normalizeItemCategory(item.category || 'Other');
                prevTotals[cat] = (prevTotals[cat] || 0) + item.totalPrice;
                totalPrevMonth += item.totalPrice;
            });
        });
    } else if (treemapViewMode === 'item-groups') {
        currMonthTx.forEach(tx => {
            (tx.items || []).forEach(item => {
                const cat = normalizeItemCategory(item.category || 'Other');
                const itemKey = ITEM_CATEGORY_TO_KEY[cat as keyof typeof ITEM_CATEGORY_TO_KEY];
                const group = itemKey ? ITEM_CATEGORY_GROUPS[itemKey as keyof typeof ITEM_CATEGORY_GROUPS] : 'otros-item';
                currTotals[group] = (currTotals[group] || 0) + item.totalPrice;
                totalCurrMonth += item.totalPrice;
            });
        });
        prevMonthTx.forEach(tx => {
            (tx.items || []).forEach(item => {
                const cat = normalizeItemCategory(item.category || 'Other');
                const itemKey = ITEM_CATEGORY_TO_KEY[cat as keyof typeof ITEM_CATEGORY_TO_KEY];
                const group = itemKey ? ITEM_CATEGORY_GROUPS[itemKey as keyof typeof ITEM_CATEGORY_GROUPS] : 'otros-item';
                prevTotals[group] = (prevTotals[group] || 0) + item.totalPrice;
                totalPrevMonth += item.totalPrice;
            });
        });
    }

    // Get all unique categories with their percentage of current month budget
    const allCategories = new Set([...Object.keys(currTotals), ...Object.keys(prevTotals)]);
    const otherKey = treemapViewMode === 'item-groups' ? 'otros-item' :
                     treemapViewMode === 'store-groups' ? 'otros' : 'Otro';

    const allCategoriesWithData = Array.from(allCategories)
        .map(name => ({
            name,
            currAmount: currTotals[name] || 0,
            prevAmount: prevTotals[name] || 0,
            percent: totalCurrMonth > 0 ? ((currTotals[name] || 0) / totalCurrMonth) * 100 : 0,
            emoji: getEmojiForMode(name),
            color: getColorForMode(name),
        }))
        .sort((a, b) => b.currAmount - a.currAmount);

    // Apply selection criteria:
    // 1. All categories >10%
    // 2. First category <=10%
    // 3. Everything else goes to "Otro"
    const isOtherCategory = (name: string) => name === otherKey || name === 'Otro' || name === 'Other';
    const significant = allCategoriesWithData.filter(c => c.percent > 10 && !isOtherCategory(c.name));
    const belowThreshold = allCategoriesWithData.filter(c => c.percent <= 10 && !isOtherCategory(c.name));

    let selectedCategories = [...significant];

    // Add first category <=10% if exists
    if (belowThreshold.length > 0) {
        selectedCategories.push(belowThreshold[0]);
    }

    // Aggregate remaining into "Otro" (exclude already selected categories)
    const selectedNames = new Set(selectedCategories.map(c => c.name));
    const remaining = allCategoriesWithData.filter(c => !selectedNames.has(c.name) && !isOtherCategory(c.name));

    // Calculate "Otro" totals from remaining categories + any existing "Otro" transactions
    const existingOtro = allCategoriesWithData.find(c => isOtherCategory(c.name));
    let otroAmount = remaining.reduce((sum, c) => sum + c.currAmount, 0);
    let otroPrevAmount = remaining.reduce((sum, c) => sum + c.prevAmount, 0);
    if (existingOtro) {
        otroAmount += existingOtro.currAmount;
        otroPrevAmount += existingOtro.prevAmount;
    }

    // Always include "Otro" if there's any remaining data
    if (otroAmount > 0 || otroPrevAmount > 0) {
        selectedCategories.push({
            name: otherKey,
            currAmount: otroAmount,
            prevAmount: otroPrevAmount,
            percent: totalCurrMonth > 0 ? (otroAmount / totalCurrMonth) * 100 : 0,
            emoji: getEmojiForMode(otherKey),
            color: '#9ca3af', // Gray for "Otro"
        });
    }

    // Ensure minimum 3 categories (pad with zeros if needed)
    while (selectedCategories.length < 3 && belowThreshold.length > selectedCategories.length - significant.length) {
        const nextCat = belowThreshold[selectedCategories.length - significant.length];
        if (nextCat && !selectedNames.has(nextCat.name)) {
            selectedCategories.splice(selectedCategories.length - 1, 0, nextCat); // Insert before "Otro"
        } else {
            break;
        }
    }

    // Cap at 6 categories maximum (hexagon)
    selectedCategories = selectedCategories.slice(0, 6);

    // Calculate max value for scaling
    const maxValue = Math.max(
        ...selectedCategories.map(c => Math.max(c.currAmount, c.prevAmount)),
        1
    );

    // Determine polygon type based on number of categories
    const sides = selectedCategories.length;
    const polygonType = sides === 3 ? 'triangle' : sides === 4 ? 'diamond' : sides === 5 ? 'pentagon' : 'hexagon';

    return {
        categories: selectedCategories,
        maxValue,
        sides,
        polygonType,
        currentMonthIdx: selectedMonth.month,
        prevMonthIdx: prevMonth,
    };
}

// ============================================================================
// Bump Chart Data
// ============================================================================

export interface BumpChartCategory {
    name: string;
    color: string;
    amounts: number[];
    ranks: number[];
    total: number;
}

export interface BumpChartMonthData {
    year: number;
    month: number;
    isCurrentMonth: boolean;
}

export interface BumpChartData {
    monthData: BumpChartMonthData[];
    categories: BumpChartCategory[];
}

/**
 * Compute bump chart data for the "Ultimos 4 Meses" view.
 *
 * Shows top 4 categories + "Otro" aggregation across the last 4 months.
 *
 * @param allTx - All transactions
 * @param selectedMonth - Currently selected month/year
 * @param treemapViewMode - Current view mode for data grouping
 */
export function computeBumpChartData(
    allTx: Transaction[],
    selectedMonth: { year: number; month: number },
    treemapViewMode: TreemapViewMode,
): BumpChartData {
    // Get last 4 months including current
    const months: BumpChartMonthData[] = [];
    let year = selectedMonth.year;
    let month = selectedMonth.month;

    for (let i = 0; i < 4; i++) {
        months.unshift({
            year,
            month,
            isCurrentMonth: i === 0
        });
        // Go to previous month
        if (month === 0) {
            month = 11;
            year -= 1;
        } else {
            month -= 1;
        }
    }

    // Helper to get color based on view mode
    const getColorForMode = (name: string): string => {
        const theme = getCurrentTheme();
        const mode = getCurrentMode();
        switch (treemapViewMode) {
            case 'store-groups':
                return getStoreGroupColors(name as StoreCategoryGroup, theme, mode).fg;
            case 'item-groups':
                return getItemGroupColors(name as ItemCategoryGroup, theme, mode).fg;
            case 'store-categories':
            case 'item-categories':
            default:
                return getCategoryPillColors(name).fg;
        }
    };

    // Calculate category totals per month
    const categoryRankings: Record<string, { amounts: number[]; color: string }> = {};
    const otherKey = treemapViewMode === 'item-groups' ? 'otros-item' :
                     treemapViewMode === 'store-groups' ? 'otros' : 'Otro';

    months.forEach((m, idx) => {
        const monthStr = `${m.year}-${String(m.month + 1).padStart(2, '0')}`;
        const monthTx = allTx.filter(tx => tx.date.startsWith(monthStr));

        // Aggregate based on view mode
        const totals: Record<string, number> = {};

        if (treemapViewMode === 'store-categories') {
            monthTx.forEach(tx => {
                const cat = tx.category || 'Otro';
                totals[cat] = (totals[cat] || 0) + tx.total;
            });
        } else if (treemapViewMode === 'store-groups') {
            monthTx.forEach(tx => {
                const cat = tx.category || 'Otro';
                const group = STORE_CATEGORY_GROUPS[cat as keyof typeof STORE_CATEGORY_GROUPS] || 'otros';
                totals[group] = (totals[group] || 0) + tx.total;
            });
        } else if (treemapViewMode === 'item-categories') {
            monthTx.forEach(tx => {
                (tx.items || []).forEach(item => {
                    const cat = normalizeItemCategory(item.category || 'Other');
                    totals[cat] = (totals[cat] || 0) + item.totalPrice;
                });
            });
        } else if (treemapViewMode === 'item-groups') {
            monthTx.forEach(tx => {
                (tx.items || []).forEach(item => {
                    const cat = normalizeItemCategory(item.category || 'Other');
                    const itemKey = ITEM_CATEGORY_TO_KEY[cat as keyof typeof ITEM_CATEGORY_TO_KEY];
                    const group = itemKey ? ITEM_CATEGORY_GROUPS[itemKey as keyof typeof ITEM_CATEGORY_GROUPS] : 'otros-item';
                    totals[group] = (totals[group] || 0) + item.totalPrice;
                });
            });
        }

        // Update rankings
        Object.entries(totals).forEach(([cat, amount]) => {
            if (!categoryRankings[cat]) {
                categoryRankings[cat] = { amounts: [0, 0, 0, 0], color: getColorForMode(cat) };
            }
            categoryRankings[cat].amounts[idx] = amount;
        });
    });

    // Calculate ranks for each month (1 = highest spending)
    const ranks: Record<string, number[]> = {};
    months.forEach((_, monthIdx) => {
        const categoryAmounts = Object.entries(categoryRankings)
            .map(([cat, data]) => ({ cat, amount: data.amounts[monthIdx] }))
            .sort((a, b) => b.amount - a.amount);

        categoryAmounts.forEach((item, rank) => {
            if (!ranks[item.cat]) ranks[item.cat] = [4, 4, 4, 4]; // Default to lowest rank
            ranks[item.cat][monthIdx] = rank + 1;
        });
    });

    // Return top 4 categories + "Otro" (max 5 categories)
    const isOtherCategory = (name: string) => name === otherKey || name === 'Otro' || name === 'Other';
    const sortedCategories = Object.entries(categoryRankings)
        .filter(([cat]) => !isOtherCategory(cat))
        .map(([cat, data]) => ({
            name: cat,
            color: data.color,
            amounts: data.amounts,
            ranks: ranks[cat] || [5, 5, 5, 5],
            total: data.amounts.reduce((sum, a) => sum + a, 0)
        }))
        .sort((a, b) => b.total - a.total);

    const top4 = sortedCategories.slice(0, 4);
    const rest = sortedCategories.slice(4);

    // Get existing "other" category data if any
    const existingOther = Object.entries(categoryRankings).find(([cat]) => isOtherCategory(cat));

    // Aggregate remaining categories into "Otro"
    let categoryTotals = top4;
    const hasRemainingOrOther = rest.length > 0 || existingOther;

    if (hasRemainingOrOther) {
        const otroAmounts = rest.reduce(
            (sums, cat) => sums.map((s, i) => s + cat.amounts[i]),
            existingOther ? [...existingOther[1].amounts] : [0, 0, 0, 0]
        );
        const otroTotal = otroAmounts.reduce((sum, a) => sum + a, 0);

        // Calculate ranks for Otro based on its amounts
        const otroRanks = months.map((_, monthIdx) => {
            const allAmounts = [...top4.map(c => c.amounts[monthIdx]), otroAmounts[monthIdx]];
            const sorted = [...allAmounts].sort((a, b) => b - a);
            return sorted.indexOf(otroAmounts[monthIdx]) + 1;
        });

        categoryTotals = [
            ...top4,
            {
                name: otherKey,
                color: getColorForMode(otherKey),
                amounts: otroAmounts,
                ranks: otroRanks,
                total: otroTotal
            }
        ];

        // Recalculate ranks with Otro included
        months.forEach((_, monthIdx) => {
            const categoryAmounts = categoryTotals
                .map(cat => ({ name: cat.name, amount: cat.amounts[monthIdx] }))
                .sort((a, b) => b.amount - a.amount);
            categoryAmounts.forEach((item, rank) => {
                const cat = categoryTotals.find(c => c.name === item.name);
                if (cat) cat.ranks[monthIdx] = rank + 1;
            });
        });
    }

    return { monthData: months, categories: categoryTotals };
}
