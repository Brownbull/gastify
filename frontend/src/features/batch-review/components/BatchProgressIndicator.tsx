/**
 * BatchProgressIndicator Component
 *
 * Story 14e-15: Extracted from BatchReviewView inline progress UI.
 *
 * Displays the batch processing progress:
 * - Progress header with count (X/Y)
 * - Progress bar with percentage
 * - Optional: List of processing states for each image
 *
 * @see docs/sprint-artifacts/epic14e-feature-architecture/stories/14e-15-batch-review-feature-components.md
 */

import React from 'react';
import { Loader2, Check, X } from 'lucide-react';
import { useBatchProgress } from '../store';

export interface ImageProcessingState {
  /** Unique ID for this processing state */
  id: string;
  /** Current status - includes 'uploading' from batchProcessingService */
  status: 'pending' | 'processing' | 'ready' | 'error' | 'uploading';
  /** Error message if status is error */
  error?: string;
  /** Result data if status is ready */
  result?: {
    merchant?: string;
    total?: number;
  };
}

export interface BatchProgressIndicatorProps {
  /** Translation function */
  t: (key: string) => string;
  /** Current theme */
  theme: 'light' | 'dark';
  /** Processing states for each image (optional - if not provided, shows simple progress) */
  states?: ImageProcessingState[];
  /** Format currency function (optional - for displaying results) */
  formatCurrency?: (amount: number, currency: string) => string;
  /** Currency for display */
  currency?: string;
  /** Called when user cancels processing */
  onCancel?: () => void;
  /** Override progress values (for when not using store) */
  progress?: { current: number; total: number };
}

/**
 * BatchProgressIndicator Component
 *
 * Shows batch processing progress with optional detailed states list.
 */
export const BatchProgressIndicator: React.FC<BatchProgressIndicatorProps> = ({
  t,
  theme,
  states,
  formatCurrency,
  currency = 'USD',
  onCancel,
  progress: progressProp,
}) => {
  const isDark = theme === 'dark';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';

  // Use store selector or prop
  const storeProgress = useBatchProgress();
  const progress = progressProp || storeProgress || { current: 0, total: 0 };

  const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Processing header */}
      <div className={`px-4 py-3 border-b ${borderColor}`} style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="flex items-center justify-between">
          <span className={`text-base font-medium ${textPrimary}`}>
            {t('batchProcessing')} ({progress.current}/{progress.total})
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <Loader2 size={12} className="animate-spin" />
            {t('processing')}
          </span>
        </div>
        {/* Progress bar */}
        <div className="mt-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <div
            className="bg-amber-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
            role="progressbar"
            aria-valuenow={progress.current}
            aria-valuemin={0}
            aria-valuemax={progress.total}
          />
        </div>
      </div>

      {/* Processing states list (optional) */}
      {states && states.length > 0 && (
        <div
          className="flex-1 overflow-y-auto p-4 space-y-3"
          role="list"
          aria-label={t('batchProcessingList')}
        >
          {states.map((state, index) => (
            <div
              key={state.id}
              className={`rounded-lg border ${borderColor} ${isDark ? 'bg-slate-800' : 'bg-white'} p-4 flex items-center gap-3`}
            >
              {/* Status icon */}
              <div className="flex-shrink-0">
                {(state.status === 'processing' || state.status === 'uploading') && <Loader2 size={20} className="text-amber-500 animate-spin" />}
                {state.status === 'ready' && <Check size={20} className="text-green-500" />}
                {state.status === 'error' && <X size={20} className="text-red-500" />}
                {state.status === 'pending' && (
                  <div className={`w-5 h-5 rounded-full border-2 ${isDark ? 'border-slate-600' : 'border-slate-300'}`} />
                )}
              </div>

              {/* Receipt info */}
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${textPrimary}`}>
                  {t('receipt')} {index + 1}
                </p>
                {state.status === 'ready' && state.result && (
                  <p className={`text-sm ${textSecondary}`}>
                    {state.result.merchant || t('unknown')} •{' '}
                    {formatCurrency ? formatCurrency(state.result.total || 0, currency) : `$${state.result.total || 0}`}
                  </p>
                )}
                {state.status === 'error' && state.error && <p className="text-sm text-red-500">{state.error}</p>}
                {state.status === 'processing' && <p className={`text-sm ${textSecondary}`}>{t('analyzing')}...</p>}
                {state.status === 'uploading' && <p className={`text-sm ${textSecondary}`}>{t('uploading') || 'Uploading'}...</p>}
                {state.status === 'pending' && <p className={`text-sm ${textSecondary}`}>{t('waiting')}...</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancel button */}
      {onCancel && (
        <div
          className={`px-4 py-4 border-t ${borderColor}`}
          style={{ backgroundColor: 'var(--bg-secondary)', paddingBottom: 'calc(1rem + var(--safe-bottom, 0px))' }}
        >
          <button
            onClick={onCancel}
            className={`w-full py-3 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
              isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            }`}
          >
            {t('cancel')}
          </button>
        </div>
      )}
    </div>
  );
};

export default BatchProgressIndicator;
