/**
 * Chart Mode Registry
 *
 * Provides mapping between temporal levels and comparison children labels.
 * Used by ChartModeToggle and comparison mode charts to determine what
 * periods to display.
 *
 * Week Calculation: Uses month-aligned chunks (Oct 1-7, 8-14, etc.) NOT ISO weeks.
 *
 * @see docs/architecture-epic7.md - ADR-012: Month-Aligned Week Chunks
 * @see docs/sprint-artifacts/epic7/story-7.4-chart-mode-toggle-registry.md
 */

import type { TemporalLevel, TemporalPosition } from '@/types/analytics';

// ============================================================================
// Types
// ============================================================================

export type ComparisonChildType = 'quarters' | 'months' | 'weeks' | 'days';

export interface ChartModeConfig {
  level: TemporalLevel;
  comparisonAvailable: boolean;
  comparisonChildType: ComparisonChildType | null;
}

// ============================================================================
// Month/Quarter Helpers
// ============================================================================

/**
 * Gets the months for a given quarter.
 * Q1 = Jan, Feb, Mar | Q2 = Apr, May, Jun | Q3 = Jul, Aug, Sep | Q4 = Oct, Nov, Dec
 */
function getMonthsInQuarter(quarter: string): number[] {
  switch (quarter) {
    case 'Q1':
      return [1, 2, 3];
    case 'Q2':
      return [4, 5, 6];
    case 'Q3':
      return [7, 8, 9];
    case 'Q4':
      return [10, 11, 12];
    default:
      return [1, 2, 3]; // Default to Q1
  }
}

/**
 * Gets month name from month number using Intl.
 */
function getMonthName(monthNum: number, year: string, locale: string): string {
  const date = new Date(parseInt(year, 10), monthNum - 1, 1);
  return date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { month: 'long' });
}

/**
 * Gets short month name from month number.
 */
function getShortMonthName(monthNum: number, year: string, locale: string): string {
  const date = new Date(parseInt(year, 10), monthNum - 1, 1);
  return date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { month: 'short' });
}

/**
 * Gets localized day names (Mon, Tue, etc. OR Lun, Mar, etc.).
 */
function getDayNames(locale: string): string[] {
  const dayNames: string[] = [];
  // Start from a known Monday (Jan 4, 2021 was a Monday)
  for (let i = 0; i < 7; i++) {
    const date = new Date(2021, 0, 4 + i);
    dayNames.push(
      date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { weekday: 'short' })
    );
  }
  return dayNames;
}

/**
 * Gets weeks in a month with date range labels.
 * Uses month-aligned chunks: Oct 1-7, Oct 8-14, Oct 15-21, Oct 22-28, Oct 29-31.
 */
function getWeeksInMonth(year: string, monthNum: number, locale: string): string[] {
  const weeks: string[] = [];
  const daysInMonth = new Date(parseInt(year, 10), monthNum, 0).getDate();
  const shortMonth = getShortMonthName(monthNum, year, locale);

  let weekStart = 1;
  while (weekStart <= daysInMonth) {
    const weekEnd = Math.min(weekStart + 6, daysInMonth);
    weeks.push(`${shortMonth} ${weekStart}-${weekEnd}`);
    weekStart = weekEnd + 1;
  }

  return weeks;
}

// ============================================================================
// Chart Mode Registry
// ============================================================================

/**
 * Registry mapping temporal levels to comparison configuration.
 */
const chartModeRegistry: Record<TemporalLevel, ChartModeConfig> = {
  year: {
    level: 'year',
    comparisonAvailable: true,
    comparisonChildType: 'quarters',
  },
  quarter: {
    level: 'quarter',
    comparisonAvailable: true,
    comparisonChildType: 'months',
  },
  month: {
    level: 'month',
    comparisonAvailable: true,
    comparisonChildType: 'weeks',
  },
  week: {
    level: 'week',
    comparisonAvailable: true,
    comparisonChildType: 'days',
  },
  day: {
    level: 'day',
    comparisonAvailable: false,
    comparisonChildType: null,
  },
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Check if comparison mode is available for a temporal level.
 * Day level does not support comparison (no children).
 *
 * @param level - The temporal level to check
 * @returns true if comparison mode is available
 */
export function isComparisonAvailable(level: TemporalLevel): boolean {
  return chartModeRegistry[level]?.comparisonAvailable ?? false;
}

/**
 * Gets the type of children for comparison mode at a given level.
 *
 * @param level - The temporal level
 * @returns The child type or null if comparison not available
 */
export function getComparisonChildType(level: TemporalLevel): ComparisonChildType | null {
  return chartModeRegistry[level]?.comparisonChildType ?? null;
}

/**
 * Gets the comparison labels for the current temporal position.
 *
 * @param temporal - Current temporal position
 * @param locale - Locale for formatting (en/es)
 * @returns Array of labels for comparison children, or null if comparison not available
 *
 * @example
 * // Year level - returns quarters
 * getComparisonChildren({ level: 'year', year: '2024' }, 'en')
 * // Returns: ['Q1', 'Q2', 'Q3', 'Q4']
 *
 * @example
 * // Quarter level - returns months
 * getComparisonChildren({ level: 'quarter', year: '2024', quarter: 'Q4' }, 'en')
 * // Returns: ['October', 'November', 'December']
 *
 * @example
 * // Month level - returns weeks
 * getComparisonChildren({ level: 'month', year: '2024', quarter: 'Q4', month: '2024-10' }, 'en')
 * // Returns: ['Oct 1-7', 'Oct 8-14', 'Oct 15-21', 'Oct 22-28', 'Oct 29-31']
 *
 * @example
 * // Week level - returns days
 * getComparisonChildren({ level: 'week', year: '2024', quarter: 'Q4', month: '2024-10', week: 1 }, 'en')
 * // Returns: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
 *
 * @example
 * // Day level - returns null (no comparison available)
 * getComparisonChildren({ level: 'day', year: '2024', quarter: 'Q4', month: '2024-10', week: 2, day: '2024-10-15' }, 'en')
 * // Returns: null
 */
export function getComparisonChildren(
  temporal: TemporalPosition,
  locale: string = 'en'
): string[] | null {
  const config = chartModeRegistry[temporal.level];

  if (!config.comparisonAvailable) {
    return null;
  }

  switch (temporal.level) {
    case 'year':
      // Year → Quarters (Q1, Q2, Q3, Q4)
      // Use T1-T4 for Spanish (Trimestre)
      return locale === 'es' ? ['T1', 'T2', 'T3', 'T4'] : ['Q1', 'Q2', 'Q3', 'Q4'];

    case 'quarter':
      // Quarter → Months
      if (!temporal.quarter) return null;
      const months = getMonthsInQuarter(temporal.quarter);
      return months.map((m) => getMonthName(m, temporal.year, locale));

    case 'month':
      // Month → Weeks (date ranges)
      if (!temporal.month) return null;
      const monthNum = parseInt(temporal.month.split('-')[1], 10);
      return getWeeksInMonth(temporal.year, monthNum, locale);

    case 'week':
      // Week → Days (Mon, Tue, etc.)
      return getDayNames(locale);

    case 'day':
      // Day → null (no children)
      return null;

    default:
      return null;
  }
}

/**
 * Gets the quarter labels for display.
 *
 * @param locale - Locale for formatting (en/es)
 * @returns Array of quarter labels
 */
export function getQuarterLabels(locale: string = 'en'): string[] {
  return locale === 'es' ? ['T1', 'T2', 'T3', 'T4'] : ['Q1', 'Q2', 'Q3', 'Q4'];
}

/**
 * Gets the month labels for a specific quarter.
 *
 * @param quarter - Quarter string (Q1, Q2, Q3, Q4)
 * @param year - Year string (YYYY)
 * @param locale - Locale for formatting (en/es)
 * @returns Array of month names
 */
export function getMonthLabelsForQuarter(
  quarter: string,
  year: string,
  locale: string = 'en'
): string[] {
  const months = getMonthsInQuarter(quarter);
  return months.map((m) => getMonthName(m, year, locale));
}

/**
 * Gets the week labels (date ranges) for a specific month.
 *
 * @param month - Month string (YYYY-MM)
 * @param locale - Locale for formatting (en/es)
 * @returns Array of week date range labels
 */
export function getWeekLabelsForMonth(month: string, locale: string = 'en'): string[] {
  const [year, monthNum] = month.split('-');
  return getWeeksInMonth(year, parseInt(monthNum, 10), locale);
}

/**
 * Gets the day labels for a week.
 *
 * @param locale - Locale for formatting (en/es)
 * @returns Array of day names (Mon-Sun)
 */
export function getDayLabels(locale: string = 'en'): string[] {
  return getDayNames(locale);
}

// Re-export types
export { chartModeRegistry };
