/**
 * LoadingState Component
 *
 * Story 14e-16: Simple loading state for batch review.
 * Displays a loading spinner with message.
 *
 * @see docs/sprint-artifacts/epic14e-feature-architecture/stories/14e-16-batch-review-feature-orchestrator.md
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  /** Translation function */
  t: (key: string) => string;
  /** Current theme */
  theme: 'light' | 'dark';
}

/**
 * LoadingState Component
 *
 * Simple loading indicator with "Loading receipts..." message.
 * Used when batch phase is 'loading' but no processing states are available.
 */
export const LoadingState: React.FC<LoadingStateProps> = ({ t, theme }) => {
  const isDark = theme === 'dark';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';

  return (
    <div
      className="flex flex-col items-center justify-center h-full"
      style={{ backgroundColor: 'var(--bg)' }}
      role="status"
      aria-live="polite"
      data-testid="batch-loading-state"
    >
      <Loader2 className={`w-12 h-12 ${textPrimary} animate-spin mb-4`} />
      <p className={`text-lg font-medium ${textPrimary}`}>
        {t('batchLoading') || 'Loading receipts...'}
      </p>
    </div>
  );
};

export default LoadingState;
