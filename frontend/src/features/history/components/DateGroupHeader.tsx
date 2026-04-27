/**
 * DateGroupHeader Component
 *
 * Story 14.14: Transaction List Redesign (AC #2)
 * Epic 14: Core Implementation
 *
 * Sticky header for date-grouped transactions.
 * Displays: "Today", "Yesterday", or formatted date.
 * Optionally shows group total.
 *
 * @see docs/uxui/mockups/01_views/transaction-list.html
 */

import React from 'react';
import { DEFAULT_CURRENCY } from '@/utils/currency';

// ============================================================================
// Types
// ============================================================================

export interface DateGroupHeaderProps {
  /** Display label for the date group ("Today", "Yesterday", "Dec 28") */
  label: string;
  /** Optional total for the group */
  total?: number;
  /** Currency for formatting total */
  currency?: string;
  /** Theme (light/dark) */
  theme?: string;
  /** Currency formatter function */
  formatCurrency?: (amount: number, currency: string) => string;
  /** Whether header should be sticky */
  sticky?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export const DateGroupHeader: React.FC<DateGroupHeaderProps> = ({
  label,
  total,
  currency = DEFAULT_CURRENCY,
  formatCurrency,
  sticky = true,
}) => {
  return (
    <div
      className={`flex justify-between items-center py-2 px-1 ${sticky ? 'sticky top-0 z-10' : ''}`}
      style={{
        backgroundColor: 'var(--bg)',
      }}
      role="heading"
      aria-level={3}
    >
      <span
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {label}
      </span>

      {total !== undefined && formatCurrency && (
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          {formatCurrency(total, currency)}
        </span>
      )}
    </div>
  );
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format a date key for display.
 *
 * @param dateKey - ISO date string (YYYY-MM-DD)
 * @param locale - Locale for formatting (en/es)
 * @param t - Translation function
 * @returns Formatted label ("Today", "Yesterday", "Dec 28")
 */
export function formatDateGroupLabel(
  dateKey: string,
  locale: string = 'en',
  t: (key: string) => string
): string {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (dateKey === today) {
    return t('today');
  }

  if (dateKey === yesterday) {
    return t('yesterday');
  }

  // Format as "Dec 28" or "28 Dic"
  const date = new Date(dateKey + 'T12:00:00'); // Add time to avoid timezone issues
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

  return date.toLocaleDateString(
    locale === 'es' ? 'es-ES' : 'en-US',
    options
  );
}

/**
 * Group transactions by date.
 *
 * @param transactions - Array of transactions with date field
 * @returns Map of date keys to transaction arrays, sorted by date (most recent first)
 */
export function groupTransactionsByDate<T extends { date: string }>(
  transactions: T[]
): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  // Group by date
  for (const tx of transactions) {
    const dateKey = tx.date;
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(tx);
  }

  // Sort groups by date (most recent first)
  const sortedEntries = [...groups.entries()].sort(([a], [b]) => {
    return b.localeCompare(a); // Descending order
  });

  return new Map(sortedEntries);
}

/**
 * Calculate total for a group of transactions.
 *
 * @param transactions - Array of transactions with total field
 * @returns Sum of all totals
 */
export function calculateGroupTotal<T extends { total: number }>(
  transactions: T[]
): number {
  return transactions.reduce((sum, tx) => sum + tx.total, 0);
}

export default DateGroupHeader;
