/**
 * ReportRow Component
 *
 * Story 14.16: Weekly Report Story Format
 * Epic 14: Core Implementation
 *
 * Individual report list item displaying report summary with
 * unread indicator, logo, title, amount, trend, and optional persona hook.
 *
 * @example
 * ```tsx
 * <ReportRow
 *   title="Semana 23"
 *   amount={45200}
 *   trend="up"
 *   trendPercent={8}
 *   comparisonLabel="vs S22"
 *   periodType="weekly"
 *   isUnread={true}
 *   onClick={() => openReport('weekly', 23)}
 * />
 * ```
 */

import React from 'react';
import { ChevronUp, ChevronDown, Receipt } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { TrendDirection, ReportPeriodType } from '@/types/report';
import { TREND_COLORS, formatCurrency } from '@/types/report';

export interface ReportRowProps {
  /** Report title (e.g., "Semana 23", "Diciembre", "Q4 2025") */
  title: string;
  /** Total amount spent in the period */
  amount: number;
  /** Trend direction compared to previous period */
  trend?: TrendDirection;
  /** Trend percentage change */
  trendPercent?: number;
  /** Comparison label (e.g., "vs S22", "vs Nov", "vs Q3") */
  comparisonLabel?: string;
  /** Period type for background color styling */
  periodType: ReportPeriodType;
  /** Whether this report is unread */
  isUnread?: boolean;
  /** Whether this is the user's first report of this type */
  isFirst?: boolean;
  /** First report label (e.g., "Tu primera semana", "Tu primer mes") */
  firstLabel?: string;
  /** Persona hook text for quarterly/yearly reports */
  personaHook?: string;
  /** Number of transactions in this period */
  transactionCount?: number;
  /** Click handler to open report detail */
  onClick?: () => void;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Get background color based on period type
 * Lighter for weekly, progressively darker for longer periods
 */
function getPeriodBackground(periodType: ReportPeriodType, isDark: boolean): string {
  // Using CSS color-mix equivalent with opacity
  const baseColors = {
    weekly: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(219, 234, 254, 1)', // primary-light equivalent
    monthly: isDark ? 'rgba(59, 130, 246, 0.20)' : 'rgba(191, 219, 254, 0.8)',
    quarterly: isDark ? 'rgba(59, 130, 246, 0.30)' : 'rgba(147, 197, 253, 0.6)',
    yearly: isDark ? 'rgba(59, 130, 246, 0.40)' : 'rgba(96, 165, 250, 0.5)',
  };
  return baseColors[periodType];
}

/**
 * ReportRow - Individual report list item
 */
export const ReportRow: React.FC<ReportRowProps> = ({
  title,
  amount,
  trend,
  trendPercent,
  comparisonLabel,
  periodType,
  isUnread = false,
  isFirst = false,
  firstLabel,
  personaHook,
  transactionCount,
  onClick,
  className = '',
}) => {
  const prefersReducedMotion = useReducedMotion();

  // Detect dark mode from CSS variable
  const isDark = typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;

  const formattedAmount = formatCurrency(amount);
  const hasTrend = trend && trend !== 'neutral' && trendPercent !== undefined && !isFirst;

  // Determine trend display
  const trendColor = trend ? TREND_COLORS[trend] : undefined;
  const trendSign = trend === 'up' ? '+' : trend === 'down' ? '' : '';

  return (
    <div
      className={`
        flex items-center gap-2.5
        px-3 py-3
        rounded-lg
        cursor-pointer
        ${prefersReducedMotion ? '' : 'transition-all duration-150'}
        hover:translate-x-0.5
        ${className}
      `}
      style={{
        backgroundColor: getPeriodBackground(periodType, isDark),
      }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${title}, ${formattedAmount}${hasTrend ? `, ${trendSign}${trendPercent}% ${comparisonLabel}` : ''}${isUnread ? ', no leído' : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      data-testid="report-row"
      data-period-type={periodType}
      data-unread={isUnread}
    >
      {/* Unread indicator dot */}
      {isUnread && (
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: 'var(--primary)' }}
          data-testid="unread-dot"
        />
      )}
      {!isUnread && <div className="w-2 flex-shrink-0" />}

      {/* Logo circle */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover, var(--primary)) 100%)',
        }}
        data-testid="report-logo"
      >
        <span className="text-white font-bold text-sm" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
          G
        </span>
      </div>

      {/* Report content */}
      <div className="flex-1 min-w-0">
        {/* Title with transaction count */}
        <div
          className="flex items-center gap-2 text-sm font-semibold"
          style={{ color: 'var(--text-primary)' }}
          data-testid="report-title"
        >
          <span>{title}</span>
          {transactionCount !== undefined && transactionCount > 0 && (
            <span
              className="flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
              }}
              data-testid="report-transaction-count"
            >
              <Receipt size={10} />
              {transactionCount}
            </span>
          )}
        </div>

        {/* Amount and trend */}
        <div className="flex items-center gap-2 text-xs">
          <span
            className="font-semibold"
            style={{ color: 'var(--text-primary)' }}
            data-testid="report-amount"
          >
            {formattedAmount}
          </span>

          {/* Trend indicator */}
          {hasTrend && (
            <span
              className="flex items-center gap-0.5 font-semibold"
              style={{ color: trendColor }}
              data-testid="report-trend"
            >
              {trend === 'up' ? (
                <ChevronUp size={12} strokeWidth={2.5} />
              ) : (
                <ChevronDown size={12} strokeWidth={2.5} />
              )}
              {trendSign}{trendPercent}% {comparisonLabel}
            </span>
          )}

          {/* First report indicator */}
          {isFirst && firstLabel && (
            <span
              className="font-normal italic"
              style={{ color: 'var(--text-tertiary)' }}
              data-testid="report-first-label"
            >
              · {firstLabel}
            </span>
          )}
        </div>

        {/* Persona hook (quarterly/yearly) */}
        {personaHook && (
          <div
            className="text-xs mt-0.5 italic"
            style={{ color: 'var(--text-secondary)' }}
            data-testid="report-persona-hook"
          >
            "{personaHook}"
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportRow;
