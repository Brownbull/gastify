/**
 * Temporal Display Formatters
 *
 * Display formatting for temporal filter states (breadcrumb style).
 * Extracted from historyFilterUtils.ts in Story TD-15b-17 to break
 * circular dependency with temporalNavigation.ts.
 */

import type { TemporalFilterState } from '@/types/historyFilters';

/**
 * Format temporal filter selection for display (breadcrumb style).
 * Story 9.20: Added quarter display support.
 */
export function formatTemporalRange(
  temporal: TemporalFilterState,
  locale: string = 'en'
): string {
  if (temporal.level === 'all') {
    return locale === 'es' ? 'Todo el tiempo' : 'All time';
  }

  const parts: string[] = [];

  if (temporal.year) {
    parts.push(temporal.year);
  }

  // Quarter display (Story 9.20)
  if (temporal.quarter) {
    const quarterNum = parseInt(temporal.quarter.replace('Q', ''), 10);
    const quarterLabel = locale === 'es' ? `T${quarterNum}` : temporal.quarter;
    parts.push(quarterLabel);
  }

  if (temporal.month) {
    const [, monthNum] = temporal.month.split('-');
    // Year is arbitrary — only the month index matters for toLocaleDateString
    const date = new Date(2024, parseInt(monthNum, 10) - 1, 1);
    const monthName = date.toLocaleDateString(
      locale === 'es' ? 'es-ES' : 'en-US',
      { month: 'long' }
    );
    parts.push(monthName);
  }

  if (temporal.week !== undefined) {
    const weekLabel = locale === 'es' ? `Sem ${temporal.week}` : `W${temporal.week}`;
    parts.push(weekLabel);
  }

  if (temporal.day) {
    const dayNum = parseInt(temporal.day.split('-')[2], 10);
    parts.push(dayNum.toString());
  }

  return parts.join(' > ');
}
