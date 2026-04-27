/**
 * ErrorState Component
 *
 * Story 14e-16: Error state when batch review encounters a fatal error.
 * Shows error message with retry and dismiss options.
 *
 * @see docs/sprint-artifacts/epic14e-feature-architecture/stories/14e-16-batch-review-feature-orchestrator.md
 */

import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export interface ErrorStateProps {
  /** Translation function */
  t: (key: string) => string;
  /** Current theme */
  theme: 'light' | 'dark';
  /** Called when user clicks retry */
  onRetry?: () => void;
  /** Called when user dismisses the error */
  onDismiss: () => void;
}

/**
 * ErrorState Component
 *
 * Displays error message with retry and dismiss options.
 * Used when batch phase is 'error'.
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  t,
  theme,
  onRetry,
  onDismiss,
}) => {
  const isDark = theme === 'dark';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  return (
    <div
      className="flex flex-col items-center justify-center h-full p-6"
      style={{ backgroundColor: 'var(--bg)' }}
      role="alert"
      aria-live="assertive"
      data-testid="batch-error-state"
    >
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
      </div>
      <p className={`text-xl font-semibold ${textPrimary} mb-2`}>
        {t('batchError') || 'Something went wrong'}
      </p>
      <p className={`text-sm ${textSecondary} mb-6 text-center`}>
        {t('batchErrorMessage') || 'Unable to save receipts. Please try again.'}
      </p>
      <div className="flex gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-colors"
            style={{ backgroundColor: 'var(--primary)' }}
            data-testid="error-retry-button"
          >
            <RotateCcw size={16} />
            {t('retry') || 'Retry'}
          </button>
        )}
        <button
          onClick={onDismiss}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isDark
              ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
          }`}
          data-testid="error-dismiss-button"
        >
          {t('dismiss') || 'Dismiss'}
        </button>
      </div>
    </div>
  );
};

export default ErrorState;
