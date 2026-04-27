/**
 * Report Date Utilities
 *
 * Date/period range functions and transaction filtering by time period.
 * Leaf node in the dependency chain — no internal report utility deps.
 */

import type { Transaction } from '@/types/transaction';

// ============================================================================
// Constants
// ============================================================================

/** Minimum transactions required to generate weekly report */
export const MIN_TRANSACTIONS_FOR_REPORT = 1;

// ============================================================================
// Week Date Utilities
// ============================================================================

/**
 * Get the start of week (Monday) for a given date
 * Uses ISO week where Monday is the first day
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of week (Sunday) for a given date
 */
export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Get ISO week number for a date
 */
export function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse date string (YYYY-MM-DD) to Date object.
 * Returns Invalid Date with a warning for malformed inputs.
 */
export function parseDate(dateStr: string): Date {
  if (!DATE_FORMAT_REGEX.test(dateStr)) {
    console.warn(`parseDate: malformed date string "${dateStr}", expected YYYY-MM-DD`);
    return new Date(NaN);
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Check if a date is within a week range
 */
export function isDateInWeek(dateStr: string, weekStart: Date, weekEnd: Date): boolean {
  const date = parseDate(dateStr);
  return date >= weekStart && date <= weekEnd;
}

/**
 * Get the week range for a specific week offset from current week
 * @param weeksAgo - Number of weeks ago (0 = current week, 1 = last week, etc.)
 */
export function getWeekRange(weeksAgo: number = 0): { start: Date; end: Date } {
  const now = new Date();
  const start = getWeekStart(now);
  start.setDate(start.getDate() - weeksAgo * 7);
  const end = getWeekEnd(start);
  return { start, end };
}

// ============================================================================
// Transaction Filtering
// ============================================================================

/**
 * Filter transactions to a specific week
 */
export function filterTransactionsByWeek(
  transactions: Transaction[],
  weekStart: Date,
  weekEnd: Date
): Transaction[] {
  return transactions.filter((t) => isDateInWeek(t.date, weekStart, weekEnd));
}

/**
 * Calculate total spending from transactions
 */
export function calculateTotal(transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => sum + t.total, 0);
}

// ============================================================================
// Month Date Utilities
// ============================================================================

/**
 * Get the start of month for a given date
 */
export function getMonthStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of month for a given date
 */
export function getMonthEnd(date: Date): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0); // Last day of previous month
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Get the month range for a specific month offset from current month
 * @param monthsAgo - Number of months ago (0 = current month)
 */
export function getMonthRange(monthsAgo: number = 0): { start: Date; end: Date } {
  const now = new Date();
  const start = getMonthStart(now);
  start.setMonth(start.getMonth() - monthsAgo);
  const end = getMonthEnd(start);
  return { start, end };
}

/**
 * Check if a date is within a month range
 */
export function isDateInMonth(dateStr: string, monthStart: Date, monthEnd: Date): boolean {
  const date = parseDate(dateStr);
  return date >= monthStart && date <= monthEnd;
}

/**
 * Filter transactions to a specific month
 */
export function filterTransactionsByMonth(
  transactions: Transaction[],
  monthStart: Date,
  monthEnd: Date
): Transaction[] {
  return transactions.filter((t) => isDateInMonth(t.date, monthStart, monthEnd));
}

// ============================================================================
// Quarter Date Utilities
// ============================================================================

/**
 * Get the start of quarter for a given date
 */
export function getQuarterStart(date: Date): Date {
  const d = new Date(date);
  const quarter = Math.floor(d.getMonth() / 3);
  d.setMonth(quarter * 3);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of quarter for a given date
 */
export function getQuarterEnd(date: Date): Date {
  const d = new Date(date);
  const quarter = Math.floor(d.getMonth() / 3);
  d.setMonth((quarter + 1) * 3);
  d.setDate(0); // Last day of previous month (end of quarter)
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Get quarter number (1-4) for a date
 */
export function getQuarterNumber(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1;
}

/**
 * Get the quarter range for a specific quarter offset from current quarter
 * @param quartersAgo - Number of quarters ago (0 = current quarter)
 */
export function getQuarterRange(quartersAgo: number = 0): { start: Date; end: Date } {
  const now = new Date();
  const currentQuarterStart = getQuarterStart(now);
  const start = new Date(currentQuarterStart);
  start.setMonth(start.getMonth() - quartersAgo * 3);
  const end = getQuarterEnd(start);
  return { start, end };
}

/**
 * Check if a date is within a quarter range
 */
export function isDateInQuarter(dateStr: string, quarterStart: Date, quarterEnd: Date): boolean {
  const date = parseDate(dateStr);
  return date >= quarterStart && date <= quarterEnd;
}

/**
 * Filter transactions to a specific quarter
 */
export function filterTransactionsByQuarter(
  transactions: Transaction[],
  quarterStart: Date,
  quarterEnd: Date
): Transaction[] {
  return transactions.filter((t) => isDateInQuarter(t.date, quarterStart, quarterEnd));
}

// ============================================================================
// Year Date Utilities
// ============================================================================

/**
 * Get the start of year for a given date
 */
export function getYearStart(date: Date): Date {
  const d = new Date(date);
  d.setMonth(0);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of year for a given date
 */
export function getYearEnd(date: Date): Date {
  const d = new Date(date);
  d.setMonth(11);
  d.setDate(31);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Get the year range for a specific year offset from current year
 * @param yearsAgo - Number of years ago (0 = current year)
 */
export function getYearRange(yearsAgo: number = 0): { start: Date; end: Date } {
  const now = new Date();
  const start = getYearStart(now);
  start.setFullYear(start.getFullYear() - yearsAgo);
  const end = getYearEnd(start);
  return { start, end };
}

/**
 * Check if a date is within a year range
 */
export function isDateInYear(dateStr: string, yearStart: Date, yearEnd: Date): boolean {
  const date = parseDate(dateStr);
  return date >= yearStart && date <= yearEnd;
}

/**
 * Filter transactions to a specific year
 */
export function filterTransactionsByYear(
  transactions: Transaction[],
  yearStart: Date,
  yearEnd: Date
): Transaction[] {
  return transactions.filter((t) => isDateInYear(t.date, yearStart, yearEnd));
}
