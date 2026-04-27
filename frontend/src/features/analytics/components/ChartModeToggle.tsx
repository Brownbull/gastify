/**
 * ChartModeToggle Component
 *
 * Segmented control for toggling between Aggregation and Comparison chart modes.
 * Matches UX spec: outlined container with secondary border, active button filled with accent color.
 *
 * - Aggregation: Shows "what" (pie/bar by category)
 * - Comparison: Shows "when" (grouped bar comparing time periods)
 *
 * @see docs/architecture-epic7.md - ADR-011: Chart Registry Pattern
 * @see docs/sprint-artifacts/epic7/story-7.4-chart-mode-toggle-registry.md
 * @see docs/sprint-artifacts/epic7/story-7.9-ux-breadcrumb-alignment.md - UX redesign
 */

import React, { useCallback, useEffect } from 'react';
import { PieChart, BarChart2 } from 'lucide-react';
import { useAnalyticsNavigation, supportsComparisonMode } from '../hooks/useAnalyticsNavigation';
import type { ChartMode } from '@/types/analytics';
import { TRANSLATIONS } from '@/utils/translations';

// ============================================================================
// Types
// ============================================================================

export interface ChartModeToggleProps {
  /** Theme for styling (light/dark) */
  theme?: string;
  /** Locale for labels (en/es) */
  locale?: 'en' | 'es';
  /** Whether toggle should fill full width (default: false) */
  fullWidth?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const MODES: { mode: ChartMode; icon: typeof PieChart; labelKey: 'aggregation' | 'comparison' }[] = [
  { mode: 'aggregation', icon: PieChart, labelKey: 'aggregation' },
  { mode: 'comparison', icon: BarChart2, labelKey: 'comparison' },
];

// ============================================================================
// Component
// ============================================================================

/**
 * ChartModeToggle Component
 *
 * Displays a segmented control to toggle between Aggregation and Comparison modes.
 * Styled per UX spec: outlined container, active button with accent fill.
 * Hidden at Day level (no children to compare per AC #8).
 *
 * @example
 * <ChartModeToggle theme="light" locale="en" />
 */
export function ChartModeToggle({
  theme = 'light',
  locale = 'en',
  fullWidth = false,
}: ChartModeToggleProps): React.ReactElement | null {
  const { chartMode, temporalLevel, dispatch } = useAnalyticsNavigation();

  // AC #8: Day level toggle hiding - check if comparison mode is available
  const comparisonAvailable = supportsComparisonMode(temporalLevel);

  // Get translations with fallbacks
  const t = TRANSLATIONS[locale] || TRANSLATIONS.en;
  const labels: Record<'aggregation' | 'comparison', string> = {
    aggregation: (t as { aggregation?: string }).aggregation || 'Aggregation',
    comparison: (t as { comparison?: string }).comparison || 'Comparison',
  };

  // Handle mode toggle
  // IMPORTANT: All hooks must be called before any early return
  const handleToggle = useCallback(
    (mode: ChartMode) => {
      if (mode !== chartMode) {
        dispatch({ type: 'TOGGLE_CHART_MODE' });
      }
    },
    [chartMode, dispatch]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, mode: ChartMode) => {
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
          dispatch({ type: 'TOGGLE_CHART_MODE' });
          break;
      }
    },
    [handleToggle, dispatch]
  );

  // Auto-switch to aggregation if at Day level and currently in comparison mode
  useEffect(() => {
    if (!comparisonAvailable && chartMode === 'comparison') {
      dispatch({ type: 'TOGGLE_CHART_MODE' });
    }
  }, [comparisonAvailable, chartMode, dispatch]);

  // Hide toggle at Day level (AFTER all hooks are called)
  if (!comparisonAvailable) {
    return null;
  }

  // ============================================================================
  // Styling - UX Spec Aligned (Story 7.9)
  // ============================================================================

  const isDark = theme === 'dark';

  // Container: outlined style with secondary border per UX spec (AC #9)
  // Note: Using isDark conditional instead of dark: prefix (app uses prop-based theming)
  // Story 7.14: Support fullWidth mode for better UX alignment
  const containerClasses = [
    fullWidth ? 'flex w-full' : 'inline-flex',
    'rounded-lg p-1',
    // Outlined container per UX spec - conditional based on theme prop
    isDark ? 'bg-slate-800' : 'bg-white',
    isDark ? 'border border-slate-500' : 'border border-slate-300',
  ].join(' ');

  // Button styling per UX spec (AC #9, #10)
  // Story 7.14: Buttons use flex-1 when fullWidth for even distribution
  // Uses CSS custom properties for theme-aware accent color (--accent)
  const getButtonClasses = (isActive: boolean) => {
    return [
      // Full width: distribute space evenly (Story 7.14)
      fullWidth ? 'flex-1' : '',
      // Base styles - justify-center for centered content when fullWidth
      'flex items-center justify-center gap-2 px-4 py-2 rounded-md',
      // Touch target
      'min-h-11',
      // Transition for smooth feedback
      'transition-all duration-200',
      // Active state: accent background with white text (AC #9)
      // Using inline style for accent since it's a CSS variable
      isActive
        ? 'text-white font-medium'
        : isDark
          ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50',
      // Focus styles - use accent color for ring too
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
      aria-label="Chart display mode"
      className={containerClasses}
    >
      {MODES.map(({ mode, icon: Icon, labelKey }) => {
        const isActive = chartMode === mode;
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
            data-testid={`chart-mode-${mode}`}
          >
            <Icon size={18} strokeWidth={2} aria-hidden="true" />
            <span className="text-sm">{labels[labelKey]}</span>
          </button>
        );
      })}
    </div>
  );
}

export default ChartModeToggle;
