/**
 * Items hooks barrel export.
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
} from './useItems';
export type { AvailableItemFilters } from './useItems';
export { useDerivedItems } from './useDerivedItems';
