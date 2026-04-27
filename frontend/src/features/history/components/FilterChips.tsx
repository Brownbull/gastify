/**
 * FilterChips Component
 *
 * Story 14.14: Transaction List Redesign (AC #3)
 * Epic 14: Core Implementation
 *
 * Displays active filters as chips below the header.
 * Each chip is tappable to remove the filter.
 * Includes "Clear All" option when multiple filters active.
 *
 * @see docs/uxui/mockups/01_views/transaction-list.html
 */

import React from 'react';
import { X, Calendar, Tag, MapPin, ShoppingBag } from 'lucide-react';
import { useHistoryFilters, getTemporalFilterLabel, getCategoryFilterLabel, getLocationFilterLabel } from '@shared/hooks/useHistoryFilters';
import { translateStoreCategory, translateItemGroup, translateItemCategoryGroup, getItemCategoryGroupEmoji } from '@/utils/categoryTranslations';
import type { ItemCategoryGroup } from '@/config/categoryColors';
import type { Language } from '@/utils/translations';

// ============================================================================
// Types
// ============================================================================

export interface FilterChipsProps {
  /** Theme (light/dark) */
  theme?: string;
  /** Locale for formatting (en/es) */
  locale?: Language;
  /** Translation function */
  t: (key: string) => string;
}

// ============================================================================
// Component
// ============================================================================

export const FilterChips: React.FC<FilterChipsProps> = ({
  locale = 'en',
  t,
}) => {
  const {
    dispatch,
    temporal,
    category,
    location,
    hasTemporalFilter,
    hasCategoryFilter,
    hasLocationFilter,
    hasActiveFilters,
  } = useHistoryFilters();

  if (!hasActiveFilters) {
    return null;
  }

  const clearTemporal = () => {
    dispatch({ type: 'CLEAR_TEMPORAL' });
  };

  const clearCategory = () => {
    dispatch({ type: 'CLEAR_CATEGORY' });
  };

  const clearLocation = () => {
    dispatch({ type: 'CLEAR_LOCATION' });
  };

  const clearAll = () => {
    dispatch({ type: 'CLEAR_ALL_FILTERS' });
  };

  // Chip styles
  const chipBase = `
    inline-flex items-center gap-1.5 px-3 py-1.5
    rounded-full text-xs font-medium
    border transition-all duration-150
    cursor-pointer hover:opacity-80
    whitespace-nowrap flex-shrink-0
  `;

  // Style for truncating long labels
  const labelStyle: React.CSSProperties = {
    maxWidth: '120px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const activeChipStyle: React.CSSProperties = {
    backgroundColor: 'var(--primary-light)',
    borderColor: 'var(--primary)',
    color: 'var(--primary)',
  };

  // Story 14.36: Stop touch event propagation to prevent temporal swipe navigation
  // when user is scrolling through filter chips horizontally
  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="flex items-center gap-2 py-2 overflow-x-auto flex-nowrap scrollbar-hide"
      role="group"
      aria-label={t('activeFilters')}
      onTouchStart={handleTouchStart}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      {/* Story 14.13b: Clear All Button at start (left side) - always visible when filters active */}
      <button
        onClick={clearAll}
        className="flex items-center justify-center w-7 h-7 rounded-full transition-all duration-150 cursor-pointer hover:bg-[var(--bg-tertiary)] flex-shrink-0"
        style={{
          color: 'var(--text-secondary)',
        }}
        aria-label={t('clearAllFilters') || (locale === 'es' ? 'Limpiar todos los filtros' : 'Clear all filters')}
        data-testid="clear-all-filters-button"
      >
        <X size={16} strokeWidth={2.5} />
      </button>

      {/* Temporal Filter Chip */}
      {hasTemporalFilter && (
        <button
          onClick={clearTemporal}
          className={chipBase}
          style={activeChipStyle}
          aria-label={`${t('remove')} ${getTemporalFilterLabel(temporal, locale)}`}
        >
          <Calendar size={14} />
          <span style={labelStyle}>{getTemporalFilterLabel(temporal, locale)}</span>
          <X size={12} className="ml-0.5" />
        </button>
      )}

      {/* Story 14.13a: When drillDownPath has both store and item filters, show separate chips */}
      {hasCategoryFilter && category.drillDownPath && (category.drillDownPath.storeCategory || category.drillDownPath.storeGroup) && (category.drillDownPath.itemGroup || category.drillDownPath.itemCategory) ? (
        <>
          {/* Store Category Chip */}
          <button
            onClick={() => {
              // Clear only the store part, keep item filter
              dispatch({
                type: 'SET_CATEGORY_FILTER',
                payload: {
                  level: 'all',
                  drillDownPath: {
                    itemGroup: category.drillDownPath?.itemGroup,
                    itemCategory: category.drillDownPath?.itemCategory,
                    subcategory: category.drillDownPath?.subcategory,
                  },
                },
              });
            }}
            className={chipBase}
            style={activeChipStyle}
            aria-label={`${t('remove')} ${
              (category.drillDownPath.storeCategory || category.drillDownPath.storeGroup || '')
                .split(',')
                .map(c => translateStoreCategory(c.trim(), locale as Language))
                .join(',')
            }`}
          >
            <Tag size={14} />
            <span style={labelStyle}>
              {(category.drillDownPath.storeCategory || category.drillDownPath.storeGroup || '')
                .split(',')
                .map(c => translateStoreCategory(c.trim(), locale as Language))
                .join(',')}
            </span>
            <X size={12} className="ml-0.5" />
          </button>
          {/* Item Group/Category Chip */}
          <button
            onClick={() => {
              // Clear only the item part, keep store filter
              dispatch({
                type: 'SET_CATEGORY_FILTER',
                payload: {
                  level: 'all',
                  drillDownPath: {
                    storeGroup: category.drillDownPath?.storeGroup,
                    storeCategory: category.drillDownPath?.storeCategory,
                  },
                },
              });
            }}
            className={chipBase}
            style={activeChipStyle}
            aria-label={`${t('remove')} ${category.drillDownPath.itemCategory || category.drillDownPath.itemGroup}`}
          >
            <ShoppingBag size={14} />
            <span style={labelStyle}>
              {category.drillDownPath.itemCategory
                ? (
                    // Translate item category (handles comma-separated multi-select)
                    category.drillDownPath.itemCategory.includes(',')
                      ? category.drillDownPath.itemCategory.split(',').map(c => translateItemGroup(c.trim(), locale as Language)).join(', ')
                      : translateItemGroup(category.drillDownPath.itemCategory, locale as Language)
                  )
                : `${getItemCategoryGroupEmoji(category.drillDownPath.itemGroup as ItemCategoryGroup)} ${translateItemCategoryGroup(category.drillDownPath.itemGroup as ItemCategoryGroup, locale as Language)}`
              }
            </span>
            <X size={12} className="ml-0.5" />
          </button>
        </>
      ) : hasCategoryFilter && (
        /* Single category filter chip (legacy or single-dimension) */
        <button
          onClick={clearCategory}
          className={chipBase}
          style={activeChipStyle}
          aria-label={`${t('remove')} ${getCategoryFilterLabel(category, t, locale)}`}
        >
          <Tag size={14} />
          <span style={labelStyle}>{getCategoryFilterLabel(category, t, locale)}</span>
          <X size={12} className="ml-0.5" />
        </button>
      )}

      {/* Location Filter Chip - Story 14.36: Updated to support multi-select display */}
      {hasLocationFilter && (
        <button
          onClick={clearLocation}
          className={chipBase}
          style={activeChipStyle}
          aria-label={`${t('remove')} ${getLocationFilterLabel(location, t, locale)}`}
          data-testid="location-filter-chip"
        >
          <MapPin size={14} />
          <span style={labelStyle}>{getLocationFilterLabel(location, t, locale)}</span>
          <X size={12} className="ml-0.5" />
        </button>
      )}

      {/* Story 14.13b: Clear All button moved to start of chips */}
    </div>
  );
};

export default FilterChips;
