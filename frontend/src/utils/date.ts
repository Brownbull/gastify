/**
 * Date Utilities
 *
 * Consolidated date utilities:
 * - Quarter and week calculation for temporal navigation (ADR-012)
 * - ISO 8601 week number calculation
 * - Period computation for Firestore queries (AD-5)
 *
 * Story 15-2b: Merged date.ts + dateHelpers.ts + periodUtils.ts
 *
 * @see docs/architecture-epic7.md - ADR-012: Month-Aligned Week Chunks
 */

import type { TransactionPeriods } from '../types/transaction';

// ============================================================================
// Types
// ============================================================================

/**
 * Quarter representation with label and associated months.
 */
export interface Quarter {
  label: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  months: [string, string, string]; // YYYY-MM format
}

/**
 * Week range within a month.
 * Uses month-aligned chunks: Oct 1-7, Oct 8-14, etc.
 * Last week may have fewer than 7 days.
 */
export interface WeekRange {
  label: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  weekNumber: number; // 1-5 within month
}

// ============================================================================
// Quarter Utilities
// ============================================================================

/**
 * Gets all quarters for a given year.
 *
 * @param year - The year (e.g., 2024)
 * @returns Array of 4 Quarter objects with label and month strings
 *
 * @example
 * getQuartersInYear(2024)
 * // Returns: [
 * //   { label: 'Q1', months: ['2024-01', '2024-02', '2024-03'] },
 * //   { label: 'Q2', months: ['2024-04', '2024-05', '2024-06'] },
 * //   { label: 'Q3', months: ['2024-07', '2024-08', '2024-09'] },
 * //   { label: 'Q4', months: ['2024-10', '2024-11', '2024-12'] }
 * // ]
 */
export function getQuartersInYear(year: number): Quarter[] {
  const yearStr = year.toString();
  return [
    { label: 'Q1', months: [`${yearStr}-01`, `${yearStr}-02`, `${yearStr}-03`] },
    { label: 'Q2', months: [`${yearStr}-04`, `${yearStr}-05`, `${yearStr}-06`] },
    { label: 'Q3', months: [`${yearStr}-07`, `${yearStr}-08`, `${yearStr}-09`] },
    { label: 'Q4', months: [`${yearStr}-10`, `${yearStr}-11`, `${yearStr}-12`] },
  ];
}

/**
 * Gets the months in a specific quarter.
 *
 * @param year - The year (e.g., 2024)
 * @param quarter - Quarter string (Q1, Q2, Q3, Q4)
 * @returns Array of 3 month strings in YYYY-MM format
 *
 * @example
 * getMonthsInQuarter(2024, 'Q4')
 * // Returns: ['2024-10', '2024-11', '2024-12']
 */
export function getMonthsInQuarter(year: number, quarter: string): string[] {
  const yearStr = year.toString();
  switch (quarter.toUpperCase()) {
    case 'Q1':
      return [`${yearStr}-01`, `${yearStr}-02`, `${yearStr}-03`];
    case 'Q2':
      return [`${yearStr}-04`, `${yearStr}-05`, `${yearStr}-06`];
    case 'Q3':
      return [`${yearStr}-07`, `${yearStr}-08`, `${yearStr}-09`];
    case 'Q4':
      return [`${yearStr}-10`, `${yearStr}-11`, `${yearStr}-12`];
    default:
      return [`${yearStr}-01`, `${yearStr}-02`, `${yearStr}-03`]; // Default to Q1
  }
}

/**
 * Determines which quarter a month belongs to.
 *
 * @param month - Month string in YYYY-MM format (e.g., '2024-10')
 * @returns Quarter label (Q1, Q2, Q3, or Q4)
 *
 * @example
 * getQuarterFromMonth('2024-10')
 * // Returns: 'Q4'
 */
export function getQuarterFromMonth(month: string): string {
  const monthNum = parseInt(month.split('-')[1], 10);

  if (monthNum >= 1 && monthNum <= 3) return 'Q1';
  if (monthNum >= 4 && monthNum <= 6) return 'Q2';
  if (monthNum >= 7 && monthNum <= 9) return 'Q3';
  return 'Q4'; // 10, 11, 12
}

// ============================================================================
// Week Utilities
// ============================================================================

/**
 * Gets weeks in a month using month-aligned chunks.
 *
 * Week calculation uses fixed 7-day chunks within each month (NOT ISO weeks):
 * - Week 1: Days 1-7
 * - Week 2: Days 8-14
 * - Week 3: Days 15-21
 * - Week 4: Days 22-28
 * - Week 5: Days 29-31 (or 29-30, or just 29 for leap Feb)
 *
 * @param month - Month string in YYYY-MM format (e.g., '2024-10')
 * @param locale - Locale for formatting (default: 'en')
 * @returns Array of WeekRange objects
 *
 * @example
 * getWeeksInMonth('2024-10', 'en')
 * // Returns: [
 * //   { label: 'Oct 1-7', start: '2024-10-01', end: '2024-10-07', weekNumber: 1 },
 * //   { label: 'Oct 8-14', start: '2024-10-08', end: '2024-10-14', weekNumber: 2 },
 * //   { label: 'Oct 15-21', start: '2024-10-15', end: '2024-10-21', weekNumber: 3 },
 * //   { label: 'Oct 22-28', start: '2024-10-22', end: '2024-10-28', weekNumber: 4 },
 * //   { label: 'Oct 29-31', start: '2024-10-29', end: '2024-10-31', weekNumber: 5 }
 * // ]
 */
export function getWeeksInMonth(month: string, locale: string = 'en'): WeekRange[] {
  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);

  // Get days in month (0th day of next month = last day of current month)
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  const weeks: WeekRange[] = [];
  let weekStart = 1;
  let weekNumber = 1;

  while (weekStart <= daysInMonth) {
    const weekEnd = Math.min(weekStart + 6, daysInMonth);

    // Format dates as YYYY-MM-DD
    const startDate = `${yearStr}-${monthStr}-${weekStart.toString().padStart(2, '0')}`;
    const endDate = `${yearStr}-${monthStr}-${weekEnd.toString().padStart(2, '0')}`;

    // Generate label
    const label = formatWeekLabel(startDate, endDate, locale);

    weeks.push({
      label,
      start: startDate,
      end: endDate,
      weekNumber,
    });

    weekStart = weekEnd + 1;
    weekNumber++;
  }

  return weeks;
}

/**
 * Formats a week label with locale-aware month abbreviation.
 *
 * @param start - Start date in YYYY-MM-DD format
 * @param end - End date in YYYY-MM-DD format
 * @param locale - Locale for formatting ('en' or 'es')
 * @returns Formatted label like "Oct 1-7" (English) or "oct 1-7" (Spanish)
 *
 * @example
 * formatWeekLabel('2024-10-01', '2024-10-07', 'en')
 * // Returns: 'Oct 1-7'
 *
 * @example
 * formatWeekLabel('2024-10-01', '2024-10-07', 'es')
 * // Returns: 'oct 1-7' or similar locale-appropriate format
 */
export function formatWeekLabel(start: string, end: string, locale: string = 'en'): string {
  const [yearStr, monthStr, startDayStr] = start.split('-');
  const [, , endDayStr] = end.split('-');

  const startDay = parseInt(startDayStr, 10);
  const endDay = parseInt(endDayStr, 10);

  // Get locale-aware month abbreviation
  const date = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
  const shortMonth = date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
    month: 'short',
  });

  // Remove trailing period if present (some locales add it)
  const cleanMonth = shortMonth.replace(/\.$/, '');

  return `${cleanMonth} ${startDay}-${endDay}`;
}

// ============================================================================
// Legacy formatDate function
// ============================================================================

export const formatDate = (dateStr: string, format: 'LatAm' | 'US'): string => {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  if (format === 'US') return `${parts[1]}/${parts[2]}/${parts[0]}`;
  return `${parts[2]}/${parts[1]}/${parts[0]}`; // LatAm default
};

// ============================================================================
// ISO 8601 Week Number (from dateHelpers.ts)
// ============================================================================

/**
 * Gets the ISO 8601 week number for a given date.
 *
 * ISO weeks start on Monday, and week 1 is the week containing January 4th.
 *
 * @param date - The date to get the week number for
 * @returns The ISO week number (1-53)
 */
export function getISOWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Set to nearest Thursday: current date + 4 - current day number (Monday=1, Sunday=7)
  // Make Sunday day 7 instead of 0
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  // January 4th is always in week 1
  const week1 = new Date(d.getFullYear(), 0, 4);
  // Calculate week number: weekday difference / 7 days
  const weekNum = 1 + Math.round(
    ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
  );
  return weekNum;
}

// ============================================================================
// Period Computation (from periodUtils.ts — AD-5)
// ============================================================================

/**
 * Compute all period identifiers from a transaction date string.
 * Used for efficient Firestore queries via pre-computed period fields.
 *
 * @param dateString - Date in YYYY-MM-DD format
 * @returns TransactionPeriods object with day, week, month, quarter, year
 */
export function computePeriods(dateString: string): TransactionPeriods {
  const date = parseLocalDate(dateString);

  if (isNaN(date.getTime())) {
    return createFallbackPeriods(dateString);
  }

  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  return {
    day: formatDayString(date),
    week: computeISOWeekString(date),
    month: `${year}-${String(month).padStart(2, '0')}`,
    quarter: `${year}-Q${Math.ceil(month / 3)}`,
    year: String(year),
  };
}

/**
 * Parse a date string as a local date (avoiding UTC conversion issues).
 */
function parseLocalDate(dateString: string): Date {
  if (!dateString) return new Date(NaN);

  const parts = dateString.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(year, month, day);
    }
  }

  return new Date(dateString);
}

/** Format date as YYYY-MM-DD string. */
function formatDayString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Compute ISO 8601 week string (YYYY-Www). */
function computeISOWeekString(date: Date): string {
  const d = new Date(date.getTime());
  const dayOfWeek = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dayOfWeek);
  const isoYear = d.getFullYear();
  const isoWeekNumber = getISOWeekNumber(date);
  return `${isoYear}-W${String(isoWeekNumber).padStart(2, '0')}`;
}

/** Create fallback periods for invalid dates. */
function createFallbackPeriods(dateString: string): TransactionPeriods {
  if (import.meta.env.DEV) {
    console.warn(`[date] Invalid date string: "${dateString}"`);
  }

  const yearMatch = dateString.match(/^(\d{4})/);
  const year = yearMatch ? yearMatch[1] : '0000';

  return {
    day: dateString || '0000-00-00',
    week: `${year}-W00`,
    month: `${year}-00`,
    quarter: `${year}-Q0`,
    year: year,
  };
}
