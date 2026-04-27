/**
 * Story 15b-2d: Constants and types extracted from ItemsView.tsx
 *
 * Contains page size options, sort options, and the ItemsViewProps interface.
 * Internal to the ItemsView directory — NOT exported from the feature barrel.
 */

import type { SortOption } from '@features/history/components/SortControl';
import type { UseItemsViewDataReturn } from './useItemsViewData';

// ============================================================================
// Pagination Constants
// ============================================================================

/**
 * Page size options matching HistoryView pattern.
 * Default is 15 items per page, with options to switch to 30 or 60.
 */
export const PAGE_SIZE_OPTIONS = [15, 30, 60] as const;
export type PageSizeOption = typeof PAGE_SIZE_OPTIONS[number];
export const DEFAULT_PAGE_SIZE: PageSizeOption = 15;

// ============================================================================
// Sort Constants
// ============================================================================

/**
 * Story 14.31 Session 3: Sort options for Items view.
 * - Date (newest first) - default
 * - Price (highest/lowest)
 * - Name (A-Z)
 */
export type ItemSortKey = 'lastPurchaseDate' | 'totalAmount' | 'name';
export const ITEM_SORT_OPTIONS: SortOption[] = [
    { key: 'lastPurchaseDate', labelEn: 'Date', labelEs: 'Fecha' },
    { key: 'totalAmount', labelEn: 'Price', labelEs: 'Precio' },
    { key: 'name', labelEn: 'Name', labelEs: 'Nombre' },
];
export const DEFAULT_SORT_KEY: ItemSortKey = 'lastPurchaseDate';
export const DEFAULT_SORT_DIRECTION: 'asc' | 'desc' = 'desc';

// ============================================================================
// Component Props
// ============================================================================

/**
 * Story 14e-31: Minimal props interface for ItemsView.
 *
 * View now owns its data via useItemsViewData hook.
 * Uses _testOverrides pattern for handler injection from App.tsx.
 */
export interface ItemsViewProps {
    /**
     * Override hook values from parent (App.tsx).
     * Used to inject handlers that require App.tsx state coordination.
     * Example: onEditTransaction needs setCurrentTransaction from App.tsx.
     */
    _testOverrides?: Partial<UseItemsViewDataReturn>;
    /** Initial category filter (for navigation from analytics) */
    initialCategory?: string;
    /** Initial search term (for navigation from analytics) */
    initialSearchTerm?: string;
}
