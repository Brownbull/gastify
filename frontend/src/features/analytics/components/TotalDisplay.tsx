/**
 * TotalDisplay Component
 *
 * Displays the total amount for the current analytics view with proper
 * currency and locale formatting.
 *
 * @see docs/sprint-artifacts/epic7/story-7.4-chart-mode-toggle-registry.md - Task 5
 */

import React from 'react';
import { formatCurrency, DEFAULT_CURRENCY } from '@/utils/currency';

// ============================================================================
// Types
// ============================================================================

export interface TotalDisplayProps {
  /** The total amount to display */
  amount: number;
  /** The period label (e.g., "November 2024", "Q4 2024") */
  period: string;
  /** Currency code (e.g., "CLP", "USD") */
  currency?: string;
  /** Theme for styling (light/dark) */
  theme?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * TotalDisplay Component
 *
 * Displays the total amount and period label for the current analytics view.
 * Uses locale-aware currency formatting.
 *
 * @example
 * <TotalDisplay amount={150000} period="November 2024" currency="CLP" />
 */
export function TotalDisplay({
  amount,
  period,
  currency = DEFAULT_CURRENCY,
  theme = 'light',
}: TotalDisplayProps): React.ReactElement {
  const isDark = theme === 'dark';

  const formattedAmount = formatCurrency(amount, currency);

  return (
    <div className="flex flex-col items-center text-center">
      {/* Total amount (AC #9) */}
      <span
        className={[
          'text-3xl font-bold',
          isDark ? 'text-white' : 'text-slate-900',
        ].join(' ')}
        data-testid="total-amount"
      >
        {formattedAmount}
      </span>

      {/* Period label */}
      <span
        className={[
          'text-sm mt-1',
          isDark ? 'text-slate-400' : 'text-slate-500',
        ].join(' ')}
        data-testid="total-period"
      >
        {period}
      </span>
    </div>
  );
}

export default TotalDisplay;
