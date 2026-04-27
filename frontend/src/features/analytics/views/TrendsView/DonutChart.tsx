/** DonutChart — Story 15-5b: Extracted from TrendsView.tsx, Story 15-TD-5: Further decomposed */
import React, { useCallback, useMemo } from 'react';
import { ChevronLeft, Plus, Minus } from 'lucide-react';
import {
    ALL_STORE_CATEGORY_GROUPS,
    ALL_ITEM_CATEGORY_GROUPS,
    STORE_CATEGORY_GROUPS,
    ITEM_CATEGORY_GROUPS,
    ITEM_CATEGORY_TO_KEY,
    getStoreGroupColors,
    getItemGroupColors,
    getCurrentTheme,
    getCurrentMode,
    expandStoreCategoryGroup,
    expandItemCategoryGroup,
    type StoreCategoryGroup,
    type ItemCategoryGroup,
} from '@/config/categoryColors';
import { formatCurrency } from '@/utils/currency';
import { buildProductKey } from '@/utils/categoryAggregation';
import { normalizeItemCategory } from '@/utils/categoryNormalizer';
import {
    translateCategory,
    translateStoreCategoryGroup,
    translateItemCategoryGroup,
} from '@/utils/categoryTranslations';
import { useCountUp } from '@/hooks/useCountUp';
import type { Transaction } from '@/types/transaction';
import type { HistoryNavigationPayload } from '@/types/navigation';
import type { CategoryData, DonutViewMode, TimePeriod, CurrentPeriod } from './types';
import {
    computeTreemapCategories,
    computeItemCategoryData,
    computeSubcategoryData,
    computeItemGroupsForStore,
    computeItemCategoriesInGroup,
} from './helpers';
import { useDonutDrillDown } from './useDonutDrillDown';
import { DonutLegend } from './DonutLegend';

/** Drill-down data for Level 2 (item groups within a category) */
interface DrillDownGroupData {
    name: string;
    value: number;
    count: number;
    color: string;
    fgColor: string;  // Story 14.21: Foreground color for text contrast
    percent: number;
}

/** Donut Chart component with header, interactive segments, and legend */
export const DonutChart: React.FC<{
    categoryData: CategoryData[];
    /** All store categories (before treemap processing) for accurate group aggregation */
    allCategoryData: CategoryData[];
    total: number;
    currency: string;
    locale: string;
    isDark: boolean;
    canExpand: boolean;
    canCollapse: boolean;
    otroCount: number;
    /** Categories inside "Más" group for navigation expansion */
    otroCategories: CategoryData[];
    expandedCount: number;
    onExpand: () => void;
    onCollapse: () => void;
    /** Transactions for real item/subcategory aggregation */
    transactions: Transaction[];
    /** Navigation handler for transaction count pill */
    onNavigateToHistory?: (payload: HistoryNavigationPayload) => void;
    /** View mode controlled from parent */
    viewMode: DonutViewMode;
    /** Time period for navigation filter */
    timePeriod?: TimePeriod;
    /** Current period for navigation filter */
    currentPeriod?: CurrentPeriod;
    /** Count mode for legend display (transactions vs items) */
    countMode?: 'transactions' | 'items';
    /** Open statistics popup on icon click */
    onIconClick?: (categoryName: string, emoji: string, color: string) => void;
}> = ({
    categoryData,
    allCategoryData,
    total,
    currency,
    locale,
    isDark,
    canExpand: parentCanExpand,
    canCollapse: parentCanCollapse,
    otroCount: parentOtroCount,
    otroCategories: parentOtroCategories,
    expandedCount: parentExpandedCount,
    onExpand: parentOnExpand,
    onCollapse: parentOnCollapse,
    transactions,
    onNavigateToHistory,
    viewMode,
    timePeriod = 'month',
    currentPeriod,
    countMode = 'transactions',
    onIconClick,
}) => {
    // Story 15-TD-5: Drill-down state machine extracted to hook
    const drillDown = useDonutDrillDown({
        viewMode,
        parentOnExpand,
        parentOnCollapse,
    });

    // Destructure for convenience
    const {
        selectedCategory, donutAnimationKey, visibleSegments,
        drillDownLevel, drillDownPath, drillDownExpandedCount,
        handleSegmentClick, getMaxDrillDownLevel,
        handleDrillDown, handleBack, handleExpand, handleCollapse,
        buildSemanticDrillDownPath,
    } = drillDown;

    // Story 14.14b Session 5: Aggregate allCategoryData (not treemap-processed categoryData) by store category groups
    // This ensures all store categories are included, not just those above the treemap threshold
    // Story 14.13 Session 5: Now also aggregates itemCount for count mode toggle
    const storeGroupsData = useMemo((): CategoryData[] => {
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

        // Aggregate allCategoryData into groups (use all categories, not treemap-filtered)
        for (const cat of allCategoryData) {
            // Map category name to its group
            const group = STORE_CATEGORY_GROUPS[cat.name as keyof typeof STORE_CATEGORY_GROUPS] || 'otros';
            groupTotals[group].value += cat.value;
            groupTotals[group].count += cat.count;
            groupTotals[group].itemCount += cat.itemCount || 0;
        }

        const totalValue = Object.values(groupTotals).reduce((sum, g) => sum + g.value, 0);

        // Convert to CategoryData array
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
    }, [allCategoryData]);

    // Story 14.14b Session 4: Real item categories data from transaction line items
    const itemCategoriesData = useMemo((): CategoryData[] => {
        return computeItemCategoryData(transactions);
    }, [transactions]);

    // Story 14.14b: Aggregate item categories by item groups
    // Story 14.14b Session 6: Use transactionIds for accurate counting (prevents double-counting)
    // Story 14.13 Session 5: Now also aggregates itemCount for count mode toggle
    // Story 14.13 Session 7: Compute unique products directly from transactions to avoid double-counting
    const itemGroupsData = useMemo((): CategoryData[] => {
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

        // Story 14.13 Session 7: Compute directly from transactions to properly count unique products per group
        transactions.forEach((tx, index) => {
            (tx.items || []).forEach(item => {
                const cat = normalizeItemCategory(item.category || 'Other');
                const itemKey = ITEM_CATEGORY_TO_KEY[cat as keyof typeof ITEM_CATEGORY_TO_KEY];
                const group = itemKey ? ITEM_CATEGORY_GROUPS[itemKey as keyof typeof ITEM_CATEGORY_GROUPS] : 'otros-item';

                groupTotals[group].value += item.totalPrice;
                groupTotals[group].transactionIds.add(tx.id ?? `tx-${index}`);

                // Track unique products by normalized name + merchant (Story 15-5a: use shared utility)
                groupTotals[group].uniqueProducts.add(buildProductKey(item.name || '', tx.merchant || ''));
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
                    count: data.transactionIds.size,  // Unique transaction count
                    itemCount: data.uniqueProducts.size,  // Story 14.13 Session 7: Unique products count
                    transactionIds: data.transactionIds,  // Keep for further aggregation
                    color: colors.bg,
                    fgColor: colors.fg,
                    percent: totalValue > 0 ? Math.round((data.value / totalValue) * 100) : 0,
                };
            })
            .filter(g => g.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [transactions]);

    // Story 14.14b Session 4: Get real subcategories from transaction line items
    const getItemSubcategories = useCallback((itemCategoryName: string): DrillDownGroupData[] => {
        const subcategoryData = computeSubcategoryData(transactions, itemCategoryName);
        // If no subcategories found in real data, return empty array
        if (subcategoryData.length === 0) {
            return [];
        }
        return subcategoryData;
    }, [transactions]);

    // Story 14.14b Session 4: Check if an item category has subcategories in real data
    const hasSubcategories = useCallback((itemCategoryName: string): boolean => {
        const subcategoryData = computeSubcategoryData(transactions, itemCategoryName);
        return subcategoryData.length > 0;
    }, [transactions]);

    // Story 14.14b: Get store categories within a store group
    // Story 14.13 Session 6: Use allCategoryData (raw store categories) instead of categoryData
    // When in store-groups mode, categoryData contains groups (supermercados), not categories (Supermarket)
    const getStoreCategoriesInGroup = useCallback((groupKey: string): CategoryData[] => {
        // Filter allCategoryData to only include categories in this group
        return allCategoryData.filter(cat => {
            const catGroup = STORE_CATEGORY_GROUPS[cat.name as keyof typeof STORE_CATEGORY_GROUPS];
            return catGroup === groupKey;
        });
    }, [allCategoryData]);

    // Story 14.13 Session 7: Get item groups dynamically for a specific store category
    // Only returns item groups that have items in transactions of that store category
    const getItemGroupsForStore = useCallback((storeCategoryName: string): CategoryData[] => {
        return computeItemGroupsForStore(transactions, storeCategoryName);
    }, [transactions]);

    // Story 14.13 Session 7: Get item categories within an item group, filtered by store category
    // This is the DYNAMIC version that shows only item categories found in both the group AND store
    const getItemCategoriesInGroupForStore = useCallback((itemGroupKey: string, storeCategoryName?: string): CategoryData[] => {
        return computeItemCategoriesInGroup(transactions, itemGroupKey, storeCategoryName);
    }, [transactions]);

    // Story 14.14b: Get drill-down data based on viewMode and current path
    // Story 14.13 Session 7: Updated to use dynamic drill-down with item groups as intermediate level
    const rawDrillDownData = useMemo((): CategoryData[] => {
        if (drillDownLevel === 0) return [];

        const path = drillDownPath;

        // Store Groups: group -> store categories -> item groups -> item categories -> subcategories
        // Story 14.13 Session 7: Added item groups as level 2
        if (viewMode === 'store-groups') {
            if (drillDownLevel === 1 && path[0]) {
                // Level 1: Store categories in this store group (STATIC)
                return getStoreCategoriesInGroup(path[0]);
            } else if (drillDownLevel === 2 && path[1]) {
                // Level 2: Item groups found in this store category (DYNAMIC)
                return getItemGroupsForStore(path[1]);
            } else if (drillDownLevel === 3 && path[2] && path[1]) {
                // Level 3: Item categories in this item group, filtered by store category (DYNAMIC)
                return getItemCategoriesInGroupForStore(path[2], path[1]);
            } else if (drillDownLevel === 4 && path[3]) {
                // Level 4: Subcategories
                return getItemSubcategories(path[3]) as CategoryData[];
            }
        }

        // Store Categories: store category -> item groups -> item categories -> subcategories
        // Story 14.13 Session 7: Added item groups as level 1
        if (viewMode === 'store-categories') {
            if (drillDownLevel === 1 && path[0]) {
                // Level 1: Item groups found in this store category (DYNAMIC)
                return getItemGroupsForStore(path[0]);
            } else if (drillDownLevel === 2 && path[1] && path[0]) {
                // Level 2: Item categories in this item group, filtered by store category (DYNAMIC)
                return getItemCategoriesInGroupForStore(path[1], path[0]);
            } else if (drillDownLevel === 3 && path[2]) {
                // Level 3: Subcategories
                return getItemSubcategories(path[2]) as CategoryData[];
            }
        }

        // Item Groups: item group -> item categories -> subcategories
        // Story 14.13 Session 7: Uses dynamic function (no store filter since we're already in item-groups mode)
        if (viewMode === 'item-groups') {
            if (drillDownLevel === 1 && path[0]) {
                // Level 1: Item categories in this item group (DYNAMIC - from all transactions)
                return getItemCategoriesInGroupForStore(path[0]);
            } else if (drillDownLevel === 2 && path[1]) {
                // Level 2: Subcategories
                return getItemSubcategories(path[1]) as CategoryData[];
            }
        }

        // Item Categories: item category -> subcategories
        if (viewMode === 'item-categories') {
            if (drillDownLevel === 1 && path[0]) {
                return getItemSubcategories(path[0]) as CategoryData[];
            }
        }

        return [];
    }, [drillDownLevel, drillDownPath, viewMode, getStoreCategoriesInGroup, getItemGroupsForStore, getItemCategoriesInGroupForStore, getItemSubcategories]);

    // Story 14.14b: Get base data based on viewMode (must be defined before drillDownCategorized)
    const viewModeBaseData = useMemo((): CategoryData[] => {
        switch (viewMode) {
            case 'store-groups':
                return storeGroupsData;
            case 'store-categories':
                return categoryData;
            case 'item-groups':
                return itemGroupsData;
            case 'item-categories':
                return itemCategoriesData;
            default:
                return categoryData;
        }
    }, [viewMode, categoryData, storeGroupsData, itemGroupsData, itemCategoriesData]);

    // Apply the same categorization logic to drill-down data (≥10% + one below + Otro)
    // Story 14.13 Session 6: Recalculate percentages relative to drill-down total (100% chart)
    const drillDownCategorized = useMemo(() => {
        if (drillDownLevel === 0) {
            return { displayCategories: viewModeBaseData, otroCategories: [] as CategoryData[], canExpand: false, canCollapse: false };
        }
        // Recalculate percentages relative to drill-down total so donut shows 100%
        const drillDownTotal = rawDrillDownData.reduce((sum, d) => sum + d.value, 0);
        const recalculatedData = rawDrillDownData.map(cat => ({
            ...cat,
            percent: drillDownTotal > 0 ? Math.round((cat.value / drillDownTotal) * 100) : 0,
        }));
        return computeTreemapCategories(recalculatedData, drillDownExpandedCount);
    }, [drillDownLevel, rawDrillDownData, drillDownExpandedCount, viewModeBaseData]);

    // Current display data - use categoryData prop at level 0 (already processed through computeTreemapCategories),
    // categorized drill-down data otherwise
    // Story 14.14b Session 5: Use categoryData prop (not internal viewModeBaseData) to match treemap display
    const displayData = useMemo(() => {
        if (drillDownLevel === 0) {
            return categoryData;  // Use the prop, which is already treemap-processed
        }
        return drillDownCategorized.displayCategories;
    }, [drillDownLevel, categoryData, drillDownCategorized]);

    // Story 14.13 Session 20: Calculate max percentage for relative bar scaling
    // The category with highest percentage gets 100% bar width, others scale proportionally
    const maxPercent = useMemo(() => {
        if (displayData.length === 0) return 1;
        return Math.max(...displayData.map(d => d.percent));
    }, [displayData]);

    // Current total based on drill-down level
    const displayTotal = useMemo(() => {
        if (drillDownLevel === 0) {
            return total;
        }
        // For drill-down levels, sum up the raw data
        if (rawDrillDownData.length > 0) {
            return rawDrillDownData.reduce((sum, d) => sum + d.value, 0);
        }
        return total;
    }, [drillDownLevel, rawDrillDownData, total]);

    // Story 14.13.3: Animated total for count-up effect in center
    const animatedTotal = useCountUp(displayTotal, {
        duration: 800,
        startValue: 0,
        key: donutAnimationKey,
    });

    // Determine expand/collapse state based on drill-down level
    const canExpand = drillDownLevel === 0 ? parentCanExpand : drillDownCategorized.canExpand;
    const canCollapse = drillDownLevel === 0 ? parentCanCollapse : drillDownCategorized.canCollapse;
    const otroCount = drillDownLevel === 0 ? parentOtroCount : drillDownCategorized.otroCategories.length;
    const expandedCount = drillDownLevel === 0 ? parentExpandedCount : drillDownExpandedCount;

    // Find selected category data
    const selectedData = selectedCategory
        ? displayData.find(c => c.name === selectedCategory)
        : null;

    // Story 14.14b Session 4+5: Handle transaction count pill click - navigate to HistoryView with filters
    // Story 14.22: Full support for all view modes and drill-down levels
    // Story 14.14b Session 7: Handle "Más" aggregated group by expanding to constituent categories
    // Story 14.13 Session 7: Respect countMode for navigation target (items vs history)
    const handleTransactionCountClick = useCallback((categoryName: string) => {
        if (!onNavigateToHistory) return;

        // Build the navigation payload based on viewMode and drill-down state
        // Story 14.13 Session 7: Target view based on countMode toggle
        // Story 14.13 Session 7: Track source view for back navigation
        const payload: HistoryNavigationPayload = {
            targetView: countMode === 'items' ? 'items' : 'history',
            sourceDistributionView: 'donut',
        };

        // Check if this is the "Más" aggregated group - expand to constituent categories
        const isAggregatedGroup = categoryName === 'Más' || categoryName === 'More';
        // Use parent's otroCategories at level 0, otherwise use drill-down's otroCategories
        const currentOtroCategories = drillDownLevel === 0 ? parentOtroCategories : drillDownCategorized.otroCategories;

        // Set the appropriate filter based on view mode and drill-down level
        if (viewMode === 'store-categories') {
            if (drillDownLevel === 0) {
                if (isAggregatedGroup && currentOtroCategories.length > 0) {
                    // "Más" contains multiple store categories - join them with comma
                    payload.category = currentOtroCategories.map(c => c.name).join(',');
                } else {
                    // At store categories level - filter by store category
                    payload.category = categoryName;
                }
            } else {
                // Drilled down - filter by parent store category
                payload.category = drillDownPath[0] || categoryName;
            }
        } else if (viewMode === 'store-groups') {
            if (drillDownLevel === 0) {
                if (isAggregatedGroup && currentOtroCategories.length > 0) {
                    // "Más" contains multiple store groups - expand each group and combine
                    const allCategories = currentOtroCategories.flatMap(c =>
                        expandStoreCategoryGroup(c.name as StoreCategoryGroup)
                    );
                    payload.category = allCategories.join(',');
                } else {
                    // At store groups level - filter by store group
                    payload.storeGroup = categoryName;
                }
            } else if (drillDownLevel === 1) {
                if (isAggregatedGroup && currentOtroCategories.length > 0) {
                    // "Más" contains multiple store categories - join them with comma
                    payload.category = currentOtroCategories.map(c => c.name).join(',');
                } else {
                    // Viewing store categories within a group - filter by store category
                    payload.category = categoryName;
                }
            } else {
                // Deeper drill-down - filter by store category from path
                payload.category = drillDownPath[1] || categoryName;
            }
        } else if (viewMode === 'item-groups') {
            if (drillDownLevel === 0) {
                if (isAggregatedGroup && currentOtroCategories.length > 0) {
                    // "Más" contains multiple item groups - expand each group and combine
                    const allItemCategories = currentOtroCategories.flatMap(c =>
                        expandItemCategoryGroup(c.name as ItemCategoryGroup)
                    );
                    payload.itemCategory = allItemCategories.join(',');
                } else {
                    // At item groups level - filter by item group
                    payload.itemGroup = categoryName;
                }
            } else {
                if (isAggregatedGroup && currentOtroCategories.length > 0) {
                    // "Más" contains multiple item categories - join them with comma
                    payload.itemCategory = currentOtroCategories.map(c => c.name).join(',');
                } else {
                    // Drilled down - filter by item category
                    payload.itemCategory = categoryName;
                }
            }
        } else if (viewMode === 'item-categories') {
            if (isAggregatedGroup && currentOtroCategories.length > 0) {
                // "Más" contains multiple item categories - join them with comma
                payload.itemCategory = currentOtroCategories.map(c => c.name).join(',');
            } else {
                // At item categories level - filter by item category
                payload.itemCategory = categoryName;
            }
        }

        // Story 14.22: Build temporal filter based on current time period selection
        if (currentPeriod) {
            payload.temporal = {
                level: timePeriod,
                year: String(currentPeriod.year),
            };
            if (timePeriod === 'month' || timePeriod === 'week') {
                payload.temporal.month = `${currentPeriod.year}-${String(currentPeriod.month).padStart(2, '0')}`;
            }
            if (timePeriod === 'quarter') {
                payload.temporal.quarter = `Q${currentPeriod.quarter}`;
            }
        }

        // Story 14.13a: Include full drill-down path for multi-dimension filtering
        // This allows ItemsView/HistoryView to filter by multiple dimensions simultaneously
        // NOTE: Skip drillDownPath for aggregated "Más" categories - they are already expanded
        // into payload.category/itemCategory above and drillDownPath would add "Más" literally
        if (!isAggregatedGroup) {
            const semanticPath = buildSemanticDrillDownPath(categoryName);
            if (Object.keys(semanticPath).length > 0) {
                payload.drillDownPath = semanticPath;
            }
        }

        onNavigateToHistory(payload);
    }, [onNavigateToHistory, viewMode, drillDownLevel, drillDownPath, timePeriod, currentPeriod, parentOtroCategories, drillDownCategorized.otroCategories, countMode, buildSemanticDrillDownPath]);

    // Story 14.14b Session 4: View mode labels for title display
    const viewModeLabels: Record<DonutViewMode, { es: string; en: string }> = {
        'store-groups': { es: 'Grupos de Compras', en: 'Purchase Groups' },
        'store-categories': { es: 'Categorías de Compras', en: 'Purchase Categories' },
        'item-groups': { es: 'Grupos de Productos', en: 'Product Groups' },
        'item-categories': { es: 'Categorías de Productos', en: 'Product Categories' },
    };

    const currentViewModeLabel = viewModeLabels[viewMode] || viewModeLabels['store-categories'];

    return (
        <div
            className="flex flex-col h-full"
            data-testid="donut-view"
        >
            {/* Story 14.13 Session 19: Header with back button immediately after title - min-h-7 ensures button fits */}
            <div className="flex items-center justify-center min-h-7 mb-1 mt-1 gap-1">
                {/* Story 14.13 Session 18: Title shows drill-down path (translated) or base view mode */}
                <span
                    className={`text-xs font-semibold uppercase tracking-wider ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                    data-testid="donut-viewmode-title"
                >
                    {drillDownLevel > 0
                        ? translateCategory(drillDownPath[drillDownPath.length - 1], locale as 'en' | 'es')
                        : (locale === 'es' ? currentViewModeLabel.es : currentViewModeLabel.en)
                    }
                </span>
                {/* Story 14.13 Session 19: Back button - immediately after title text */}
                {drillDownLevel > 0 && (
                    <button
                        onClick={handleBack}
                        className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                        style={{
                            backgroundColor: 'var(--primary)',
                            color: 'white',
                        }}
                        aria-label={locale === 'es' ? 'Volver' : 'Back'}
                        data-testid="donut-back-btn"
                    >
                        <ChevronLeft size={16} />
                    </button>
                )}
            </div>

            {/* Donut Chart with side buttons - Ring style matching mockup */}
            <div className="flex items-center justify-center gap-2 pb-2">
                {/* Menos button on left side of donut - always render for stable positioning */}
                <button
                    onClick={handleCollapse}
                    disabled={!canCollapse}
                    className="relative w-10 h-10 rounded-full flex items-center justify-center transition-all backdrop-blur-md"
                    style={{
                        backgroundColor: 'color-mix(in srgb, var(--primary) 70%, transparent)',
                        color: 'white',
                        opacity: canCollapse ? 1 : 0,
                        pointerEvents: canCollapse ? 'auto' : 'none',
                    }}
                    aria-label={locale === 'es' ? 'Mostrar menos categorías' : 'Show fewer categories'}
                    data-testid="donut-collapse-btn"
                >
                    <Minus size={18} strokeWidth={2.5} />
                    {/* Badge with count - bottom right, semi-transparent */}
                    <span
                        className="absolute -bottom-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-xs font-bold backdrop-blur-md"
                        style={{
                            backgroundColor: 'color-mix(in srgb, var(--primary) 50%, transparent)',
                            color: 'white',
                        }}
                    >
                        {expandedCount}
                    </span>
                </button>

                {/* Donut chart */}
                <div className="relative" style={{ width: '180px', height: '180px' }}>
                    <svg viewBox="0 0 120 120" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
                        {(() => {
                            const circumference = 2 * Math.PI * 52; // ~326.73
                            const gapPercent = 0.5; // 0.5% gap between segments (reduced)
                            let currentOffset = 0;
                            let segmentIndex = 0;

                            return displayData.map((cat) => {
                                if (cat.percent <= 0) return null;

                                const currentSegmentIndex = segmentIndex++;
                                const isVisible = visibleSegments.has(currentSegmentIndex);
                                const isSelected = selectedCategory === cat.name;
                                // Apply gap by reducing segment size slightly
                                const segmentPercent = Math.max(0, cat.percent - gapPercent);
                                const dashLength = (segmentPercent / 100) * circumference;
                                // Story 14.13.3: Animate from 0 to full dashLength for clockwise reveal
                                const animatedDashLength = isVisible ? dashLength : 0;
                                const strokeDasharray = `${animatedDashLength} ${circumference - animatedDashLength}`;
                                const strokeDashoffset = -currentOffset;

                                currentOffset += (cat.percent / 100) * circumference;

                                return (
                                    <circle
                                        key={`${cat.name}-${donutAnimationKey}`}
                                        cx="60"
                                        cy="60"
                                        r="52"
                                        fill="none"
                                        stroke={cat.fgColor}
                                        strokeWidth={isSelected ? 16 : 14}
                                        strokeDasharray={strokeDasharray}
                                        strokeDashoffset={strokeDashoffset}
                                        className="cursor-pointer"
                                        style={{
                                            opacity: selectedCategory && !isSelected ? 0.4 : 1,
                                            transition: 'stroke-dasharray 400ms ease-out, stroke-width 200ms ease-out, opacity 200ms ease-out',
                                        }}
                                        onClick={() => handleSegmentClick(cat.name)}
                                        data-testid={`donut-segment-${cat.name.toLowerCase().replace(/\s+/g, '-')}`}
                                    />
                                );
                            });
                        })()}
                    </svg>
                    {/* Center text - updates on segment selection (larger fonts) */}
                    {/* Story 14.13.3: Uses animated total for count-up effect */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {selectedData
                                ? formatCurrency(selectedData.value, currency)
                                : formatCurrency(animatedTotal, currency)
                            }
                        </span>
                        <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {selectedData ? (() => {
                                // Story 14.14b: Translate based on current data type
                                // Story 14.13 Session 7: Updated for new drill-down structure with item groups
                                const isShowingStoreGroups = viewMode === 'store-groups' && drillDownLevel === 0;
                                const isShowingItemGroups =
                                    (viewMode === 'item-groups' && drillDownLevel === 0) ||
                                    (viewMode === 'store-categories' && drillDownLevel === 1) ||
                                    (viewMode === 'store-groups' && drillDownLevel === 2);
                                if (isShowingStoreGroups) {
                                    return translateStoreCategoryGroup(selectedData.name, locale as 'en' | 'es');
                                } else if (isShowingItemGroups) {
                                    return translateItemCategoryGroup(selectedData.name, locale as 'en' | 'es');
                                } else {
                                    return translateCategory(selectedData.name, locale as 'en' | 'es');
                                }
                            })() : 'Total'}
                        </span>
                    </div>
                </div>

                {/* Más button on right side of donut - always render for stable positioning */}
                <button
                    onClick={handleExpand}
                    disabled={!canExpand}
                    className="relative w-10 h-10 rounded-full flex items-center justify-center transition-all backdrop-blur-md"
                    style={{
                        backgroundColor: 'color-mix(in srgb, var(--primary) 70%, transparent)',
                        color: 'white',
                        opacity: canExpand ? 1 : 0,
                        pointerEvents: canExpand ? 'auto' : 'none',
                    }}
                    aria-label={locale === 'es' ? `Mostrar más (${otroCount} en Otro)` : `Show more (${otroCount} in Other)`}
                    data-testid="donut-expand-btn"
                >
                    <Plus size={18} strokeWidth={2.5} />
                    {/* Badge with count - bottom right, semi-transparent */}
                    <span
                        className="absolute -bottom-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-xs font-bold backdrop-blur-md"
                        style={{
                            backgroundColor: 'color-mix(in srgb, var(--primary) 50%, transparent)',
                            color: 'white',
                        }}
                    >
                        {otroCount}
                    </span>
                </button>
            </div>

            {/* Story 15-TD-5: Legend extracted to DonutLegend component */}
            <DonutLegend
                displayData={displayData}
                selectedCategory={selectedCategory}
                donutAnimationKey={donutAnimationKey}
                viewMode={viewMode}
                drillDownLevel={drillDownLevel}
                currency={currency}
                locale={locale}
                isDark={isDark}
                countMode={countMode}
                maxPercent={maxPercent}
                maxDrillDownLevel={getMaxDrillDownLevel()}
                hasSubcategories={hasSubcategories}
                onSegmentClick={handleSegmentClick}
                onDrillDown={handleDrillDown}
                onIconClick={onIconClick}
                onCountClick={handleTransactionCountClick}
            />

        </div>
    );
};
