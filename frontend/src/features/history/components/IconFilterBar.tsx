/**
 * IconFilterBar Component
 *
 * Story 14.14: Transaction List Redesign
 * Story 14.15b: Transaction Selection Mode & Groups
 * Story 15-5e: Decomposed — dropdowns extracted to IconTimeFilter + IconCategoryFilter
 *
 * Icon-only filter buttons matching the mockup design.
 * - Calendar icon for temporal filter
 * - Funnel icon for category/location filter
 * - Dropdown menus on click
 * - Active state highlighting
 */

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Filter, FunnelPlus } from 'lucide-react';
import { useHistoryFilters } from '@shared/hooks/useHistoryFilters';
import type { AvailableFilters } from '@shared/utils/historyFilterUtils';
import { TimeFilterDropdown } from './IconTimeFilter';
import { CategoryFilterDropdownMenu } from './IconCategoryFilter';

// ============================================================================
// Types
// ============================================================================

/** Story 14.14b Session 5: View mode for analytics synchronization */
type ViewMode = 'store-groups' | 'store-categories' | 'item-groups' | 'item-categories';

interface IconFilterBarProps {
  /** Available filters extracted from transactions */
  availableFilters: AvailableFilters;
  /** Translation function */
  t: (key: string) => string;
  /** Locale for date formatting */
  locale?: string;
  /** Story 14.14b Session 5: Current view mode from TrendsView for sync */
  viewMode?: ViewMode;
  /** Story 14.14b Session 5: Callback when view mode should change */
  onViewModeChange?: (mode: ViewMode) => void;
}

type DropdownType = 'time' | 'category' | 'custom' | null;

// ============================================================================
// Component
// ============================================================================

export function IconFilterBar({
  availableFilters,
  t,
  locale = 'es',
  viewMode: _viewMode, // Story 14.14b Session 5: Reserved for future bidirectional sync
  onViewModeChange,
}: IconFilterBarProps): React.ReactElement {
  const { state, dispatch, hasLocationFilter } = useHistoryFilters();
  const [openDropdown, setOpenDropdown] = useState<DropdownType>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openDropdown]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenDropdown(null);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const toggleDropdown = (type: DropdownType) => {
    setOpenDropdown(prev => prev === type ? null : type);
  };

  // Check if filters are active
  const hasTemporalFilter = state.temporal.level !== 'all';
  // Story 14.13a: Also check drillDownPath for category filter active state
  const hasCategoryFilter = state.category.level !== 'all' || Boolean(state.category.drillDownPath);
  // Story 14.36 Enhancement: Combined filter state for Funnel icon (category OR location)
  const hasCategoryOrLocationFilter = hasCategoryFilter || hasLocationFilter;

  return (
    <div ref={containerRef} className="flex items-center gap-2 relative">
      {/* Time Filter Button */}
      <button
        onClick={() => toggleDropdown('time')}
        className={`
          w-9 h-9 rounded-full flex items-center justify-center
          transition-all duration-150
          ${hasTemporalFilter
            ? 'bg-[var(--primary-light)]'
            : 'bg-[var(--bg-secondary)]'
          }
        `}
        style={{
          border: 'none',
        }}
        aria-label={t('temporalFilter')}
        aria-expanded={openDropdown === 'time'}
      >
        <Calendar
          size={20}
          strokeWidth={1.8}
          style={{
            color: hasTemporalFilter
              ? 'var(--primary)'
              : 'var(--text-secondary)'
          }}
        />
      </button>

      {/* Category/Location Filter Button - Story 14.36: FunnelPlus when filter active */}
      <button
        onClick={() => toggleDropdown('category')}
        className={`
          w-9 h-9 rounded-full flex items-center justify-center
          transition-all duration-150
          ${hasCategoryOrLocationFilter
            ? 'bg-[var(--primary-light)]'
            : 'bg-[var(--bg-secondary)]'
          }
        `}
        style={{
          border: 'none',
        }}
        aria-label={t('categoryFilter')}
        aria-expanded={openDropdown === 'category'}
      >
        {hasCategoryOrLocationFilter ? (
          <FunnelPlus
            size={20}
            strokeWidth={1.8}
            style={{ color: 'var(--primary)' }}
          />
        ) : (
          <Filter
            size={20}
            strokeWidth={1.8}
            style={{ color: 'var(--text-secondary)' }}
          />
        )}
      </button>

      {/* Time Dropdown */}
      {openDropdown === 'time' && (
        <TimeFilterDropdown
          state={state.temporal}
          dispatch={dispatch}
          availableFilters={availableFilters}
          locale={locale}
          onClose={() => setOpenDropdown(null)}
        />
      )}

      {/* Category Dropdown - Story 14.36 Enhancement: Now includes Lugar tab */}
      {openDropdown === 'category' && (
        <CategoryFilterDropdownMenu
          state={state.category}
          locationState={state.location}
          dispatch={dispatch}
          availableFilters={availableFilters}
          t={t}
          locale={locale}
          onClose={() => setOpenDropdown(null)}
          onViewModeChange={onViewModeChange}
          hasLocationFilter={hasLocationFilter}
        />
      )}


    </div>
  );
}

export default IconFilterBar;
