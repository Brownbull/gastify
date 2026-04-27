/**
 * Story 11.1: One Image = One Transaction - Batch Processing Progress Component
 *
 * Shows real-time progress during batch image processing, displaying:
 * - Overall progress bar (X/Y)
 * - Individual image results as they complete
 * - Success, processing, and failure states for each image
 *
 * @see docs/sprint-artifacts/epic11/story-11.1-one-image-one-transaction.md
 */
import React from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { formatCurrency as formatCurrencyFn } from '@/utils/currency';
import type { Currency } from '@/types/settings';

/** Result status for each processed image */
export type BatchItemStatus = 'pending' | 'processing' | 'success' | 'failed';

/** Result of processing a single image */
export interface BatchItemResult {
  /** Index of the image in the original batch */
  index: number;
  /** Current processing status */
  status: BatchItemStatus;
  /** Merchant name if successfully processed */
  merchant?: string;
  /** Transaction total if successfully processed */
  total?: number;
  /** Error message if processing failed */
  error?: string;
}

export interface BatchProcessingProgressProps {
  /** Current image being processed (1-indexed) */
  current: number;
  /** Total number of images in batch */
  total: number;
  /** Results for each processed image */
  results: BatchItemResult[];
  /** Theme for styling */
  theme: 'light' | 'dark';
  /** Currency for formatting amounts */
  currency: Currency;
  /** Translation function */
  t: (key: string) => string;
  /** Optional callback to cancel batch processing */
  onCancel?: () => void;
}

/**
 * BatchProcessingProgress Component
 *
 * Displays:
 * - "Procesando boletas..." title
 * - Progress bar with "X/Y" indicator
 * - Real-time results list showing success/processing/failed states
 */
export const BatchProcessingProgress: React.FC<BatchProcessingProgressProps> = ({
  current,
  total,
  results,
  theme,
  currency,
  t,
  onCancel,
}) => {
  const isDark = theme === 'dark';
  const progressPercent = Math.min(100, (current / total) * 100);

  // Dynamic styling based on theme
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const cardBorder = isDark ? 'border-slate-700' : 'border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const progressBg = isDark ? 'bg-slate-700' : 'bg-slate-200';
  const progressFill = 'bg-blue-600';

  return (
    <div
      className={`rounded-2xl border ${cardBorder} ${cardBg} p-5 shadow-lg`}
      role="status"
      aria-live="polite"
      aria-label={t('batchProcessingTitle')}
    >
      {/* Title */}
      <h2 className={`text-lg font-semibold ${textPrimary} mb-4`}>
        {t('batchProcessingTitle')}
      </h2>

      {/* Progress bar with counter (AC #4) */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className={`text-sm font-medium ${textSecondary}`}>
            {current}/{total}
          </span>
          <span className={`text-sm ${textSecondary}`}>
            {Math.round(progressPercent)}%
          </span>
        </div>
        <div className={`h-2 rounded-full ${progressBg} overflow-hidden`}>
          <div
            className={`h-full ${progressFill} transition-all duration-300 ease-out`}
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={current}
            aria-valuemin={0}
            aria-valuemax={total}
          />
        </div>
      </div>

      {/* Results list */}
      <div className="space-y-2" role="list" aria-label={t('batchResultsList')}>
        {results.map((result) => (
          <BatchResultItem
            key={result.index}
            result={result}
            theme={theme}
            currency={currency}
            t={t}
          />
        ))}
      </div>

      {/* Cancel button */}
      {onCancel && (
        <button
          onClick={onCancel}
          className={`mt-4 w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
            isDark
              ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
          aria-label={t('batchCancelProcessing')}
        >
          {t('batchCancelProcessing')}
        </button>
      )}
    </div>
  );
};

/**
 * Individual result item showing status of one image processing
 */
const BatchResultItem: React.FC<{
  result: BatchItemResult;
  theme: 'light' | 'dark';
  currency: Currency;
  t: (key: string) => string;
}> = ({ result, theme, currency, t }) => {
  const isDark = theme === 'dark';

  // Status-specific styling
  const getStatusStyles = () => {
    switch (result.status) {
      case 'success':
        return {
          icon: <Check size={16} className="text-green-500" />,
          bg: isDark ? 'bg-green-900/20' : 'bg-green-50',
          text: isDark ? 'text-green-400' : 'text-green-700',
        };
      case 'failed':
        return {
          icon: <X size={16} className="text-red-500" />,
          bg: isDark ? 'bg-red-900/20' : 'bg-red-50',
          text: isDark ? 'text-red-400' : 'text-red-700',
        };
      case 'processing':
        return {
          icon: <Loader2 size={16} className="text-blue-500 animate-spin" />,
          bg: isDark ? 'bg-blue-900/20' : 'bg-blue-50',
          text: isDark ? 'text-blue-400' : 'text-blue-700',
        };
      default: // pending
        return {
          icon: <div className="w-4 h-4 rounded-full bg-slate-400" />,
          bg: isDark ? 'bg-slate-700/50' : 'bg-slate-100',
          text: isDark ? 'text-slate-500' : 'text-slate-400',
        };
    }
  };

  const styles = getStatusStyles();

  // Content to display
  const getContent = () => {
    switch (result.status) {
      case 'success':
        return (
          <span className={`text-sm ${styles.text}`}>
            {result.merchant} - {formatCurrencyFn(result.total || 0, currency)}
          </span>
        );
      case 'failed':
        return (
          <span className={`text-sm ${styles.text}`}>
            {t('batchItemFailed')}
          </span>
        );
      case 'processing':
        return (
          <span className={`text-sm ${styles.text}`}>
            {t('batchItemProcessing')}
          </span>
        );
      default: // pending
        return (
          <span className={`text-sm ${styles.text}`}>
            {t('batchItemPending')}
          </span>
        );
    }
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg ${styles.bg} transition-all duration-200`}
      role="listitem"
      aria-label={`${t('receipt')} ${result.index + 1}: ${result.status}`}
    >
      {styles.icon}
      {getContent()}
    </div>
  );
};

export default BatchProcessingProgress;
