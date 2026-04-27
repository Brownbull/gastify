/**
 * Story 14.15: Batch Complete Success Modal
 *
 * Displays after batch transactions are saved successfully.
 * Shows summary of saved transactions with totals and credit usage.
 *
 * @see docs/uxui/mockups/01_views/scan-overlay.html State 3.a
 */
import React from 'react';
import { X, Layers, DollarSign, BarChart3, Home } from 'lucide-react';
import type { Transaction } from '@/types/transaction';
import type { HistoryNavigationPayload } from '@features/analytics/utils/analyticsToHistoryFilters';

export interface BatchCompleteModalProps {
  /** List of saved transactions */
  transactions: Transaction[];
  /** Credits used for this batch */
  creditsUsed: number;
  /** Remaining credits after batch */
  creditsRemaining: number;
  /** Theme for styling */
  theme: 'light' | 'dark';
  /** Translation function */
  t: (key: string) => string;
  /** Called when user dismisses the modal (X button) */
  onDismiss: () => void;
  /** Called when user clicks "View History" - navigates to history with current month filter */
  onNavigateToHistory: (payload: HistoryNavigationPayload) => void;
  /** Called when user clicks "Go Home" */
  onGoHome: () => void;
  /** Format currency for display */
  formatCurrency: (amount: number, currency: string) => string;
}

/**
 * BatchCompleteModal Component
 *
 * Shows batch completion success with:
 * - Batch icon (Layers) in primary color theme
 * - "X Transactions Saved" header
 * - List of transactions with merchant names and amounts
 * - Total batch amount in primary color
 * - Credit usage summary
 * - "View History" and "Go Home" buttons
 *
 * Uses CSS custom properties for theme consistency:
 * --bg-secondary, --primary, --primary-light, --text-primary, etc.
 */
export const BatchCompleteModal: React.FC<BatchCompleteModalProps> = ({
  transactions,
  creditsUsed,
  creditsRemaining,
  // theme is passed but we use CSS variables for consistent theming
  theme: _theme,
  t,
  onDismiss,
  onNavigateToHistory,
  onGoHome,
  formatCurrency,
}) => {
  // Calculate total amount (assumes all transactions use same currency)
  const currency = transactions[0]?.currency || 'USD';
  const totalAmount = transactions.reduce((sum, tx) => sum + tx.total, 0);

  // Get current date for display
  const currentDate = new Date().toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Handle View History click - navigate to current month's transactions
  const handleViewHistory = () => {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    onNavigateToHistory({
      temporal: {
        level: 'month',
        year,
        month,
      },
    });
  };

  // Use CSS custom properties for theme consistency
  // These map to the app's design system variables

  return (
    <div
      className="rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] max-w-sm w-full"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '2px solid var(--border-light)',
      }}
      role="dialog"
      aria-labelledby="batch-complete-title"
    >
      {/* Close Button */}
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center z-10"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          color: 'var(--text-secondary)',
        }}
        aria-label={t('close')}
      >
        <X size={16} />
      </button>

      {/* Success Icon & Header - Uses Layers (batch FAD icon) with primary color */}
      <div className="p-5 flex flex-col items-center gap-3">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--primary-light)' }}
        >
          <Layers size={32} strokeWidth={2.5} style={{ color: 'var(--primary)' }} />
        </div>
        <div className="text-center">
          <h2
            id="batch-complete-title"
            className="text-xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            {transactions.length} {t('batchTransactionsSaved')}
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {t('batchProcessedSuccess')}
          </p>
        </div>
      </div>

      {/* Batch Summary */}
      <div className="px-5 flex-1 overflow-y-auto">
        <div
          className="rounded-xl p-3.5"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          {/* Summary Header */}
          <div className="flex justify-between items-center mb-2.5">
            <span
              className="text-xs uppercase tracking-wider"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {t('batchSummaryTitle')}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {currentDate}
            </span>
          </div>

          {/* Transaction List */}
          <div className="space-y-0">
            {transactions.map((tx, index) => (
              <div
                key={tx.id || index}
                className="flex justify-between items-center py-2"
                style={{
                  borderBottom: index < transactions.length - 1 ? '1px solid var(--border-light)' : 'none',
                }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: 'var(--primary)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {tx.merchant || tx.alias || t('unknownMerchant')}
                  </span>
                </div>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {formatCurrency(tx.total, tx.currency || 'USD')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Total Section */}
      <div className="px-5 pt-3">
        <div
          className="rounded-xl p-3.5 flex justify-between items-center"
          style={{ backgroundColor: 'var(--primary-light)' }}
        >
          <div className="flex items-center gap-2">
            <DollarSign size={20} style={{ color: 'var(--primary)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
              {t('batchTotal')}
            </span>
          </div>
          <span className="text-xl font-bold" style={{ color: 'var(--primary)' }}>
            {formatCurrency(totalAmount, currency)}
          </span>
        </div>
      </div>

      {/* Credit Usage */}
      <div className="px-5 pt-3 flex items-center justify-center gap-1.5">
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {t('creditsUsedRemaining')
            .replace('{used}', String(creditsUsed))
            .replace('{remaining}', String(creditsRemaining))}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="p-5 flex gap-3">
        <button
          onClick={handleViewHistory}
          className="flex-1 h-12 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
          style={{
            border: '2px solid var(--border-medium)',
            color: 'var(--text-primary)',
            backgroundColor: 'transparent',
          }}
        >
          <BarChart3 size={16} />
          {t('viewHistory')}
        </button>
        <button
          onClick={onGoHome}
          className="flex-1 h-12 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 text-white"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          <Home size={16} />
          {t('goHome')}
        </button>
      </div>
    </div>
  );
};

export default BatchCompleteModal;
