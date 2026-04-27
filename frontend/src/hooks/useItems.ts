/**
 * Re-export shim for backward compatibility.
 * Canonical location: @features/items/hooks/useItems.ts
 * Consumers: DashboardView/categoryDataHelpers.ts (1 source + 1 test)
 * Story: 15b-1e
 */
export {
    useItems,
    flattenTransactionItems,
    filterItems,
    sortItemsByDate,
    sortItemsByPrice,
    sortItemsByName,
    groupItemsByDate,
    groupItemsByCategory,
    calculateItemsTotal,
    normalizeItemNameForGrouping,
    aggregateItems,
    sortAggregatedItems,
    extractAvailableItemFilters,
    type AvailableItemFilters,
} from '@features/items/hooks/useItems';
export { default } from '@features/items/hooks/useItems';
