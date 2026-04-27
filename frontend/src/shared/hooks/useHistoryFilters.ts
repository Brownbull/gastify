/**
 * useHistoryFilters Hook
 *
 * Custom hook for accessing history filter state and dispatch.
 * This is the ONLY way components should access history filter state.
 *
 * Story 9.19: History Transaction Filters
 * Story 15-7a: Migrated from HistoryFiltersContext to Zustand store.
 * @see docs/sprint-artifacts/epic9/story-9.19-history-transaction-filters.md
 */

import { useMemo, useCallback } from 'react';
import type {
  HistoryFilterState,
  HistoryFilterAction,
  TemporalFilterState,
  CategoryFilterState,
  LocationFilterState,
} from '@/types/historyFilters';
import {
  useHistoryFiltersState,
  useHistoryFiltersDispatch,
} from '@/shared/stores/useHistoryFiltersStore';
import {
  getNextTemporalPeriod,
  getPrevTemporalPeriod,
} from '../utils/historyFilterUtils';
// Story 14.15c: Group detection for smart chip labels
// Story 14.13a: Import types for drillDownPath handling
import {
  detectStoreCategoryGroup,
  detectItemCategoryGroup,
  type StoreCategoryGroup,
  type ItemCategoryGroup,
} from '@/config/categoryColors';
import {
  translateStoreCategoryGroup,
  getStoreCategoryGroupEmoji,
  translateStoreCategory,
  translateItemGroup,
  translateItemCategoryGroup,
  getItemCategoryGroupEmoji,
} from '@/utils/categoryTranslations';
import type { Language } from '@/utils/translations';

/**
 * Return type for useHistoryFilters hook.
 */
export interface UseHistoryFiltersReturn {
  /** Complete filter state */
  state: HistoryFilterState;
  /** Dispatch function for filter actions */
  dispatch: React.Dispatch<HistoryFilterAction>;

  // Convenience selectors (memoized)
  /** Current temporal filter */
  temporal: TemporalFilterState;
  /** Current category filter */
  category: CategoryFilterState;
  /** Current location filter */
  location: LocationFilterState;

  // Boolean helpers
  /** True if any filter is active */
  hasActiveFilters: boolean;
  /** Count of active filters (0-3) */
  activeFilterCount: number;
  /** True if temporal filter is active */
  hasTemporalFilter: boolean;
  /** True if category filter is active */
  hasCategoryFilter: boolean;
  /** True if location filter is active */
  hasLocationFilter: boolean;

  // Time navigation helpers (Story 14.9)
  /** Navigate to next time period at current granularity level */
  goNextPeriod: () => void;
  /** Navigate to previous time period at current granularity level */
  goPrevPeriod: () => void;
  /** True if can navigate to next period */
  canGoNext: boolean;
  /** True if can navigate to previous period */
  canGoPrev: boolean;
}

/**
 * Hook for accessing history filters.
 *
 * Story 15-7a: Now reads from Zustand store (useHistoryFiltersStore)
 * instead of React Context.
 * Story 15b-3g: HistoryFiltersProvider deleted — store initialized by useHistoryFiltersInit hook.
 *
 * @example
 * function MyComponent() {
 *   const { temporal, hasActiveFilters, dispatch } = useHistoryFilters();
 *
 *   const handleClear = () => {
 *     dispatch({ type: 'CLEAR_ALL_FILTERS' });
 *   };
 *
 *   return <div>Filters active: {hasActiveFilters ? 'Yes' : 'No'}</div>;
 * }
 */
export function useHistoryFilters(): UseHistoryFiltersReturn {
  // Story 15-7a: Read from Zustand store instead of React Context
  const state = useHistoryFiltersState();
  const dispatch = useHistoryFiltersDispatch();

  // Memoized selectors to prevent unnecessary recalculations (AC #7)
  const selectors = useMemo(() => {
    const hasTemporalFilter = state.temporal.level !== 'all';
    // Story 14.13a: Also check drillDownPath for multi-dimension filtering
    const hasCategoryFilter = state.category.level !== 'all' || Boolean(state.category.drillDownPath);
    // Story 14.36: Check for multi-select cities (selectedCities) or legacy country/city
    const hasLocationFilter = Boolean(state.location.selectedCities) || Boolean(state.location.country);

    let activeFilterCount = 0;
    if (hasTemporalFilter) activeFilterCount++;
    // Story 14.13a: Count store and item filters separately when both present in drillDownPath
    if (hasCategoryFilter) {
      const path = state.category.drillDownPath;
      const hasStoreFilter = path?.storeCategory || path?.storeGroup;
      const hasItemFilter = path?.itemGroup || path?.itemCategory || path?.subcategory;
      if (hasStoreFilter && hasItemFilter) {
        activeFilterCount += 2; // Count as 2 separate filters
      } else {
        activeFilterCount++;
      }
    }
    if (hasLocationFilter) activeFilterCount++;

    // Story 14.9: Calculate if navigation is possible
    const canGoNext = getNextTemporalPeriod(state.temporal) !== null;
    const canGoPrev = getPrevTemporalPeriod(state.temporal) !== null;

    return {
      temporal: state.temporal,
      category: state.category,
      location: state.location,
      hasTemporalFilter,
      hasCategoryFilter,
      hasLocationFilter,
      hasActiveFilters: activeFilterCount > 0,
      activeFilterCount,
      canGoNext,
      canGoPrev,
    };
  }, [state]);

  // Story 14.9: Time period navigation helpers
  const goNextPeriod = useCallback(() => {
    const nextPeriod = getNextTemporalPeriod(state.temporal);
    if (nextPeriod) {
      dispatch({ type: 'SET_TEMPORAL_FILTER', payload: nextPeriod });
    }
  }, [state.temporal, dispatch]);

  const goPrevPeriod = useCallback(() => {
    const prevPeriod = getPrevTemporalPeriod(state.temporal);
    if (prevPeriod) {
      dispatch({ type: 'SET_TEMPORAL_FILTER', payload: prevPeriod });
    }
  }, [state.temporal, dispatch]);

  return {
    state,
    dispatch,
    ...selectors,
    goNextPeriod,
    goPrevPeriod,
  };
}

/**
 * Get formatted label for temporal filter display.
 * @param temporal - Current temporal filter state
 * @param locale - Locale for date formatting ('en' | 'es')
 * @returns Human-readable label for the filter
 */
export function getTemporalFilterLabel(
  temporal: TemporalFilterState,
  locale: string = 'en'
): string {
  if (temporal.level === 'all') {
    return locale === 'es' ? 'Todo el tiempo' : 'All time';
  }

  // Story 14.16: If date range is present (ISO week from Reports), show the date range
  if (temporal.dateRange) {
    const formatShortDate = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-');
      const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      return date.toLocaleDateString(
        locale === 'es' ? 'es-ES' : 'en-US',
        { month: 'short', day: 'numeric' }
      );
    };
    const startLabel = formatShortDate(temporal.dateRange.start);
    const endLabel = formatShortDate(temporal.dateRange.end);
    return `${startLabel} - ${endLabel}`;
  }

  const parts: string[] = [];

  if (temporal.year) {
    parts.push(temporal.year);
  }

  if (temporal.month) {
    const [, monthNum] = temporal.month.split('-');
    const date = new Date(2024, parseInt(monthNum, 10) - 1, 1);
    const monthName = date.toLocaleDateString(
      locale === 'es' ? 'es-ES' : 'en-US',
      { month: 'short' }
    );
    parts.push(monthName);
  }

  if (temporal.week !== undefined) {
    parts.push(`W${temporal.week}`);
  }

  if (temporal.day) {
    const dayNum = temporal.day.split('-')[2];
    parts.push(dayNum);
  }

  return parts.join(' > ');
}

/**
 * Get formatted label for category filter display.
 * Story 14.15c: Enhanced to detect and display group names.
 *
 * @param category - Current category filter state
 * @param t - Translation function
 * @param locale - Optional locale for group translation (defaults to 'en')
 * @returns Human-readable label for the filter
 */
export function getCategoryFilterLabel(
  category: CategoryFilterState,
  t: (key: string) => string,
  locale?: string
): string {
  const lang: Language = locale === 'es' ? 'es' : 'en';

  // Story 14.13a: Handle drillDownPath multi-dimension filtering
  // When drillDownPath is present, display all accumulated dimensions
  if (category.drillDownPath) {
    const path = category.drillDownPath;
    const parts: string[] = [];

    // Add store category (most important for context)
    if (path.storeCategory) {
      // Handle comma-separated multi-select values
      const translatedCategories = path.storeCategory
        .split(',')
        .map(c => translateStoreCategory(c.trim(), lang))
        .join(',');
      parts.push(translatedCategories);
    } else if (path.storeGroup) {
      const groupEmoji = getStoreCategoryGroupEmoji(path.storeGroup as StoreCategoryGroup);
      const groupName = translateStoreCategoryGroup(path.storeGroup as StoreCategoryGroup, lang);
      parts.push(`${groupEmoji} ${groupName}`);
    }

    // Add item group or category
    if (path.itemCategory) {
      // Handle comma-separated multi-select values
      const translatedItems = path.itemCategory
        .split(',')
        .map(c => translateItemGroup(c.trim(), lang))
        .join(',');
      parts.push(translatedItems);
    } else if (path.itemGroup) {
      const groupEmoji = getItemCategoryGroupEmoji(path.itemGroup as ItemCategoryGroup);
      const groupName = translateItemCategoryGroup(path.itemGroup as ItemCategoryGroup, lang);
      parts.push(`${groupEmoji} ${groupName}`);
    }

    // Add subcategory
    if (path.subcategory) {
      parts.push(path.subcategory);
    }

    return parts.length > 0 ? parts.join(' > ') : t('allCategories');
  }

  if (category.level === 'all') {
    return t('allCategories');
  }

  // Story 14.15c: Check if multi-select category matches a known group (Store Categories)
  if (category.level === 'category' && category.category) {
    const selectedCategories = category.category.split(',').map(c => c.trim());

    // If multiple categories selected, check if they form a group
    if (selectedCategories.length > 1) {
      const detectedGroup = detectStoreCategoryGroup(selectedCategories);
      if (detectedGroup) {
        const emoji = getStoreCategoryGroupEmoji(detectedGroup);
        const name = translateStoreCategoryGroup(detectedGroup, lang);
        return `${emoji} ${name}`;
      }
      // Not a known group, show count
      return `${selectedCategories.length} ${locale === 'es' ? 'categorías' : 'categories'}`;
    }

    // Single category - translate it
    return translateStoreCategory(selectedCategories[0], lang);
  }

  // Story 14.15c: Check if multi-select item category matches a known group (Item Categories / Products)
  if (category.level === 'group' && category.group) {
    const selectedItems = category.group.split(',').map(g => g.trim());

    // If multiple items selected, check if they form a group
    if (selectedItems.length > 1) {
      const detectedGroup = detectItemCategoryGroup(selectedItems);
      if (detectedGroup) {
        const emoji = getItemCategoryGroupEmoji(detectedGroup);
        const name = translateItemCategoryGroup(detectedGroup, lang);
        return `${emoji} ${name}`;
      }
      // Not a known group, show count
      return `${selectedItems.length} ${locale === 'es' ? 'productos' : 'products'}`;
    }

    // Single item category - translate it
    return translateItemGroup(selectedItems[0], lang);
  }

  const parts: string[] = [];

  if (category.category) {
    parts.push(translateStoreCategory(category.category, lang));
  }

  if (category.group) {
    parts.push(translateItemGroup(category.group, lang));
  }

  if (category.subcategory) {
    parts.push(category.subcategory);
  }

  return parts.join(' > ');
}

/**
 * Get formatted label for location filter display.
 * Story 14.36: Extended to support multi-select cities display.
 * @param location - Current location filter state
 * @param t - Translation function
 * @param locale - Optional locale for display (defaults to 'en')
 * @returns Human-readable label for the filter
 */
export function getLocationFilterLabel(
  location: LocationFilterState,
  t: (key: string) => string,
  locale?: string
): string {
  // Story 14.36: Handle multi-select cities
  if (location.selectedCities) {
    const cities = location.selectedCities.split(',').map(c => c.trim()).filter(Boolean);
    if (cities.length === 0) {
      return t('allLocations');
    }
    if (cities.length === 1) {
      // Single city selected - show city name
      return cities[0];
    }
    // Multiple cities selected - show count
    const citiesLabel = locale === 'es' ? 'ciudades' : 'cities';
    return `${cities.length} ${citiesLabel}`;
  }

  // Legacy: no location filter
  if (!location.country) {
    return t('allLocations');
  }

  // Legacy: city selection
  if (location.city) {
    return `${location.country} > ${location.city}`;
  }

  // Legacy: country-only selection
  return location.country;
}
