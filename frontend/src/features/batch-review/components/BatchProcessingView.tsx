/**
 * BatchProcessingView Component
 *
 * Story 12.2: Parallel Processing Service
 * Enhanced batch processing view with parallel execution,
 * individual status tracking, and retry capability.
 *
 * Features:
 * - Parallel processing with concurrency limit (AC #1)
 * - Per-image status display (AC #2)
 * - Overall batch progress (AC #3)
 * - Error isolation (AC #4)
 * - Cancel functionality (AC #5)
 * - Retry for failed images (AC #6)
 * - Results collection (AC #7)
 *
 * @see docs/sprint-artifacts/epic12/story-12.2-parallel-processing-service.md
 */

import React, { useEffect, useCallback } from 'react';
import { Check, X, Loader2, RefreshCw, Clock } from 'lucide-react';
import { useBatchProcessing } from '../hooks/useBatchProcessing';
import { ImageProcessingState } from '@features/batch-review/services/batchProcessingService';
import { formatCurrency as formatCurrencyFn } from '@/utils/currency';
import type { Currency } from '@/types/settings';
import type { ReceiptType } from '@/services/gemini';

export interface BatchProcessingViewProps {
  /** Images to process (base64 data URLs) */
  images: string[];
  /** Currency for processing */
  currency: string;
  /** Optional store type hint */
  receiptType?: ReceiptType;
  /** Theme for styling */
  theme: 'light' | 'dark';
  /** Currency for formatting amounts */
  displayCurrency: Currency;
  /** Translation function */
  t: (key: string) => string;
  /** Called when processing completes */
  onComplete: (results: {
    successCount: number;
    failCount: number;
    transactions: import('@/types/transaction').Transaction[];
  }) => void;
  /** Called when user cancels */
  onCancel: () => void;
  /** Whether to auto-start processing */
  autoStart?: boolean;
}

/**
 * BatchProcessingView Component
 *
 * Displays parallel batch processing with:
 * - "Procesando X recibos..." header
 * - Overall progress bar with percentage
 * - Individual image status cards with icons
 * - Retry button for failed images
 * - Cancel button
 */
export const BatchProcessingView: React.FC<BatchProcessingViewProps> = ({
  images,
  currency,
  receiptType,
  theme,
  displayCurrency,
  t,
  onComplete,
  onCancel,
  autoStart = true,
}) => {
  const isDark = theme === 'dark';

  const {
    states,
    isProcessing,
    progress,
    startProcessing,
    cancel,
    retry,
    summary,
    isComplete,
    successfulTransactions,
  } = useBatchProcessing();

  // Auto-start processing when component mounts
  useEffect(() => {
    if (autoStart && images.length > 0 && !isProcessing && states.length === 0) {
      startProcessing(images, currency, receiptType);
    }
  }, [autoStart, images, currency, receiptType, isProcessing, states.length, startProcessing]);

  // Notify parent when complete
  useEffect(() => {
    if (isComplete) {
      onComplete({
        successCount: summary.ready,
        failCount: summary.error,
        transactions: successfulTransactions,
      });
    }
  }, [isComplete, summary.ready, summary.error, successfulTransactions, onComplete]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    cancel();
    onCancel();
  }, [cancel, onCancel]);

  // Handle retry for a specific image
  const handleRetry = useCallback(
    async (state: ImageProcessingState, imageIndex: number) => {
      await retry(state.id, images[imageIndex]);
    },
    [retry, images]
  );

  // Theme-based styling
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const cardBorder = isDark ? 'border-slate-700' : 'border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const progressBg = isDark ? 'bg-slate-700' : 'bg-slate-200';
  const progressFill = 'bg-blue-600';

  return (
    <div
      className={`rounded-2xl border ${cardBorder} ${cardBg} p-5 shadow-lg max-w-md w-full max-h-[80vh] flex flex-col`}
      role="status"
      aria-live="polite"
      aria-label={t('batchProcessingTitle')}
    >
      {/* Header with count */}
      <h2 className={`text-lg font-semibold ${textPrimary} mb-1`}>
        {t('batchProcessingTitle')}
      </h2>
      <p className={`text-sm ${textSecondary} mb-4`}>
        {t('batchProcessingCount').replace('{count}', String(images.length))}
      </p>

      {/* Overall progress bar (AC #3) */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className={`text-sm font-medium ${textSecondary}`}>
            {progress.current}/{progress.total}
          </span>
          <span className={`text-sm ${textSecondary}`}>
            {summary.percentComplete}%
          </span>
        </div>
        <div className={`h-2 rounded-full ${progressBg} overflow-hidden`}>
          <div
            className={`h-full ${progressFill} transition-all duration-300 ease-out`}
            style={{ width: `${summary.percentComplete}%` }}
            role="progressbar"
            aria-valuenow={progress.current}
            aria-valuemin={0}
            aria-valuemax={progress.total}
          />
        </div>
      </div>

      {/* Individual image statuses (AC #2) */}
      <div
        className="space-y-2 overflow-y-auto flex-1 min-h-0 mb-4"
        role="list"
        aria-label={t('batchResultsList')}
      >
        {states.map((state, index) => (
          <ImageStatusItem
            key={state.id}
            state={state}
            imageIndex={index}
            theme={theme}
            currency={displayCurrency}
            t={t}
            onRetry={() => handleRetry(state, state.index)}
          />
        ))}
      </div>

      {/* Summary stats */}
      {isComplete && (
        <div className={`flex gap-4 mb-4 p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
          <div className="flex items-center gap-2">
            <Check size={16} className="text-green-500" />
            <span className={`text-sm ${textSecondary}`}>
              {summary.ready} {t('batchSuccessful')}
            </span>
          </div>
          {summary.error > 0 && (
            <div className="flex items-center gap-2">
              <X size={16} className="text-red-500" />
              <span className={`text-sm ${textSecondary}`}>
                {summary.error} {t('batchFailed')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Cancel button (AC #5) */}
      {isProcessing && (
        <button
          onClick={handleCancel}
          className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
            isDark
              ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
          aria-label={t('batchCancelProcessing')}
        >
          {t('batchCancelProcessing')}
        </button>
      )}

      {/* Continue/Done button when complete */}
      {isComplete && (
        <button
          onClick={() =>
            onComplete({
              successCount: summary.ready,
              failCount: summary.error,
              transactions: successfulTransactions,
            })
          }
          className="w-full py-2.5 px-4 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          {t('batchContinue')}
        </button>
      )}
    </div>
  );
};

/**
 * Individual image status item with status icon and retry button
 */
interface ImageStatusItemProps {
  state: ImageProcessingState;
  imageIndex: number;
  theme: 'light' | 'dark';
  currency: Currency;
  t: (key: string) => string;
  onRetry: () => void;
}

const ImageStatusItem: React.FC<ImageStatusItemProps> = ({
  state,
  imageIndex,
  theme,
  currency,
  t,
  onRetry,
}) => {
  const isDark = theme === 'dark';

  // Status-specific styling and icons
  const getStatusConfig = () => {
    switch (state.status) {
      case 'ready':
        return {
          icon: <Check size={16} className="text-green-500" />,
          bg: isDark ? 'bg-green-900/20' : 'bg-green-50',
          text: isDark ? 'text-green-400' : 'text-green-700',
          showRetry: false,
        };
      case 'error':
        return {
          icon: <X size={16} className="text-red-500" />,
          bg: isDark ? 'bg-red-900/20' : 'bg-red-50',
          text: isDark ? 'text-red-400' : 'text-red-700',
          showRetry: true,
        };
      case 'processing':
      case 'uploading':
        return {
          icon: <Loader2 size={16} className="text-blue-500 animate-spin" />,
          bg: isDark ? 'bg-blue-900/20' : 'bg-blue-50',
          text: isDark ? 'text-blue-400' : 'text-blue-700',
          showRetry: false,
        };
      default: // pending
        return {
          icon: <Clock size={16} className={isDark ? 'text-slate-500' : 'text-slate-400'} />,
          bg: isDark ? 'bg-slate-700/50' : 'bg-slate-100',
          text: isDark ? 'text-slate-500' : 'text-slate-400',
          showRetry: false,
        };
    }
  };

  const config = getStatusConfig();

  // Content based on status
  const getContent = () => {
    switch (state.status) {
      case 'ready':
        if (state.result) {
          const merchant = state.result.alias || state.result.merchant || t('unknown');
          const total = formatCurrencyFn(state.result.total || 0, currency);
          return `${merchant} - ${total}`;
        }
        return t('batchItemReady');
      case 'error':
        return state.error || t('batchItemFailed');
      case 'processing':
        return t('batchItemProcessing');
      case 'uploading':
        return t('batchItemUploading');
      default:
        return t('batchItemPending');
    }
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg ${config.bg} transition-all duration-200`}
      role="listitem"
      aria-label={`${t('receipt')} ${imageIndex + 1}: ${state.status}`}
    >
      {/* Status icon */}
      <div className="flex-shrink-0">{config.icon}</div>

      {/* Image number and content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            #{imageIndex + 1}
          </span>
          <span className={`text-sm truncate ${config.text}`}>{getContent()}</span>
        </div>

        {/* Progress bar for processing status */}
        {(state.status === 'processing' || state.status === 'uploading') && (
          <div className="mt-1 h-1 rounded-full bg-blue-200 overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Retry button for failed items (AC #6) */}
      {config.showRetry && (
        <button
          onClick={onRetry}
          className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${
            isDark
              ? 'hover:bg-slate-600 text-slate-400'
              : 'hover:bg-slate-200 text-slate-500'
          }`}
          aria-label={t('batchRetry')}
          title={t('batchRetry')}
        >
          <RefreshCw size={16} />
        </button>
      )}
    </div>
  );
};

export default BatchProcessingView;
