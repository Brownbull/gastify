/**
 * CompleteState Component
 *
 * Story 14e-16: Success state after all receipts saved.
 * Shows saved/failed counts with auto-dismiss functionality.
 *
 * @see docs/sprint-artifacts/epic14e-feature-architecture/stories/14e-16-batch-review-feature-orchestrator.md
 */

import React, { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';

export interface CompleteStateProps {
  /** Translation function */
  t: (key: string) => string;
  /** Current theme */
  theme: 'light' | 'dark';
  /** Number of successfully saved receipts */
  savedCount: number;
  /** Number of failed receipts */
  failedCount: number;
  /** Called when complete state should be dismissed */
  onDismiss: () => void;
  /** Auto-dismiss delay in milliseconds (default: 2000) */
  autoDismissDelay?: number;
}

/**
 * CompleteState Component
 *
 * Displays success message after batch save completes.
 * Auto-dismisses after a configurable delay (default 2 seconds).
 */
export const CompleteState: React.FC<CompleteStateProps> = ({
  t,
  theme,
  savedCount,
  failedCount,
  onDismiss,
  autoDismissDelay = 2000,
}) => {
  const isDark = theme === 'dark';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  // Auto-dismiss timer
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(onDismiss, autoDismissDelay);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onDismiss, autoDismissDelay]);

  return (
    <div
      className="flex flex-col items-center justify-center h-full p-6"
      style={{ backgroundColor: 'var(--bg)' }}
      role="status"
      aria-live="polite"
      data-testid="batch-complete-state"
    >
      <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
        <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
      </div>
      <p className={`text-xl font-semibold ${textPrimary} mb-2`}>
        {t('batchSaveComplete') || 'Save Complete!'}
      </p>
      <p className={`text-sm ${textSecondary}`}>
        {savedCount} {t(savedCount === 1 ? 'receiptSaved' : 'receiptsSaved') || 'receipt(s) saved'}
        {failedCount > 0 && (
          <span className="text-amber-600 dark:text-amber-400 ml-2">
            ({failedCount} {t('failed') || 'failed'})
          </span>
        )}
      </p>
    </div>
  );
};

export default CompleteState;
