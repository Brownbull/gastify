/**
 * IconCategoryFilter — Category/Item/Location Filter Dropdown for IconFilterBar
 *
 * Story 15-5e: Extracted from IconFilterBar.tsx
 * Story 14.15c: Hierarchical grouped display with multi-select
 * Story 14.36: Location filter with Country→City hierarchy
 * Story 15b-2p: Further decomposition — GroupedCategoriesSection, LocationTabSection, filterAnimationStyles
 *
 * 3-State Behavior (same pattern as time filter):
 * State 1: Original — no pending changes, shows committed state
 * State 2: Pending — user selected categories but hasn't applied (yellow)
 * State 3: Applied — user clicked tab name to apply filter (primary, menu closes)
 */

import React, { useState, useMemo } from 'react';
import { Package, Receipt, MapPin, FunnelX } from 'lucide-react';
import type { AvailableFilters } from '@shared/utils/historyFilterUtils';
import {
  expandStoreCategoryGroup,
  expandItemCategoryGroup,
  type StoreCategoryGroup,
  type ItemCategoryGroup,
} from '@/config/categoryColors';
import type { HistoryFilterAction, CategoryFilterState } from '@/types/historyFilters';
import type { Language } from '@/utils/translations';
import { useLocationDisplay } from '@/hooks/useLocations';
import { GroupedCategoriesSection, storeGroupConfig, itemGroupConfig } from './GroupedCategoriesSection';
import { LocationTabSection } from './LocationTabSection';
import { ICON_SIZE_CSS, PENDING_ANIMATION_CSS } from './filterAnimationStyles';

// ============================================================================
// Types
// ============================================================================

/** Story 14.14b Session 5: View mode for analytics synchronization */
type ViewMode = 'store-groups' | 'store-categories' | 'item-groups' | 'item-categories';

/** TD-15b-25: Subset of HistoryFilterAction used by this component */
export type FilterAction = Extract<
  HistoryFilterAction,
  { type: 'CLEAR_CATEGORY' | 'CLEAR_LOCATION' | 'SET_CATEGORY_FILTER' | 'SET_LOCATION_FILTER' }
>;

export interface CategoryFilterDropdownMenuProps {
  state: {
    level: string;
    category?: string;
    group?: string;
    selectedCategories?: string[];
    selectedItems?: string[];
    drillDownPath?: {
      storeGroup?: string;
      storeCategory?: string;
      itemGroup?: string;
      itemCategory?: string;
      subcategory?: string;
    };
  };
  locationState?: {
    country?: string;
    city?: string;
    selectedCities?: string;
  };
  dispatch: (action: FilterAction) => void;
  availableFilters: AvailableFilters;
  t: (key: string) => string;
  onClose: () => void;
  locale?: string;
  onViewModeChange?: (mode: ViewMode) => void;
  hasLocationFilter?: boolean;
}

// ============================================================================
// CategoryFilterDropdownMenu
// ============================================================================

export function CategoryFilterDropdownMenu({
  state,
  locationState,
  dispatch,
  availableFilters,
  t,
  onClose,
  locale = 'es',
  onViewModeChange,
  hasLocationFilter = false,
}: CategoryFilterDropdownMenuProps) {
  const lang: Language = locale === 'es' ? 'es' : 'en';
  const { getCountryName, getCityName } = useLocationDisplay(lang);
  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0);

  // Committed state from context
  const drillDownPath = state.drillDownPath;
  const drillStoreCategory = drillDownPath?.storeCategory;
  const drillStoreGroup = drillDownPath?.storeGroup;
  const drillItemCategory = drillDownPath?.itemCategory;
  const drillItemGroup = drillDownPath?.itemGroup;

  const committedTransactions = useMemo(() => {
    if (drillStoreCategory) {
      return new Set(drillStoreCategory.split(',').map(c => c.trim()));
    }
    if (drillStoreGroup) {
      const expandedCategories = expandStoreCategoryGroup(drillStoreGroup as StoreCategoryGroup);
      return new Set(expandedCategories);
    }
    if (state.level === 'category' && state.category) {
      return new Set(state.category.split(',').map(c => c.trim()));
    }
    return new Set<string>();
  }, [state.level, state.category, drillStoreCategory, drillStoreGroup]);

  const committedItems = useMemo(() => {
    if (drillItemCategory) {
      return new Set(drillItemCategory.split(',').map(c => c.trim()));
    }
    if (drillItemGroup) {
      const expandedCategories = expandItemCategoryGroup(drillItemGroup as ItemCategoryGroup);
      return new Set(expandedCategories);
    }
    if (state.level === 'group' && state.group) {
      return new Set(state.group.split(',').map(g => g.trim()));
    }
    return new Set<string>();
  }, [state.level, state.group, drillItemCategory, drillItemGroup]);

  // Pending state - local selections not yet applied
  const [pendingTransactions, setPendingTransactions] = useState<Set<string>>(
    () => new Set(committedTransactions)
  );
  const [pendingItems, setPendingItems] = useState<Set<string>>(
    () => new Set(committedItems)
  );

  // Sync pending state when committed state changes
  const committedTransactionsKey = useMemo(
    () => Array.from(committedTransactions).sort().join(','),
    [committedTransactions]
  );
  const committedItemsKey = useMemo(
    () => Array.from(committedItems).sort().join(','),
    [committedItems]
  );

  React.useEffect(() => {
    setPendingTransactions(new Set(committedTransactions));
  }, [committedTransactionsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    setPendingItems(new Set(committedItems));
  }, [committedItemsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================================
  // Location state management
  // ============================================================================

  const cityToCountry = useMemo(() => {
    const map = new Map<string, string>();
    for (const country of availableFilters.countries) {
      const cities = availableFilters.citiesByCountry[country] || [];
      for (const city of cities) {
        map.set(city, country);
      }
    }
    return map;
  }, [availableFilters.countries, availableFilters.citiesByCountry]);

  const committedLocations = useMemo(() => {
    if (locationState?.selectedCities) {
      return new Set(locationState.selectedCities.split(',').map(c => c.trim()).filter(Boolean));
    }
    if (locationState?.city) {
      return new Set([locationState.city]);
    }
    if (locationState?.country && !locationState.city) {
      const countryCities = availableFilters.citiesByCountry[locationState.country] || [];
      return new Set(countryCities);
    }
    return new Set<string>();
  }, [locationState?.selectedCities, locationState?.city, locationState?.country, availableFilters.citiesByCountry]);

  const [pendingLocations, setPendingLocations] = useState<Set<string>>(
    () => new Set(committedLocations)
  );

  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(() => {
    return new Set(
      availableFilters.countries.filter(
        country => (availableFilters.citiesByCountry[country]?.length || 0) > 0
      )
    );
  });

  const committedLocationsKey = useMemo(
    () => Array.from(committedLocations).sort().join(','),
    [committedLocations]
  );

  React.useEffect(() => {
    setPendingLocations(new Set(committedLocations));
  }, [committedLocationsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check pending changes
  const hasPendingTransactionChanges = useMemo(() => {
    if (pendingTransactions.size !== committedTransactions.size) return true;
    for (const cat of pendingTransactions) {
      if (!committedTransactions.has(cat)) return true;
    }
    return false;
  }, [pendingTransactions, committedTransactions]);

  const hasPendingItemChanges = useMemo(() => {
    if (pendingItems.size !== committedItems.size) return true;
    for (const item of pendingItems) {
      if (!committedItems.has(item)) return true;
    }
    return false;
  }, [pendingItems, committedItems]);

  const hasPendingLocationChanges = useMemo(() => {
    if (pendingLocations.size !== committedLocations.size) return true;
    for (const loc of pendingLocations) {
      if (!committedLocations.has(loc)) return true;
    }
    return false;
  }, [pendingLocations, committedLocations]);

  // Toggle handlers
  const handleTransactionToggle = (category: string) => {
    setPendingTransactions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const handleItemToggle = (item: string) => {
    setPendingItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(item)) {
        newSet.delete(item);
      } else {
        newSet.add(item);
      }
      return newSet;
    });
  };

  const handleCityToggle = (city: string) => {
    setPendingLocations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(city)) {
        newSet.delete(city);
      } else {
        newSet.add(city);
      }
      return newSet;
    });
  };

  const handleCountryToggle = (country: string) => {
    const countryCities = availableFilters.citiesByCountry[country] || [];
    setPendingLocations(prev => {
      const newSet = new Set(prev);
      const allSelected = countryCities.every(city => newSet.has(city));
      if (allSelected) {
        countryCities.forEach(city => newSet.delete(city));
      } else {
        countryCities.forEach(city => newSet.add(city));
      }
      return newSet;
    });
  };

  const getCountrySelectionState = (country: string): 'all' | 'some' | 'none' => {
    const countryCities = availableFilters.citiesByCountry[country] || [];
    if (countryCities.length === 0) return 'none';
    const selectedInCountry = countryCities.filter(city => pendingLocations.has(city));
    if (selectedInCountry.length === 0) return 'none';
    if (selectedInCountry.length === countryCities.length) return 'all';
    return 'some';
  };

  const toggleCountryExpansion = (country: string) => {
    setExpandedCountries(prev => {
      const next = new Set(prev);
      if (next.has(country)) {
        next.delete(country);
      } else {
        next.add(country);
      }
      return next;
    });
  };

  // Apply handlers
  const applyTransactionFilter = () => {
    const pendingItemCategory = pendingItems.size > 0
      ? (pendingItems.size === 1
          ? Array.from(pendingItems)[0]
          : Array.from(pendingItems).join(','))
      : null;
    const existingItemGroup = pendingItemCategory ||
      drillDownPath?.itemGroup || drillDownPath?.itemCategory ||
      (state.level === 'group' ? state.group : undefined);

    if (pendingTransactions.size === 0 && !existingItemGroup) {
      dispatch({ type: 'CLEAR_CATEGORY' });
      onViewModeChange?.('store-categories');
    } else if (pendingTransactions.size === 0 && existingItemGroup) {
      dispatch({
        type: 'SET_CATEGORY_FILTER',
        payload: {
          level: 'group',
          group: existingItemGroup,
          drillDownPath: { itemCategory: existingItemGroup }
        }
      });
      onViewModeChange?.('store-categories');
    } else {
      const storeCategory = pendingTransactions.size === 1
        ? Array.from(pendingTransactions)[0]
        : Array.from(pendingTransactions).join(',');

      const newDrillDownPath: CategoryFilterState['drillDownPath'] = { storeCategory };
      if (existingItemGroup) {
        newDrillDownPath.itemCategory = existingItemGroup;
      }

      dispatch({
        type: 'SET_CATEGORY_FILTER',
        payload: {
          level: 'category',
          category: storeCategory,
          drillDownPath: Object.keys(newDrillDownPath).length > 0 ? newDrillDownPath : undefined
        }
      });
      onViewModeChange?.('store-categories');
    }
    onClose();
  };

  const applyItemFilter = () => {
    const pendingStoreCategory = pendingTransactions.size > 0
      ? (pendingTransactions.size === 1
          ? Array.from(pendingTransactions)[0]
          : Array.from(pendingTransactions).join(','))
      : null;
    const existingStoreCategory = pendingStoreCategory ||
      drillDownPath?.storeCategory ||
      (state.level === 'category' ? state.category : undefined);

    if (pendingItems.size === 0 && !existingStoreCategory) {
      dispatch({ type: 'CLEAR_CATEGORY' });
      onViewModeChange?.('item-categories');
    } else if (pendingItems.size === 0 && existingStoreCategory) {
      dispatch({
        type: 'SET_CATEGORY_FILTER',
        payload: {
          level: 'category',
          category: existingStoreCategory,
          drillDownPath: { storeCategory: existingStoreCategory }
        }
      });
      onViewModeChange?.('item-categories');
    } else {
      const itemCategory = pendingItems.size === 1
        ? Array.from(pendingItems)[0]
        : Array.from(pendingItems).join(',');

      const newDrillDownPath: CategoryFilterState['drillDownPath'] = { itemCategory };
      if (existingStoreCategory) {
        newDrillDownPath.storeCategory = existingStoreCategory;
      }

      dispatch({
        type: 'SET_CATEGORY_FILTER',
        payload: {
          level: 'group',
          group: itemCategory,
          drillDownPath: Object.keys(newDrillDownPath).length > 0 ? newDrillDownPath : undefined
        }
      });
      onViewModeChange?.('item-categories');
    }
    onClose();
  };

  const applyLocationFilter = () => {
    if (pendingLocations.size === 0) {
      dispatch({ type: 'CLEAR_LOCATION' });
    } else {
      const cityArray = Array.from(pendingLocations);
      const countries = new Set(cityArray.map(c => cityToCountry.get(c)).filter(Boolean));
      const primaryCountry = countries.size === 1
        ? Array.from(countries)[0]
        : (cityArray.length > 0 ? cityToCountry.get(cityArray[0]) : undefined);

      dispatch({
        type: 'SET_LOCATION_FILTER',
        payload: {
          country: primaryCountry,
          selectedCities: cityArray.join(','),
        }
      });
    }
    onClose();
  };

  const clearFilter = () => {
    setPendingTransactions(new Set());
    setPendingItems(new Set());
    setPendingLocations(new Set());
    dispatch({ type: 'CLEAR_CATEGORY' });
    dispatch({ type: 'CLEAR_LOCATION' });
    onClose();
  };

  // Visual state
  const hasFilter = committedTransactions.size > 0 || committedItems.size > 0 || committedLocations.size > 0;

  const isTransactionsActive = (state.level === 'category' && committedTransactions.size > 0) ||
    Boolean(drillStoreCategory || drillStoreGroup);
  const isItemsActive = (state.level === 'group' && committedItems.size > 0) ||
    Boolean(drillItemGroup || drillItemCategory);
  const isLocationActive = hasLocationFilter || committedLocations.size > 0;
  const isTransactionsPending = hasPendingTransactionChanges && activeTab === 0;
  const isItemsPending = hasPendingItemChanges && activeTab === 1;
  const isLocationsPending = hasPendingLocationChanges && activeTab === 2;

  const sortedCountries = useMemo(() => {
    return [...availableFilters.countries].sort((a, b) =>
      getCountryName(a).localeCompare(getCountryName(b), lang)
    );
  }, [availableFilters.countries, getCountryName, lang]);

  return (
    <div
      className="fixed mt-2 rounded-xl overflow-hidden"
      style={{
        zIndex: 70,
        backgroundColor: 'var(--bg-secondary)',
        boxShadow: 'var(--shadow-lg, 0 10px 15px -3px rgba(0,0,0,0.1))',
        border: '1px solid var(--border-light)',
        top: '7rem',
        left: '1rem',
        right: '1rem',
        maxWidth: '20rem',
        marginLeft: 'auto',
      }}
    >
      {/* Header with tabs */}
      <div
        className="flex items-stretch"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        {/* Transactions Tab */}
        <button
          onClick={() => {
            if (activeTab === 0 && (isTransactionsPending || pendingTransactions.size > 0)) {
              applyTransactionFilter();
            } else {
              setActiveTab(0);
            }
          }}
          className={`flex-1 py-2.5 flex items-center justify-center transition-all ${isTransactionsPending ? 'pending-pulse' : ''}`}
          style={{
            backgroundColor: isTransactionsPending
              ? 'var(--warning-light, rgba(245, 158, 11, 0.15))'
              : isTransactionsActive
                ? 'var(--primary-light)'
                : activeTab === 0
                  ? 'var(--bg-secondary)'
                  : 'transparent',
            borderBottom: activeTab === 0
              ? '3px solid var(--primary)'
              : '3px solid transparent',
          }}
          title={isTransactionsPending
            ? (locale === 'es' ? 'Clic para aplicar filtro' : 'Click to apply filter')
            : (locale === 'es' ? 'Compras' : 'Purchases')
          }
          aria-label={locale === 'es' ? 'Filtrar por compras' : 'Filter by purchases'}
        >
          <Receipt
            className="filter-tab-icon"
            strokeWidth={1.8}
            style={{
              color: isTransactionsPending
                ? 'var(--warning, #f59e0b)'
                : isTransactionsActive || activeTab === 0
                  ? 'var(--primary)'
                  : 'var(--text-secondary)',
            }}
          />
        </button>

        {/* Products Tab */}
        <button
          onClick={() => {
            if (activeTab === 1 && (isItemsPending || pendingItems.size > 0)) {
              applyItemFilter();
            } else {
              setActiveTab(1);
            }
          }}
          className={`flex-1 py-2.5 flex items-center justify-center transition-all ${isItemsPending ? 'pending-pulse' : ''}`}
          style={{
            backgroundColor: isItemsPending
              ? 'var(--warning-light, rgba(245, 158, 11, 0.15))'
              : isItemsActive
                ? 'var(--primary-light)'
                : activeTab === 1
                  ? 'var(--bg-secondary)'
                  : 'transparent',
            borderBottom: activeTab === 1
              ? '3px solid var(--primary)'
              : '3px solid transparent',
          }}
          title={isItemsPending
            ? (locale === 'es' ? 'Clic para aplicar filtro' : 'Click to apply filter')
            : (locale === 'es' ? 'Productos' : 'Products')
          }
          aria-label={locale === 'es' ? 'Filtrar por productos' : 'Filter by products'}
        >
          <Package
            className="filter-tab-icon"
            strokeWidth={1.8}
            style={{
              color: isItemsPending
                ? 'var(--warning, #f59e0b)'
                : isItemsActive || activeTab === 1
                  ? 'var(--primary)'
                  : 'var(--text-secondary)',
            }}
          />
        </button>

        {/* Location Tab */}
        <button
          onClick={() => {
            if (activeTab === 2 && (isLocationsPending || pendingLocations.size > 0)) {
              applyLocationFilter();
            } else {
              setActiveTab(2);
            }
          }}
          className={`flex-1 py-2.5 flex items-center justify-center transition-all ${isLocationsPending ? 'pending-pulse' : ''}`}
          style={{
            backgroundColor: isLocationsPending
              ? 'var(--warning-light, rgba(245, 158, 11, 0.15))'
              : isLocationActive
                ? 'var(--primary-light)'
                : activeTab === 2
                  ? 'var(--bg-secondary)'
                  : 'transparent',
            borderBottom: activeTab === 2
              ? '3px solid var(--primary)'
              : '3px solid transparent',
          }}
          title={isLocationsPending
            ? (locale === 'es' ? 'Clic para aplicar filtro' : 'Click to apply filter')
            : (locale === 'es' ? 'Ubicación' : 'Location')
          }
          aria-label={locale === 'es' ? 'Filtrar por ubicación' : 'Filter by location'}
        >
          <MapPin
            className="filter-tab-icon"
            strokeWidth={1.8}
            style={{
              color: isLocationsPending
                ? 'var(--warning, #f59e0b)'
                : isLocationActive || activeTab === 2
                  ? 'var(--primary)'
                  : 'var(--text-secondary)',
            }}
          />
        </button>

        {/* Clear filter button */}
        {hasFilter && (
          <button
            onClick={clearFilter}
            className="px-3 py-2.5 flex items-center justify-center transition-all"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderLeft: '1px solid var(--border-light)',
            }}
            title={locale === 'es' ? 'Limpiar filtros' : 'Clear filters'}
            aria-label={locale === 'es' ? 'Limpiar todos los filtros' : 'Clear all filters'}
          >
            <FunnelX
              className="filter-tab-icon-clear"
              strokeWidth={1.8}
              style={{ color: 'var(--text-secondary)' }}
            />
          </button>
        )}
      </div>

      {/* Icon size styles */}
      <style>{ICON_SIZE_CSS}</style>

      {/* Category/Item/Location List */}
      <div className="max-h-80 overflow-y-auto p-2 space-y-2">
        {activeTab === 0 && (
          <GroupedCategoriesSection
            config={storeGroupConfig}
            selectedCategories={pendingTransactions}
            onCategoryToggle={handleTransactionToggle}
            onGroupToggle={(_group, categories, isCurrentlySelected) => {
              setPendingTransactions(prev => {
                const newSet = new Set(prev);
                if (isCurrentlySelected) {
                  categories.forEach(cat => newSet.delete(cat));
                } else {
                  categories.forEach(cat => newSet.add(cat));
                }
                return newSet;
              });
            }}
            lang={lang}
          />
        )}
        {activeTab === 1 && (
          <GroupedCategoriesSection
            config={itemGroupConfig}
            selectedCategories={pendingItems}
            onCategoryToggle={handleItemToggle}
            onGroupToggle={(_group, categories, isCurrentlySelected) => {
              setPendingItems(prev => {
                const newSet = new Set(prev);
                if (isCurrentlySelected) {
                  categories.forEach(cat => newSet.delete(cat));
                } else {
                  categories.forEach(cat => newSet.add(cat));
                }
                return newSet;
              });
            }}
            lang={lang}
          />
        )}
        {activeTab === 2 && (
          <LocationTabSection
            sortedCountries={sortedCountries}
            availableFilters={availableFilters}
            expandedCountries={expandedCountries}
            pendingLocations={pendingLocations}
            getCountryName={getCountryName}
            getCityName={getCityName}
            getCountrySelectionState={getCountrySelectionState}
            toggleCountryExpansion={toggleCountryExpansion}
            handleCountryToggle={handleCountryToggle}
            handleCityToggle={handleCityToggle}
            t={t}
            lang={lang}
          />
        )}
      </div>

      {/* Pending animation styles — conditional render preserved */}
      {(isTransactionsPending || isItemsPending || isLocationsPending) && (
        <style>{PENDING_ANIMATION_CSS}</style>
      )}
    </div>
  );
}
