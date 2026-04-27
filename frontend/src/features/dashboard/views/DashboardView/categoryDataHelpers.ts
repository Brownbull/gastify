/**
 * Category Data Helpers for DashboardView
 *
 * Pure functions extracted from DashboardView useMemo computations.
 * These compute category aggregation data for the treemap visualization.
 *
 * Story 15-TD-5b: Extracted from DashboardView to reduce file size.
 */

import type { StoreCategoryGroup, ItemCategoryGroup } from '@/config/categoryColors';
import {
    getCategoryPillColors,
    getStoreGroupColors,
    getItemGroupColors,
    getCurrentTheme,
    getCurrentMode,
    ALL_STORE_CATEGORY_GROUPS,
    ALL_ITEM_CATEGORY_GROUPS,
    STORE_CATEGORY_GROUPS,
    ITEM_CATEGORY_GROUPS,
    ITEM_CATEGORY_TO_KEY,
} from '@/config/categoryColors';
import { normalizeItemCategory } from '@/utils/categoryNormalizer';
import { normalizeItemNameForGrouping } from '@/hooks/useItems';
import { applyMasGrouping, buildProductKey, type MasGroupingResult } from '@/utils/categoryAggregation';
import type { Transaction } from './types';
import { getTreemapColors } from './types';

// ============================================================================
// Shared Types
// ============================================================================

/** Shape of each entry in a category data result */
export interface CategoryDataEntry {
    name: string;
    amount: number;
    count: number;
    itemCount: number;
    bgColor: string;
    fgColor: string;
    percent: number;
    categoryCount?: number;
    transactionIds?: Set<string>;
}

/** Aggregation bucket used during computation */
interface AggregationBucket {
    amount: number;
    transactionIds: Set<string>;
    uniqueProducts: Set<string>;
}

// ============================================================================
// Shared Helpers
// ============================================================================

/** Create the standard "Mas" entry factory for applyMasGrouping */
function createMasEntry(stats: {
    amount: number;
    count: number;
    itemCount: number;
    percent: number;
    categoryCount: number;
}): CategoryDataEntry {
    const masColors = getTreemapColors('Otro');
    return {
        name: 'Más',
        amount: stats.amount,
        count: stats.count,
        itemCount: stats.itemCount,
        bgColor: masColors.bg,
        fgColor: masColors.fg,
        percent: stats.percent,
        categoryCount: stats.categoryCount,
    };
}

/** Track product for unique counting */
function trackProduct(bucket: AggregationBucket, itemName: string, merchant: string): void {
    bucket.uniqueProducts.add(buildProductKey(
        normalizeItemNameForGrouping(itemName || ''),
        normalizeItemNameForGrouping(merchant || '')
    ));
}

/** Initialize a fresh aggregation bucket */
function newBucket(): AggregationBucket {
    return { amount: 0, transactionIds: new Set(), uniqueProducts: new Set() };
}

// ============================================================================
// Store Categories (treemapCategoriesResult)
// ============================================================================

/**
 * Aggregate transactions by store category (e.g., Supermercado, Restaurante).
 * This is the default treemap view mode.
 */
export function computeStoreCategoriesData(
    monthTransactions: Transaction[],
    monthTotal: number,
): MasGroupingResult<CategoryDataEntry> {
    const categoryTotals: Record<string, AggregationBucket> = {};

    monthTransactions.forEach((tx, index) => {
        const cat = tx.category || 'Otro';
        if (!categoryTotals[cat]) {
            categoryTotals[cat] = newBucket();
        }
        categoryTotals[cat].amount += tx.total;
        categoryTotals[cat].transactionIds.add(tx.id ?? `tx-${index}`);
        (tx.items || []).forEach(item => {
            trackProduct(categoryTotals[cat], item.name || '', tx.merchant || '');
        });
    });

    const sorted: CategoryDataEntry[] = Object.entries(categoryTotals)
        .map(([name, data]) => {
            const colors = getTreemapColors(name);
            return {
                name,
                amount: data.amount,
                count: data.transactionIds.size,
                itemCount: data.uniqueProducts.size,
                bgColor: colors.bg,
                fgColor: colors.fg,
                percent: monthTotal > 0 ? (data.amount / monthTotal) * 100 : 0,
                transactionIds: data.transactionIds,
            };
        })
        .sort((a, b) => b.amount - a.amount);

    return applyMasGrouping(sorted, monthTotal, createMasEntry);
}

// ============================================================================
// Store Groups (storeGroupsDataResult)
// ============================================================================

/**
 * Aggregate transactions by store category group (e.g., supermercados, salud-bienestar).
 */
export function computeStoreGroupsData(
    monthTransactions: Transaction[],
    monthTotal: number,
): MasGroupingResult<CategoryDataEntry> {
    const theme = getCurrentTheme();
    const mode = getCurrentMode();

    const groupTotals: Record<StoreCategoryGroup, AggregationBucket> = {
        'supermercados': newBucket(),
        'restaurantes': newBucket(),
        'comercio-barrio': newBucket(),
        'vivienda': newBucket(),
        'salud-bienestar': newBucket(),
        'tiendas-generales': newBucket(),
        'tiendas-especializadas': newBucket(),
        'transporte-vehiculo': newBucket(),
        'educacion': newBucket(),
        'servicios-finanzas': newBucket(),
        'entretenimiento-hospedaje': newBucket(),
        'otros': newBucket(),
    };

    monthTransactions.forEach((tx, index) => {
        const cat = tx.category || 'Otro';
        const group = STORE_CATEGORY_GROUPS[cat as keyof typeof STORE_CATEGORY_GROUPS] || 'otros';
        groupTotals[group].amount += tx.total;
        groupTotals[group].transactionIds.add(tx.id ?? `tx-${index}`);
        (tx.items || []).forEach(item => {
            trackProduct(groupTotals[group], item.name || '', tx.merchant || '');
        });
    });

    const sorted: CategoryDataEntry[] = ALL_STORE_CATEGORY_GROUPS
        .map(groupKey => {
            const data = groupTotals[groupKey];
            const colors = getStoreGroupColors(groupKey, theme, mode);
            return {
                name: groupKey,
                amount: data.amount,
                count: data.transactionIds.size,
                itemCount: data.uniqueProducts.size,
                bgColor: colors.bg,
                fgColor: colors.fg,
                percent: monthTotal > 0 ? (data.amount / monthTotal) * 100 : 0,
                transactionIds: data.transactionIds,
            };
        })
        .filter(g => g.amount > 0)
        .sort((a, b) => b.amount - a.amount);

    return applyMasGrouping(sorted, monthTotal, createMasEntry);
}

// ============================================================================
// Item Categories (itemCategoriesDataResult)
// ============================================================================

/**
 * Aggregate transaction line items by item category (e.g., Carnes, Lacteos).
 */
export function computeItemCategoriesData(
    monthTransactions: Transaction[],
): MasGroupingResult<CategoryDataEntry> {
    const itemCategoryMap: Record<string, AggregationBucket> = {};

    monthTransactions.forEach((tx, index) => {
        (tx.items || []).forEach(item => {
            const cat = normalizeItemCategory(item.category || 'Other');
            if (!itemCategoryMap[cat]) {
                itemCategoryMap[cat] = newBucket();
            }
            itemCategoryMap[cat].amount += item.totalPrice;
            itemCategoryMap[cat].transactionIds.add(tx.id ?? `tx-${index}`);
            trackProduct(itemCategoryMap[cat], item.name || '', tx.merchant || '');
        });
    });

    const total = Object.values(itemCategoryMap).reduce((sum, c) => sum + c.amount, 0);

    const sorted: CategoryDataEntry[] = Object.entries(itemCategoryMap)
        .map(([name, data]) => {
            const colors = getCategoryPillColors(name);
            return {
                name,
                amount: data.amount,
                count: data.transactionIds.size,
                itemCount: data.uniqueProducts.size,
                bgColor: colors.bg,
                fgColor: colors.fg,
                percent: total > 0 ? (data.amount / total) * 100 : 0,
                transactionIds: data.transactionIds,
            };
        })
        .sort((a, b) => b.amount - a.amount);

    return applyMasGrouping(sorted, total, createMasEntry);
}

// ============================================================================
// Item Groups (itemGroupsDataResult)
// ============================================================================

/**
 * Aggregate transaction line items by item category group (e.g., food-fresh, hogar).
 */
export function computeItemGroupsData(
    monthTransactions: Transaction[],
): MasGroupingResult<CategoryDataEntry> {
    const theme = getCurrentTheme();
    const mode = getCurrentMode();

    const groupTotals: Record<ItemCategoryGroup, AggregationBucket> = {
        'food-fresh': newBucket(),
        'food-packaged': newBucket(),
        'food-prepared': newBucket(),
        'salud-cuidado': newBucket(),
        'hogar': newBucket(),
        'productos-generales': newBucket(),
        'servicios-cargos': newBucket(),
        'vicios': newBucket(),
        'otros-item': newBucket(),
    };

    monthTransactions.forEach((tx, index) => {
        (tx.items || []).forEach(item => {
            const cat = normalizeItemCategory(item.category || 'Other');
            const itemKey = ITEM_CATEGORY_TO_KEY[cat as keyof typeof ITEM_CATEGORY_TO_KEY];
            const group = itemKey ? ITEM_CATEGORY_GROUPS[itemKey as keyof typeof ITEM_CATEGORY_GROUPS] : 'otros-item';
            groupTotals[group].amount += item.totalPrice;
            groupTotals[group].transactionIds.add(tx.id ?? `tx-${index}`);
            trackProduct(groupTotals[group], item.name || '', tx.merchant || '');
        });
    });

    const total = Object.values(groupTotals).reduce((sum, g) => sum + g.amount, 0);

    const sorted: CategoryDataEntry[] = ALL_ITEM_CATEGORY_GROUPS
        .map(groupKey => {
            const data = groupTotals[groupKey];
            const colors = getItemGroupColors(groupKey, theme, mode);
            return {
                name: groupKey,
                amount: data.amount,
                count: data.transactionIds.size,
                itemCount: data.uniqueProducts.size,
                bgColor: colors.bg,
                fgColor: colors.fg,
                percent: total > 0 ? (data.amount / total) * 100 : 0,
                transactionIds: data.transactionIds,
            };
        })
        .filter(g => g.amount > 0)
        .sort((a, b) => b.amount - a.amount);

    return applyMasGrouping(sorted, total, createMasEntry);
}
