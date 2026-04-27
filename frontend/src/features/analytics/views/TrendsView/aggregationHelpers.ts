/**
 * TrendsView Category Aggregation Helpers
 *
 * Story 15-TD-5: Split from helpers.ts
 *
 * Category data computation from transactions: store categories,
 * item categories, subcategories, item groups per store, and
 * item categories within groups.
 */

import { normalizeItemCategory } from '@/utils/categoryNormalizer';
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
    type StoreCategoryGroup,
    type ItemCategoryGroup,
} from '@/config/categoryColors';
import { buildProductKey } from '@/utils/categoryAggregation';
import type { Transaction } from '@/types/transaction';
import type { CategoryData } from './types';

/**
 * Compute ALL category data from transactions (raw, unsorted by display logic)
 * Story 14.14b Session 6: Now tracks transaction IDs for accurate aggregation in groups
 */
export function computeAllCategoryData(transactions: Transaction[]): CategoryData[] {
    // Story 14.13 Session 5: Track both transaction count and item count
    // Story 14.13 Session 7: Changed to count unique products instead of raw line items
    const categoryMap: Record<string, { value: number; transactionIds: Set<string>; uniqueProducts: Set<string> }> = {};

    transactions.forEach((tx, index) => {
        const cat = tx.category || 'Otro';
        if (!categoryMap[cat]) {
            categoryMap[cat] = { value: 0, transactionIds: new Set(), uniqueProducts: new Set() };
        }
        categoryMap[cat].value += tx.total;
        // Use tx.id if available, otherwise fallback to index-based ID
        categoryMap[cat].transactionIds.add(tx.id ?? `tx-${index}`);
        // Story 14.13 Session 7: Track unique products by normalized name + merchant
        (tx.items || []).forEach(item => {
            const productKey = buildProductKey(item.name || '', tx.merchant || '');
            categoryMap[cat].uniqueProducts.add(productKey);
        });
    });

    const total = Object.values(categoryMap).reduce((sum, c) => sum + c.value, 0);

    return Object.entries(categoryMap)
        .map(([name, data]) => {
            // Story 14.21: Use getCategoryPillColors for charts (ALWAYS colorful)
            const pillColors = getCategoryPillColors(name);
            return {
                name,
                value: data.value,
                count: data.transactionIds.size,
                // Story 14.13 Session 7: Count unique products (matches Items view aggregation)
                itemCount: data.uniqueProducts.size,
                transactionIds: data.transactionIds,  // Keep for group aggregation
                color: pillColors.bg,      // Pastel bg for treemap cell backgrounds
                fgColor: pillColors.fg,    // Vibrant fg for donut segments & text
                percent: total > 0 ? Math.round((data.value / total) * 100) : 0,
            };
        })
        .sort((a, b) => b.value - a.value);
}

/**
 * Story 14.14b Session 4: Compute item category data from actual transaction line items.
 * This aggregates real data from tx.items instead of using mock data.
 * Story 14.14b Session 6: Now returns transactionIds for accurate group aggregation.
 */
export function computeItemCategoryData(transactions: Transaction[]): CategoryData[] {
    // Story 14.13 Session 7: Changed to count unique products (by normalized name+merchant) instead of raw line items
    const itemCategoryMap: Record<string, { value: number; transactionIds: Set<string>; uniqueProducts: Set<string> }> = {};

    transactions.forEach((tx, index) => {
        // Aggregate line items by their category
        (tx.items || []).forEach(item => {
            // Story 14.15b: Normalize legacy category names (V1/V2 -> V3)
            const cat = normalizeItemCategory(item.category || 'Other');
            if (!itemCategoryMap[cat]) {
                itemCategoryMap[cat] = { value: 0, transactionIds: new Set(), uniqueProducts: new Set() };
            }
            // Story 14.24: price is total for line item, qty is informational only
            itemCategoryMap[cat].value += item.totalPrice;
            // Track unique transaction IDs to count transactions, not items
            itemCategoryMap[cat].transactionIds.add(tx.id ?? `tx-${index}`);
            itemCategoryMap[cat].uniqueProducts.add(buildProductKey(item.name || '', tx.merchant || ''));
        });
    });

    const total = Object.values(itemCategoryMap).reduce((sum, c) => sum + c.value, 0);

    return Object.entries(itemCategoryMap)
        .map(([name, data]) => {
            const pillColors = getCategoryPillColors(name);
            return {
                name,
                value: data.value,
                count: data.transactionIds.size,
                itemCount: data.uniqueProducts.size,
                transactionIds: data.transactionIds,
                color: pillColors.bg,
                fgColor: pillColors.fg,
                percent: total > 0 ? Math.round((data.value / total) * 100) : 0,
            };
        })
        .sort((a, b) => b.value - a.value);
}

/**
 * Story 14.14b Session 4: Compute subcategory data from actual transaction line items.
 * Filters items by item category and aggregates by subcategory.
 * Count represents unique transactions, not individual items.
 * Story 14.14b Session 6: Now returns transactionIds for accurate group aggregation.
 */
export function computeSubcategoryData(
    transactions: Transaction[],
    itemCategoryFilter?: string
): CategoryData[] {
    // Story 14.13 Session 7: Changed to count unique products instead of raw line items
    const subcategoryMap: Record<string, { value: number; transactionIds: Set<string>; uniqueProducts: Set<string> }> = {};

    transactions.forEach((tx, index) => {
        (tx.items || []).forEach(item => {
            // Story 14.15b: Normalize legacy category names for comparison
            const normalizedItemCategory = normalizeItemCategory(item.category || 'Other');

            // Filter by item category if specified (compare normalized)
            if (itemCategoryFilter && normalizedItemCategory !== itemCategoryFilter) {
                return;
            }

            // Use subcategory if available, otherwise skip (we only show items with subcategories)
            const subcat = item.subcategory;
            if (!subcat) return;

            if (!subcategoryMap[subcat]) {
                subcategoryMap[subcat] = { value: 0, transactionIds: new Set(), uniqueProducts: new Set() };
            }
            // Story 14.24: price is total for line item, qty is informational only
            subcategoryMap[subcat].value += item.totalPrice;
            // Track unique transaction IDs to count transactions, not items
            subcategoryMap[subcat].transactionIds.add(tx.id ?? `tx-${index}`);
            // Story 14.13 Session 7: Track unique products by normalized name + merchant
            const productKey = buildProductKey(item.name || '', tx.merchant || '');
            subcategoryMap[subcat].uniqueProducts.add(productKey);
        });
    });

    const total = Object.values(subcategoryMap).reduce((sum, c) => sum + c.value, 0);

    return Object.entries(subcategoryMap)
        .map(([name, data]) => {
            const pillColors = getCategoryPillColors(name);
            return {
                name,
                value: data.value,
                count: data.transactionIds.size, // Count unique transactions, not items
                // Story 14.13 Session 7: Count unique products (matches Items view aggregation)
                itemCount: data.uniqueProducts.size,
                transactionIds: data.transactionIds, // Keep for group aggregation
                color: pillColors.bg,
                fgColor: pillColors.fg,
                percent: total > 0 ? Math.round((data.value / total) * 100) : 0,
            };
        })
        .sort((a, b) => b.value - a.value);
}

/**
 * Story 14.13 Session 7: Compute item groups dynamically from a store category's transactions.
 * Only returns item groups that have actual items in the filtered transactions.
 * This enables dynamic drill-down: Store Category -> Item Groups (only groups with items in that store)
 */
export function computeItemGroupsForStore(
    transactions: Transaction[],
    storeCategoryName: string
): CategoryData[] {
    const theme = getCurrentTheme();
    const mode = getCurrentMode();
    // Filter transactions to only those matching the store category
    const filteredTx = transactions.filter(tx => tx.category === storeCategoryName);

    // Compute item categories from filtered transactions
    const itemCategories = computeItemCategoryData(filteredTx);

    // Aggregate into item groups
    const groupTotals: Record<ItemCategoryGroup, { value: number; transactionIds: Set<string>; itemCount: number }> = {
        'food-fresh': { value: 0, transactionIds: new Set(), itemCount: 0 },
        'food-packaged': { value: 0, transactionIds: new Set(), itemCount: 0 },
        'food-prepared': { value: 0, transactionIds: new Set(), itemCount: 0 },
        'salud-cuidado': { value: 0, transactionIds: new Set(), itemCount: 0 },
        'hogar': { value: 0, transactionIds: new Set(), itemCount: 0 },
        'productos-generales': { value: 0, transactionIds: new Set(), itemCount: 0 },
        'servicios-cargos': { value: 0, transactionIds: new Set(), itemCount: 0 },
        'vicios': { value: 0, transactionIds: new Set(), itemCount: 0 },
        'otros-item': { value: 0, transactionIds: new Set(), itemCount: 0 },
    };

    // Aggregate item categories into groups
    for (const item of itemCategories) {
        const itemKey = ITEM_CATEGORY_TO_KEY[item.name as keyof typeof ITEM_CATEGORY_TO_KEY];
        const group = itemKey ? ITEM_CATEGORY_GROUPS[itemKey as keyof typeof ITEM_CATEGORY_GROUPS] : 'otros-item';
        groupTotals[group].value += item.value;
        if (item.transactionIds) {
            item.transactionIds.forEach(id => groupTotals[group].transactionIds.add(id));
        }
        groupTotals[group].itemCount += item.itemCount || 0;
    }

    const totalValue = Object.values(groupTotals).reduce((sum, g) => sum + g.value, 0);

    return ALL_ITEM_CATEGORY_GROUPS
        .map(groupKey => {
            const data = groupTotals[groupKey];
            const colors = getItemGroupColors(groupKey, theme, mode);
            return {
                name: groupKey,
                value: data.value,
                count: data.transactionIds.size,
                itemCount: data.itemCount,
                transactionIds: data.transactionIds,
                color: colors.bg,
                fgColor: colors.fg,
                percent: totalValue > 0 ? Math.round((data.value / totalValue) * 100) : 0,
            };
        })
        .filter(g => g.value > 0)
        .sort((a, b) => b.value - a.value);
}

/**
 * Story 14.13 Session 7: Compute item categories within a specific item group,
 * optionally filtered by store category.
 * Returns only item categories that belong to the group AND have actual data.
 * This enables dynamic drill-down: Item Group -> Item Categories (only categories with items in that group)
 */
export function computeItemCategoriesInGroup(
    transactions: Transaction[],
    itemGroupKey: string,
    storeCategoryName?: string
): CategoryData[] {
    // Optionally filter by store category first
    const filteredTx = storeCategoryName
        ? transactions.filter(tx => tx.category === storeCategoryName)
        : transactions;

    // Compute all item categories from filtered transactions
    const allItemCategories = computeItemCategoryData(filteredTx);

    // Filter to only item categories that belong to the specified group
    return allItemCategories.filter(item => {
        const itemKey = ITEM_CATEGORY_TO_KEY[item.name as keyof typeof ITEM_CATEGORY_TO_KEY];
        const group = itemKey ? ITEM_CATEGORY_GROUPS[itemKey as keyof typeof ITEM_CATEGORY_GROUPS] : 'otros-item';
        return group === itemGroupKey;
    });
}

/**
 * Story 15-TD-5b: Aggregate allCategoryData by store category groups.
 * Extracted from TrendsView.tsx storeGroupsData useMemo.
 */
export function computeStoreGroupsData(allCategoryData: CategoryData[]): CategoryData[] {
    const theme = getCurrentTheme();
    const mode = getCurrentMode();
    const groupTotals: Record<StoreCategoryGroup, { value: number; count: number; itemCount: number }> = {
        'supermercados': { value: 0, count: 0, itemCount: 0 },
        'restaurantes': { value: 0, count: 0, itemCount: 0 },
        'comercio-barrio': { value: 0, count: 0, itemCount: 0 },
        'vivienda': { value: 0, count: 0, itemCount: 0 },
        'salud-bienestar': { value: 0, count: 0, itemCount: 0 },
        'tiendas-generales': { value: 0, count: 0, itemCount: 0 },
        'tiendas-especializadas': { value: 0, count: 0, itemCount: 0 },
        'transporte-vehiculo': { value: 0, count: 0, itemCount: 0 },
        'educacion': { value: 0, count: 0, itemCount: 0 },
        'servicios-finanzas': { value: 0, count: 0, itemCount: 0 },
        'entretenimiento-hospedaje': { value: 0, count: 0, itemCount: 0 },
        'otros': { value: 0, count: 0, itemCount: 0 },
    };

    for (const cat of allCategoryData) {
        const group = STORE_CATEGORY_GROUPS[cat.name as keyof typeof STORE_CATEGORY_GROUPS] || 'otros';
        groupTotals[group].value += cat.value;
        groupTotals[group].count += cat.count;
        groupTotals[group].itemCount += cat.itemCount || 0;
    }

    const totalValue = Object.values(groupTotals).reduce((sum, g) => sum + g.value, 0);

    return ALL_STORE_CATEGORY_GROUPS
        .map(groupKey => {
            const data = groupTotals[groupKey];
            const colors = getStoreGroupColors(groupKey, theme, mode);
            return {
                name: groupKey,
                value: data.value,
                count: data.count,
                itemCount: data.itemCount,
                color: colors.bg,
                fgColor: colors.fg,
                percent: totalValue > 0 ? Math.round((data.value / totalValue) * 100) : 0,
            };
        })
        .filter(g => g.value > 0)
        .sort((a, b) => b.value - a.value);
}

/**
 * Story 15-TD-5b: Aggregate item categories by item groups from transactions.
 * Extracted from TrendsView.tsx itemGroupsData useMemo.
 */
export function computeItemGroupsData(filteredTransactions: Transaction[]): CategoryData[] {
    const theme = getCurrentTheme();
    const mode = getCurrentMode();
    const groupTotals: Record<ItemCategoryGroup, { value: number; transactionIds: Set<string>; uniqueProducts: Set<string> }> = {
        'food-fresh': { value: 0, transactionIds: new Set(), uniqueProducts: new Set() },
        'food-packaged': { value: 0, transactionIds: new Set(), uniqueProducts: new Set() },
        'food-prepared': { value: 0, transactionIds: new Set(), uniqueProducts: new Set() },
        'salud-cuidado': { value: 0, transactionIds: new Set(), uniqueProducts: new Set() },
        'hogar': { value: 0, transactionIds: new Set(), uniqueProducts: new Set() },
        'productos-generales': { value: 0, transactionIds: new Set(), uniqueProducts: new Set() },
        'servicios-cargos': { value: 0, transactionIds: new Set(), uniqueProducts: new Set() },
        'vicios': { value: 0, transactionIds: new Set(), uniqueProducts: new Set() },
        'otros-item': { value: 0, transactionIds: new Set(), uniqueProducts: new Set() },
    };

    filteredTransactions.forEach((tx, index) => {
        (tx.items || []).forEach(item => {
            const cat = normalizeItemCategory(item.category || 'Other');
            const itemKey = ITEM_CATEGORY_TO_KEY[cat as keyof typeof ITEM_CATEGORY_TO_KEY];
            const group = itemKey ? ITEM_CATEGORY_GROUPS[itemKey as keyof typeof ITEM_CATEGORY_GROUPS] : 'otros-item';

            groupTotals[group].value += item.totalPrice;
            groupTotals[group].transactionIds.add(tx.id ?? `tx-${index}`);

            // Track unique products by normalized name + merchant
            groupTotals[group].uniqueProducts.add(
                buildProductKey(item.name || '', tx.merchant || '')
            );
        });
    });

    const totalValue = Object.values(groupTotals).reduce((sum, g) => sum + g.value, 0);

    return ALL_ITEM_CATEGORY_GROUPS
        .map(groupKey => {
            const data = groupTotals[groupKey];
            const colors = getItemGroupColors(groupKey, theme, mode);
            return {
                name: groupKey,
                value: data.value,
                count: data.transactionIds.size,
                itemCount: data.uniqueProducts.size,
                transactionIds: data.transactionIds,
                color: colors.bg,
                fgColor: colors.fg,
                percent: totalValue > 0 ? Math.round((data.value / totalValue) * 100) : 0,
            };
        })
        .filter(g => g.value > 0)
        .sort((a, b) => b.value - a.value);
}
