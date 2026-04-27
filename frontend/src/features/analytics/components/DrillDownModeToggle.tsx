/**
 * DrillDownModeToggle Component
 *
 * Segmented control for toggling between Temporal and Category drill-down modes.
 * Uses same styling pattern as ChartModeToggle per AC #3.
 *
 * - Temporal: Shows time period cards (Q1-Q4, months, weeks, days)
 * - Category: Shows spending category cards (Supermarket, Veterinary, etc.)
 *
 * Story 7.16: Drill-Down Section Toggle
 * @see docs/sprint-artifacts/epic7/story-7.16-drill-down-section-toggle.md
 */

import React, { useCallback } from 'react';
import { Clock, Tag } from 'lucide-react';
import { useAnalyticsNavigation } from '../hooks/useAnalyticsNavigation';
import type { DrillDownMode } from '@/types/analytics';
import { TRANSLATIONS } from '@/utils/translations';

// ============================================================================
// Types
// ============================================================================

export interface DrillDownModeToggleProps {
  /** Theme for styling (light/dark) */
  theme?: string;
  /** Locale for labels (en/es) */
  locale?: 'en' | 'es';
}

// ============================================================================
// Constants
// ============================================================================

const MODES: { mode: DrillDownMode; icon: typeof Clock; labelKey: 'drillDownTemporal' | 'drillDownCategory' }[] = [
  { mode: 'temporal', icon: Clock, labelKey: 'drillDownTemporal' },
  { mode: 'category', icon: Tag, labelKey: 'drillDownCategory' },
];

// ============================================================================
// Component
// ============================================================================

/**
 * DrillDownModeToggle Component
 *
 * Displays a segmented control to toggle between Temporal and Category drill-down modes.
 * Styled per UX spec: outlined container, active button with accent fill (same as ChartModeToggle).
 * Independent from chart mode toggle per AC #7.
 *
 * @example
 * <DrillDownModeToggle theme="light" locale="en" />
 */
export function DrillDownModeToggle({
  theme = 'light',
  locale = 'en',
}: DrillDownModeToggleProps): React.ReactElement {
  const { drillDownMode, dispatch } = useAnalyticsNavigation();

  // Get translations with fallbacks
  const t = TRANSLATIONS[locale] || TRANSLATIONS.en;
  const labels: Record<'drillDownTemporal' | 'drillDownCategory', string> = {
    drillDownTemporal: (t as { drillDownTemporal?: string }).drillDownTemporal || 'Temporal',
    drillDownCategory: (t as { drillDownCategory?: string }).drillDownCategory || 'Category',
  };

  // Handle mode toggle
  const handleToggle = useCallback(
    (mode: DrillDownMode) => {
      if (mode !== drillDownMode) {
        dispatch({ type: 'TOGGLE_DRILLDOWN_MODE' });
      }
    },
    [drillDownMode, dispatch]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, mode: DrillDownMode) => {
      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault();
          handleToggle(mode);
          break;
        case 'ArrowLeft':
        case 'ArrowRight':
          event.preventDefault();
          // Toggle between modes using arrow keys
          dispatch({ type: 'TOGGLE_DRILLDOWN_MODE' });
          break;
      }
    },
    [handleToggle, dispatch]
  );

  // ============================================================================
  // Styling - Same pattern as ChartModeToggle (AC #3)
  // ============================================================================

  const isDark = theme === 'dark';

  // Container: outlined style with secondary border, full width
  const containerClasses = [
    'flex w-full rounded-lg p-1',
    // Outlined container per UX spec
    isDark ? 'bg-slate-800' : 'bg-white',
    isDark ? 'border border-slate-500' : 'border border-slate-300',
  ].join(' ');

  // Button styling - flex-1 for even distribution
  const getButtonClasses = (isActive: boolean) => {
    return [
      'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md',
      'min-h-11',
      'transition-all duration-200',
      // Active state: accent background with white text
      isActive
        ? 'text-white font-medium'
        : isDark
          ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50',
      // Focus styles
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      isDark ? 'focus-visible:ring-offset-slate-800' : 'focus-visible:ring-offset-white',
    ].join(' ');
  };

  // Get button style for active state (uses CSS variable for theme-aware accent)
  const getButtonStyle = (isActive: boolean): React.CSSProperties => {
    if (isActive) {
      return { backgroundColor: 'var(--accent)' };
    }
    return {};
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div
      role="tablist"
      aria-label="Drill-down display mode"
      className={containerClasses}
    >
      {MODES.map(({ mode, icon: Icon, labelKey }) => {
        const isActive = drillDownMode === mode;
        return (
          <button
            key={mode}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => handleToggle(mode)}
            onKeyDown={(e) => handleKeyDown(e, mode)}
            className={getButtonClasses(isActive)}
            style={getButtonStyle(isActive)}
            data-testid={`drilldown-mode-${mode}`}
          >
            <Icon size={18} strokeWidth={2} aria-hidden="true" />
            <span className="text-sm">{labels[labelKey]}</span>
          </button>
        );
      })}
    </div>
  );
}

export default DrillDownModeToggle;
