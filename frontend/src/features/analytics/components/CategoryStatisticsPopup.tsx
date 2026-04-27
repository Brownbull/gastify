/**
 * CategoryStatisticsPopup - Modal showing category statistics
 *
 * Story 14.40: Category Statistics Popup
 *
 * Shows aggregated statistics when user taps a category icon in:
 * - TreeMap cells
 * - Donut chart segments/legend
 * - Sankey diagram nodes
 * - Trend list items
 *
 * Statistics include:
 * - Transaction stats (count, total, min, max, avg, median)
 * - Item stats (count, min, max, avg, median prices)
 * - Insights (top merchant, percentage of total)
 *
 * @see docs/sprint-artifacts/epic14/stories/story-14.40-category-statistics-popup.md
 */

import React from 'react';
import { X, TrendingUp, TrendingDown, ShoppingBag, Receipt, Store } from 'lucide-react';
import type { CategoryStatistics, CategoryFilterType } from '../hooks/useCategoryStatistics';
import { formatCurrency } from '@/utils/currency';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface CategoryStatisticsPopupProps {
  /** Whether the popup is visible */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Navigate to filtered history */
  onViewHistory: () => void;
  /** Category emoji */
  emoji: string;
  /** Category name (translated) */
  categoryName: string;
  /** Category background color for theming */
  categoryColor: string;
  /** Story 14.44: Category foreground/text color - respects colorful/plain mode */
  categoryFgColor?: string;
  /** Statistics data */
  statistics: CategoryStatistics | null;
  /** Currency code for formatting */
  currency: string;
  /** Theme for styling */
  theme: 'light' | 'dark';
  /** Translation function */
  t: (key: string) => string;
  /** Type of category being displayed */
  categoryType: CategoryFilterType;
  /** Period label describing the date range (e.g., "Diciembre 2025", "Q4 2025") */
  periodLabel?: string;
}

/**
 * Statistic row component for consistent formatting
 */
const StatRow: React.FC<{
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  highlight?: boolean;
  theme: 'light' | 'dark';
}> = ({ label, value, icon, highlight, theme }) => {
  const isDark = theme === 'dark';

  return (
    <div
      className="flex items-center justify-between py-2"
      style={{
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
      }}
    >
      <span
        className="text-sm flex items-center gap-2"
        style={{ color: 'var(--secondary)' }}
      >
        {icon}
        {label}
      </span>
      <span
        className={`text-sm font-medium ${highlight ? 'font-bold' : ''}`}
        style={{ color: highlight ? 'var(--primary)' : 'var(--secondary)' }}
      >
        {value}
      </span>
    </div>
  );
};

/**
 * Section header for organizing statistics
 */
const SectionHeader: React.FC<{
  title: string;
  icon: React.ReactNode;
  theme: 'light' | 'dark';
}> = ({ title, icon, theme }) => {
  const isDark = theme === 'dark';

  return (
    <div
      className="flex items-center gap-2 py-2 mt-4 mb-1"
      style={{
        borderBottom: `2px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
      }}
    >
      <span style={{ color: 'var(--primary)' }}>{icon}</span>
      <span
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: 'var(--primary)' }}
      >
        {title}
      </span>
    </div>
  );
};

export const CategoryStatisticsPopup: React.FC<CategoryStatisticsPopupProps> = ({
  isOpen,
  onClose,
  onViewHistory,
  emoji,
  categoryName,
  categoryColor,
  categoryFgColor = 'white',
  statistics,
  currency,
  theme,
  t,
  categoryType,
  periodLabel,
}) => {
  const isDark = theme === 'dark';
  const prefersReducedMotion = useReducedMotion();

  // Don't render if not open
  if (!isOpen) return null;

  // Handle empty state
  if (!statistics) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{
          padding: 'calc(1rem + var(--safe-top, 0px)) calc(1rem + var(--safe-right, 0px)) calc(1rem + var(--safe-bottom, 0px)) calc(1rem + var(--safe-left, 0px))',
        }}
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

        {/* Modal */}
        <div
          className="relative w-full max-w-sm rounded-2xl shadow-xl overflow-hidden p-6"
          style={{ backgroundColor: 'var(--surface)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full"
            style={{ color: 'var(--secondary)' }}
          >
            <X size={20} />
          </button>
          <p style={{ color: 'var(--secondary)' }}>{t('noData')}</p>
        </div>
      </div>
    );
  }

  // Determine if this is store-level or item-level category
  const isItemLevel = categoryType === 'item-category' || categoryType === 'item-group';
  const hasItemStats = statistics.itemCount !== undefined && statistics.itemCount > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        // Add 6rem bottom padding for nav bar plus safe areas
        padding: 'calc(1rem + var(--safe-top, 0px)) calc(1rem + var(--safe-right, 0px)) calc(7rem + var(--safe-bottom, 0px)) calc(1rem + var(--safe-left, 0px))',
        animation: prefersReducedMotion ? 'none' : 'fadeIn 200ms ease-out',
      }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

      {/* Modal */}
      <div
        className="relative w-full max-w-sm rounded-2xl shadow-xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'var(--surface)',
          // Account for nav bar (6rem) plus safe areas in maxHeight
          maxHeight: 'calc(100vh - 8rem - var(--safe-top, 0px) - var(--safe-bottom, 0px))',
          animation: prefersReducedMotion ? 'none' : 'slideUp 200ms ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-stats-title"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-full transition-colors min-w-10 min-h-10 flex items-center justify-center z-10"
          style={{
            color: 'var(--secondary)',
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          }}
          aria-label={t('close')}
        >
          <X size={20} />
        </button>

        {/* Header with emoji, category name, and period label */}
        {/* Story 14.44: Use categoryFgColor for text (respects colorful/plain mode) */}
        <div
          className="px-6 pt-6 pb-4 text-center flex-shrink-0"
          style={{
            backgroundColor: categoryColor,
            color: categoryFgColor,
          }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 text-3xl"
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            }}
          >
            {emoji}
          </div>
          <h2
            id="category-stats-title"
            className="text-xl font-bold"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
          >
            {categoryName}
          </h2>
          {/* Period label - shows the date range for these statistics */}
          {periodLabel && (
            <p className="text-sm opacity-80 mt-1">
              {periodLabel}
            </p>
          )}
          <p className="text-sm opacity-90 mt-1">
            {statistics.percentageOfTotal.toFixed(1)}% {t('ofTotal') || 'of total'}
          </p>
        </div>

        {/* Statistics content - scrollable */}
        <div
          className="px-6 py-4 overflow-y-auto flex-1"
          style={{
            // Leave room for the fixed button footer (approx 5rem)
            maxHeight: 'calc(100vh - 20rem - var(--safe-top, 0px) - var(--safe-bottom, 0px))',
          }}
        >
          {/* Transaction Statistics */}
          <SectionHeader
            title={t('statsTransactions') || 'Transactions'}
            icon={<Receipt size={16} />}
            theme={theme}
          />

          <StatRow
            label={t('statsTransactionCount') || 'Count'}
            value={statistics.transactionCount}
            theme={theme}
          />
          <StatRow
            label={t('statsTotalSpent') || 'Total'}
            value={formatCurrency(statistics.totalSpent, currency)}
            highlight
            theme={theme}
          />
          <StatRow
            label={t('statsMinTransaction') || 'Minimum'}
            value={formatCurrency(statistics.minTransaction, currency)}
            icon={<TrendingDown size={14} style={{ color: 'var(--positive)' }} />}
            theme={theme}
          />
          <StatRow
            label={t('statsMaxTransaction') || 'Maximum'}
            value={formatCurrency(statistics.maxTransaction, currency)}
            icon={<TrendingUp size={14} style={{ color: 'var(--negative)' }} />}
            theme={theme}
          />
          <StatRow
            label={t('statsAvgTransaction') || 'Average'}
            value={formatCurrency(statistics.avgTransaction, currency)}
            theme={theme}
          />
          <StatRow
            label={t('statsMedianTransaction') || 'Median'}
            value={formatCurrency(statistics.medianTransaction, currency)}
            theme={theme}
          />

          {/* Item Statistics (if available) */}
          {hasItemStats && (
            <>
              <SectionHeader
                title={t('statsItems') || 'Items'}
                icon={<ShoppingBag size={16} />}
                theme={theme}
              />

              <StatRow
                label={t('statsItemCount') || 'Count'}
                value={statistics.itemCount!}
                theme={theme}
              />
              <StatRow
                label={t('statsMinItemPrice') || 'Min Price'}
                value={formatCurrency(statistics.minItemPrice!, currency)}
                icon={<TrendingDown size={14} style={{ color: 'var(--positive)' }} />}
                theme={theme}
              />
              <StatRow
                label={t('statsMaxItemPrice') || 'Max Price'}
                value={formatCurrency(statistics.maxItemPrice!, currency)}
                icon={<TrendingUp size={14} style={{ color: 'var(--negative)' }} />}
                theme={theme}
              />
              <StatRow
                label={t('statsAvgItemPrice') || 'Avg Price'}
                value={formatCurrency(statistics.avgItemPrice!, currency)}
                theme={theme}
              />
              <StatRow
                label={t('statsMedianItemPrice') || 'Median Price'}
                value={formatCurrency(statistics.medianItemPrice!, currency)}
                theme={theme}
              />
            </>
          )}

          {/* Insights */}
          {statistics.topMerchant && (
            <>
              <SectionHeader
                title={t('statsInsights') || 'Insights'}
                icon={<Store size={16} />}
                theme={theme}
              />

              <StatRow
                label={t('statsTopMerchant') || 'Top Merchant'}
                value={statistics.topMerchant}
                theme={theme}
              />
              <StatRow
                label={t('statsTopMerchantCount') || 'Visits'}
                value={statistics.topMerchantCount || 0}
                theme={theme}
              />
            </>
          )}
        </div>

        {/* Fixed footer with View History Button - always visible */}
        {/* Story 14.44: Use categoryFgColor for button text (respects colorful/plain mode) */}
        <div
          className="px-6 py-4 flex-shrink-0"
          style={{
            backgroundColor: 'var(--surface)',
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
          }}
        >
          <button
            onClick={onViewHistory}
            className="w-full py-3 px-4 rounded-xl font-medium transition-colors min-h-12 flex items-center justify-center gap-2"
            style={{
              backgroundColor: categoryColor,
              color: categoryFgColor,
            }}
          >
            <Receipt size={18} />
            {isItemLevel
              ? (t('viewItems') || 'View Items')
              : (t('viewHistory') || 'View History')}
          </button>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default CategoryStatisticsPopup;
