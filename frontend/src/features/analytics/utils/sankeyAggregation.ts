/**
 * Sankey Aggregation — Transaction data aggregation for Sankey diagrams
 * Story 15b-2f: Extracted from sankeyDataBuilder.ts (pure decomposition)
 */

import type { Transaction } from '@/types/transaction';
import type { StoreCategory, ItemCategory } from '../../../../shared/schema/categories';
import {
    STORE_CATEGORY_GROUPS,
    ITEM_CATEGORY_GROUPS,
    ITEM_CATEGORY_TO_KEY,
    type StoreCategoryGroup,
    type ItemCategoryGroup,
} from '@/config/categoryColors';

// ============================================================================
// TYPES
// ============================================================================

/**
 * @internal — implementation detail consumed only by sankeyDataBuilder.
 */
export interface FlowAggregates {
    storeGroups: Map<StoreCategoryGroup, { value: number; count: number }>;
    storeCategories: Map<StoreCategory, { value: number; count: number }>;
    itemGroups: Map<ItemCategoryGroup, { value: number; count: number }>;
    itemCategories: Map<ItemCategory, { value: number; count: number }>;
    // Flow links
    storeGroupToStoreCategory: Map<string, number>;
    storeCategoryToItemGroup: Map<string, number>;
    itemGroupToItemCategory: Map<string, number>;
    storeCategoryToItemCategory: Map<string, number>; // For 2-level mode
}

// ============================================================================
// AGGREGATION
// ============================================================================

/**
 * Aggregates transaction data into flow values for all hierarchy levels.
 */
export function aggregateTransactions(transactions: Transaction[]): FlowAggregates {
    const agg: FlowAggregates = {
        storeGroups: new Map(),
        storeCategories: new Map(),
        itemGroups: new Map(),
        itemCategories: new Map(),
        storeGroupToStoreCategory: new Map(),
        storeCategoryToItemGroup: new Map(),
        itemGroupToItemCategory: new Map(),
        storeCategoryToItemCategory: new Map(),
    };

    for (const tx of transactions) {
        // Skip transactions without items (required for Sankey flow)
        if (!tx.items || tx.items.length === 0) continue;

        // Transaction.category is the store category
        const storeCategory = tx.category as StoreCategory;
        if (!storeCategory) continue;

        const storeGroup = STORE_CATEGORY_GROUPS[storeCategory];
        if (!storeGroup) continue;

        // Process each item
        for (const item of tx.items) {
            const itemCategory = item.category as ItemCategory;
            if (!itemCategory) continue;

            const itemCategoryKey = ITEM_CATEGORY_TO_KEY[itemCategory];
            if (!itemCategoryKey) continue;

            const itemGroup = ITEM_CATEGORY_GROUPS[itemCategoryKey];
            if (!itemGroup) continue;

            // TransactionItem uses totalPrice — non-number rejected by typeof, NaN/0/negative by !(> 0)
            if (typeof item.totalPrice !== 'number' || !(item.totalPrice > 0)) continue;
            const amount = item.totalPrice;

            // Aggregate store groups
            const sgAgg = agg.storeGroups.get(storeGroup) || { value: 0, count: 0 };
            sgAgg.value += amount;
            sgAgg.count += 1;
            agg.storeGroups.set(storeGroup, sgAgg);

            // Aggregate store categories
            const scAgg = agg.storeCategories.get(storeCategory) || { value: 0, count: 0 };
            scAgg.value += amount;
            scAgg.count += 1;
            agg.storeCategories.set(storeCategory, scAgg);

            // Aggregate item groups
            const igAgg = agg.itemGroups.get(itemGroup) || { value: 0, count: 0 };
            igAgg.value += amount;
            igAgg.count += 1;
            agg.itemGroups.set(itemGroup, igAgg);

            // Aggregate item categories
            const icAgg = agg.itemCategories.get(itemCategory) || { value: 0, count: 0 };
            icAgg.value += amount;
            icAgg.count += 1;
            agg.itemCategories.set(itemCategory, icAgg);

            // Flow links (4-level)
            const sgToScKey = `${storeGroup}→${storeCategory}`;
            agg.storeGroupToStoreCategory.set(
                sgToScKey,
                (agg.storeGroupToStoreCategory.get(sgToScKey) || 0) + amount
            );

            const scToIgKey = `${storeCategory}→${itemGroup}`;
            agg.storeCategoryToItemGroup.set(
                scToIgKey,
                (agg.storeCategoryToItemGroup.get(scToIgKey) || 0) + amount
            );

            const igToIcKey = `${itemGroup}→${itemCategory}`;
            agg.itemGroupToItemCategory.set(
                igToIcKey,
                (agg.itemGroupToItemCategory.get(igToIcKey) || 0) + amount
            );

            // Flow link (2-level)
            const scToIcKey = `${storeCategory}→${itemCategory}`;
            agg.storeCategoryToItemCategory.set(
                scToIcKey,
                (agg.storeCategoryToItemCategory.get(scToIcKey) || 0) + amount
            );
        }
    }

    return agg;
}
