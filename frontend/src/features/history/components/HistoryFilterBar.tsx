/**
 * HistoryFilterBar Component
 *
 * Container component for all history filter dropdowns.
 * Displays temporal, category, and location filters with active count badge.
 *
 * Story 9.19: History Transaction Filters (AC #1)
 * @see docs/sprint-artifacts/epic9/story-9.19-history-transaction-filters.md
 */

import React from 'react';
import { X } from 'lucide-react';
import { TemporalFilterDropdown } from './TemporalFilterDropdown';
import { CategoryFilterDropdown } from './CategoryFilterDropdown';
import { LocationFilterDropdown } from './LocationFilterDropdown';
import { useHistoryFilters } from '@shared/hooks/useHistoryFilters';
import type { AvailableFilters } from '@shared/utils/historyFilterUtils';

// ============================================================================
// Types
// ============================================================================

interface HistoryFilterBarProps {
  /** Available filters extracted from transactions */
  availableFilters: AvailableFilters;
  /** Theme for styling (light/dark) */
  theme?: string;
  /** Locale for date formatting and translations (en/es) */
  locale?: string;
  /** Translation function */
  t: (key: string) => string;
  /** Total transaction count (before filtering) */
  totalCount: number;
  /** Filtered transaction count */
  filteredCount: number;
}

// ============================================================================
// Component
// ============================================================================

export function HistoryFilterBar({
  availableFilters,
  theme = 'light',
  locale = 'en',
  t,
  totalCount,
  filteredCount,
}: HistoryFilterBarProps): React.ReactElement {
  const { dispatch, hasActiveFilters, activeFilterCount } = useHistoryFilters();
  const isDark = theme === 'dark';

  const handleClearAll = () => {
    dispatch({ type: 'CLEAR_ALL_FILTERS' });
  };

  // ============================================================================
  // Styling
  // ============================================================================

  const containerClasses = [
    'flex flex-col gap-3 mb-4 pb-3',
    'border-b',
    isDark ? 'border-slate-700' : 'border-slate-200',
  ].join(' ');

  const filterRowClasses = [
    'flex flex-wrap items-center gap-2',
  ].join(' ');

  const clearButtonClasses = [
    'flex items-center gap-1 px-3 py-2 rounded-lg',
    'min-h-11', // 44px touch target (AC #6)
    'text-sm font-medium',
    'transition-all duration-200',
    isDark
      ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
      : 'bg-red-50 text-red-600 hover:bg-red-100',
    'focus:outline-none focus:ring-2 focus:ring-red-500',
  ].join(' ');

  const badgeClasses = [
    'px-2 py-0.5 rounded-full text-xs font-semibold',
    'bg-accent text-white',
  ].join(' ');

  const resultCountClasses = [
    'text-sm',
    isDark ? 'text-slate-400' : 'text-slate-500',
  ].join(' ');

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={containerClasses}>
      {/* Filter row */}
      <div className={filterRowClasses}>
        {/* Temporal Filter */}
        <TemporalFilterDropdown
          availableFilters={availableFilters}
          theme={theme}
          locale={locale}
          t={t}
        />

        {/* Category Filter */}
        <CategoryFilterDropdown
          availableFilters={availableFilters}
          theme={theme}
          locale={locale}
          t={t}
        />

        {/* Location Filter */}
        <LocationFilterDropdown
          availableFilters={availableFilters}
          theme={theme}
          t={t}
        />

        {/* Clear All Button + Badge (AC #1) */}
        {hasActiveFilters && (
          <>
            <button
              onClick={handleClearAll}
              className={clearButtonClasses}
              aria-label={t('clearFilters')}
            >
              <X size={16} />
              <span className="hidden sm:inline">{t('clearFilters')}</span>
            </button>
            {/* Active filter count badge */}
            <span
              className={badgeClasses}
              style={{ backgroundColor: 'var(--accent)' }}
              aria-label={t('activeFilters').replace('{count}', String(activeFilterCount))}
            >
              {activeFilterCount}
            </span>
          </>
        )}
      </div>

      {/* Results count (AC #5) */}
      <div className={resultCountClasses}>
        {hasActiveFilters ? (
          <span>
            {t('showingResults')
              .replace('{count}', String(filteredCount))
              .replace('{total}', String(totalCount))}
          </span>
        ) : (
          <span>
            {totalCount} {t('transactions')}
          </span>
        )}
      </div>
    </div>
  );
}

export default HistoryFilterBar;
