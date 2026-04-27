import { getCategoryColorsAuto } from '@/config/categoryColors';

// Story 11.1: Sort type for dashboard transactions
export type SortType = 'transactionDate' | 'scanDate';

// Story 15-TD-6: Use canonical Transaction type instead of local definition
export type { Transaction } from '@/types/transaction';

// Story 14.12: Carousel slide configuration
export type CarouselSlide = 0 | 1 | 2;

// CAROUSEL_TITLES keys for translation lookup
export const CAROUSEL_TITLE_KEYS = ['thisMonthCarousel', 'monthToMonth', 'lastFourMonths'] as const;

/**
 * Story 14.13 Session 4: Treemap view mode - controls what data level is displayed
 * - 'store-groups': Transaction category groups (Food & Dining, Health & Wellness, etc.)
 * - 'store-categories': Transaction categories (Supermercado, Restaurante, etc.) - DEFAULT
 * - 'item-groups': Item category groups (Fresh Food, Packaged Food, etc.)
 * - 'item-categories': Item categories (Carnes y Mariscos, Lácteos, etc.)
 */
export type TreemapViewMode = 'store-groups' | 'store-categories' | 'item-groups' | 'item-categories';

// Story 14.13 Session 4: View mode configuration for pill selector
export const VIEW_MODE_CONFIG: Array<{
    value: TreemapViewMode;
    emoji: string;
    labelEs: string;
    labelEn: string;
}> = [
    { value: 'store-groups', emoji: '🏪', labelEs: 'Grupos de Compras', labelEn: 'Purchase Groups' },
    { value: 'store-categories', emoji: '🛒', labelEs: 'Categorías de Compras', labelEn: 'Purchase Categories' },
    { value: 'item-groups', emoji: '📦', labelEs: 'Grupos de Productos', labelEn: 'Product Groups' },
    { value: 'item-categories', emoji: '🏷️', labelEs: 'Categorías de Productos', labelEn: 'Product Categories' },
];

// Story 14.21: Get category colors for treemap using unified color system
// Returns both bg (background) and fg (text) colors for proper contrast
export function getTreemapColors(category: string): { bg: string; fg: string } {
    const colors = getCategoryColorsAuto(category);
    return { bg: colors.bg, fg: colors.fg };
}

// Story 14.12: Month translation keys (short and full)
export const MONTH_SHORT_KEYS = [
    'monthJan', 'monthFeb', 'monthMar', 'monthApr', 'monthMay', 'monthJun',
    'monthJul', 'monthAug', 'monthSep', 'monthOct', 'monthNov', 'monthDec'
] as const;

// Story 14.12: Number of recent transactions to show (collapsed/expanded)
export const RECENT_TRANSACTIONS_COLLAPSED = 5;
export const RECENT_TRANSACTIONS_EXPANDED = 10;
