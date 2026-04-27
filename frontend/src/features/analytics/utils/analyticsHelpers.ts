/**
 * Analytics Helper Functions
 *
 * Provides validation and utility functions for analytics navigation state.
 *
 * @see docs/architecture-epic7.md - State Validation Function
 */

import type {
  AnalyticsNavigationState,
  TemporalPosition,
  CategoryPosition,
} from '@/types/analytics';
import { getQuarterFromMonth } from '@/utils/date';
// Re-export for backward compatibility
export { getQuarterFromMonth };

/**
 * Creates the default navigation state for a given year.
 * Used when resetting or when invalid state is detected.
 *
 * @param year - The year to use (e.g., "2024")
 * @returns Default AnalyticsNavigationState at year level with no category filter
 */
export function getDefaultNavigationState(year: string): AnalyticsNavigationState {
  return {
    temporal: { level: 'year', year },
    category: { level: 'all' },
    chartMode: 'aggregation',
    drillDownMode: 'temporal', // Story 7.16: Default to temporal (AC #6)
  };
}

/**
 * Validates and auto-corrects impossible navigation states.
 *
 * Catches states like:
 * - Week without month (impossible - weeks are month-aligned)
 * - Day without month (impossible - days require month context)
 * - Month without auto-derived quarter (should be auto-filled)
 * - Subcategory without group (impossible hierarchy)
 * - Group without category (impossible hierarchy)
 *
 * When an invalid state is detected, it logs a warning and returns a corrected state.
 *
 * @param state - The navigation state to validate
 * @returns Validated (and possibly corrected) navigation state
 */
export function validateNavigationState(
  state: AnalyticsNavigationState
): AnalyticsNavigationState {
  const { temporal, category, chartMode, drillDownMode } = state;

  // Validate temporal hierarchy consistency
  const validatedTemporal = validateTemporalPosition(temporal);
  const validatedCategory = validateCategoryPosition(category);

  // Return validated state (drillDownMode doesn't need validation - it's always valid)
  return {
    temporal: validatedTemporal,
    category: validatedCategory,
    chartMode,
    drillDownMode: drillDownMode ?? 'temporal', // Fallback for backwards compat
  };
}

/**
 * Validates temporal position and auto-corrects invalid states.
 *
 * @internal
 */
function validateTemporalPosition(temporal: TemporalPosition): TemporalPosition {
  const { level, year, quarter, month, week } = temporal;

  // Day level requires month
  if (level === 'day' && !month) {
    console.warn('Invalid state: day without month, resetting to year');
    return { level: 'year', year };
  }

  // Week level requires month
  if (level === 'week' && !month) {
    console.warn('Invalid state: week without month, resetting to year');
    return { level: 'year', year };
  }

  // Month level should have quarter auto-derived
  if (level === 'month' && month && !quarter) {
    const derivedQuarter = getQuarterFromMonth(month);
    console.warn(`Auto-deriving quarter from month: ${derivedQuarter}`);
    return { ...temporal, quarter: derivedQuarter };
  }

  // Quarter level should have quarter set
  if (level === 'quarter' && !quarter) {
    console.warn('Invalid state: quarter level without quarter value, resetting to year');
    return { level: 'year', year };
  }

  // Week level should have quarter auto-derived from month if missing
  if (level === 'week' && month && !quarter) {
    const derivedQuarter = getQuarterFromMonth(month);
    return { ...temporal, quarter: derivedQuarter };
  }

  // Day level should have quarter auto-derived from month if missing
  if (level === 'day' && month && !quarter) {
    const derivedQuarter = getQuarterFromMonth(month);
    return { ...temporal, quarter: derivedQuarter };
  }

  // Ensure week is within valid range (1-5)
  if (week !== undefined && (week < 1 || week > 5)) {
    console.warn(`Invalid week index: ${week}, clamping to valid range`);
    return { ...temporal, week: Math.max(1, Math.min(5, week)) };
  }

  return temporal;
}

/**
 * Validates category position and auto-corrects invalid states.
 *
 * @internal
 */
function validateCategoryPosition(category: CategoryPosition): CategoryPosition {
  const { level, category: cat, group } = category;

  // Subcategory level requires group
  if (level === 'subcategory' && !group) {
    console.warn('Invalid state: subcategory without group, clearing filter');
    return { level: 'all' };
  }

  // Group level requires category
  if (level === 'group' && !cat) {
    console.warn('Invalid state: group without category, clearing filter');
    return { level: 'all' };
  }

  // Category level requires category value
  if (level === 'category' && !cat) {
    console.warn('Invalid state: category level without category value, clearing filter');
    return { level: 'all' };
  }

  // Subcategory level should also have category set
  if (level === 'subcategory' && !cat) {
    console.warn('Invalid state: subcategory without category, clearing filter');
    return { level: 'all' };
  }

  return category;
}

/**
 * Get the current year as a string.
 * Used for initializing default navigation state.
 */
export function getCurrentYear(): string {
  return new Date().getFullYear().toString();
}
