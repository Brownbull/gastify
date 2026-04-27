import {
    expandStoreCategoryGroup,
    expandItemCategoryGroup,
    type StoreCategoryGroup,
    type ItemCategoryGroup,
} from '@/config/categoryColors';
import type { HistoryNavigationPayload, DrillDownPath } from '@features/analytics/utils/analyticsToHistoryFilters';
import type { TreemapViewMode } from './types';
import type { CategoryDataEntry } from './categoryDataHelpers';

export interface BuildTreemapCellNavigationPayloadParams {
    categoryName: string;
    treemapViewMode: TreemapViewMode;
    selectedMonth: { year: number; month: number };
    selectedMonthString: string;
    countMode: 'transactions' | 'items';
    storeCategoriesOtro: CategoryDataEntry[];
    storeGroupsOtro: CategoryDataEntry[];
    itemCategoriesOtro: CategoryDataEntry[];
    itemGroupsOtro: CategoryDataEntry[];
}

export function buildTreemapCellNavigationPayload({
    categoryName,
    treemapViewMode,
    selectedMonth,
    selectedMonthString,
    countMode,
    storeCategoriesOtro,
    storeGroupsOtro,
    itemCategoriesOtro,
    itemGroupsOtro,
}: BuildTreemapCellNavigationPayloadParams): HistoryNavigationPayload {
    const payload: HistoryNavigationPayload = {
        targetView: countMode === 'items' ? 'items' : 'history',
        temporal: {
            level: 'month',
            year: String(selectedMonth.year),
            month: selectedMonthString,
        },
        sourceDistributionView: 'treemap',
    };

    const isAggregatedGroup = categoryName === 'Más' || categoryName === 'More';

    switch (treemapViewMode) {
        case 'store-groups':
            if (isAggregatedGroup && storeGroupsOtro.length > 0) {
                const allCategories = storeGroupsOtro.flatMap(c =>
                    expandStoreCategoryGroup(c.name as StoreCategoryGroup)
                );
                payload.category = allCategories.join(',');
            } else {
                payload.storeGroup = categoryName;
            }
            break;
        case 'store-categories':
            if (isAggregatedGroup && storeCategoriesOtro.length > 0) {
                payload.category = storeCategoriesOtro.map(c => c.name).join(',');
            } else {
                payload.category = categoryName;
            }
            break;
        case 'item-groups':
            if (isAggregatedGroup && itemGroupsOtro.length > 0) {
                const allItemCategories = itemGroupsOtro.flatMap(c =>
                    expandItemCategoryGroup(c.name as ItemCategoryGroup)
                );
                payload.itemCategory = allItemCategories.join(',');
            } else {
                payload.itemGroup = categoryName;
            }
            break;
        case 'item-categories':
            if (isAggregatedGroup && itemCategoriesOtro.length > 0) {
                payload.itemCategory = itemCategoriesOtro.map(c => c.name).join(',');
            } else {
                payload.itemCategory = categoryName;
            }
            break;
    }

    if (!isAggregatedGroup) {
        const dashboardPath: DrillDownPath = {};
        switch (treemapViewMode) {
            case 'store-groups':
                dashboardPath.storeGroup = categoryName;
                break;
            case 'store-categories':
                dashboardPath.storeCategory = categoryName;
                break;
            case 'item-groups':
                dashboardPath.itemGroup = categoryName;
                break;
            case 'item-categories':
                dashboardPath.itemCategory = categoryName;
                break;
        }
        if (Object.keys(dashboardPath).length > 0) {
            payload.drillDownPath = dashboardPath;
        }
    }

    return payload;
}
