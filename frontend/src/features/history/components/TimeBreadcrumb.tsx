/**
 * TimeBreadcrumb Component
 *
 * Story 14.14: Transaction List Redesign
 * Horizontal pill navigation showing temporal hierarchy.
 *
 * Features:
 * - Shows: Year > Quarter > Month > Week > Day
 * - Active level highlighted with primary color
 * - Click to drill down/up
 * - Responsive layout
 */

import React from 'react';
import { useHistoryFilters } from '@shared/hooks/useHistoryFilters';

// ============================================================================
// Types
// ============================================================================

interface TimeBreadcrumbProps {
  /** Locale for month names */
  locale?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

const getMonthName = (month: string, locale: string): string => {
  const months = locale === 'es'
    ? ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const index = parseInt(month) - 1;
  return months[index] || month;
};

const getWeekLabel = (week: number, locale: string): string => {
  // Format: "W1", "W2", etc. or "Sem 1", "Sem 2" for Spanish
  return locale === 'es' ? `Sem ${week}` : `W${week}`;
};

// ============================================================================
// Component
// ============================================================================

export function TimeBreadcrumb({
  locale = 'es',
}: TimeBreadcrumbProps): React.ReactElement | null {
  const { state, dispatch } = useHistoryFilters();
  const { temporal } = state;

  // Only show if there's some temporal filter active
  if (temporal.level === 'all') {
    return null;
  }

  // Build breadcrumb items based on current state
  const items: Array<{ label: string; level: string; isActive: boolean }> = [];

  // Year
  if (temporal.year) {
    items.push({
      label: temporal.year,
      level: 'year',
      isActive: temporal.level === 'year',
    });
  }

  // Quarter
  if (temporal.quarter && (temporal.level === 'quarter' || temporal.level === 'month' || temporal.level === 'week' || temporal.level === 'day')) {
    items.push({
      label: temporal.quarter,
      level: 'quarter',
      isActive: temporal.level === 'quarter',
    });
  }

  // Month
  if (temporal.month && (temporal.level === 'month' || temporal.level === 'week' || temporal.level === 'day')) {
    items.push({
      label: getMonthName(temporal.month, locale),
      level: 'month',
      isActive: temporal.level === 'month',
    });
  }

  // Week
  if (temporal.week && (temporal.level === 'week' || temporal.level === 'day')) {
    items.push({
      label: getWeekLabel(temporal.week, locale),
      level: 'week',
      isActive: temporal.level === 'week',
    });
  }

  // Day
  if (temporal.day && temporal.level === 'day') {
    items.push({
      label: temporal.day,
      level: 'day',
      isActive: true,
    });
  }

  const handlePillClick = (level: string) => {
    // Navigate to the clicked level
    const payload: any = { level };

    if (temporal.year) payload.year = temporal.year;
    if (level === 'quarter' || level === 'month' || level === 'week' || level === 'day') {
      if (temporal.quarter) payload.quarter = temporal.quarter;
    }
    if (level === 'month' || level === 'week' || level === 'day') {
      if (temporal.month) payload.month = temporal.month;
    }
    if (level === 'week' || level === 'day') {
      if (temporal.week) payload.week = temporal.week;
    }
    if (level === 'day') {
      if (temporal.day) payload.day = temporal.day;
    }

    dispatch({ type: 'SET_TEMPORAL_FILTER', payload });
  };

  return (
    <div className="flex items-center justify-center gap-1 py-2">
      <div className="flex items-center gap-1 flex-wrap justify-center">
        {items.map((item, index) => (
          <React.Fragment key={item.level}>
            {index > 0 && (
              <span
                className="text-sm px-0.5"
                style={{ color: 'var(--text-tertiary)' }}
              >
                ›
              </span>
            )}
            <button
              onClick={() => handlePillClick(item.level)}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium
                transition-all duration-150
                ${item.isActive ? 'font-semibold' : ''}
              `}
              style={{
                backgroundColor: item.isActive ? 'var(--primary)' : 'var(--bg-secondary)',
                color: item.isActive ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${item.isActive ? 'var(--primary)' : 'var(--border-light)'}`,
              }}
            >
              {item.label}
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default TimeBreadcrumb;
