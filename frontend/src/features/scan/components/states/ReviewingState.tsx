/**
 * Story 14e-9c: ReviewingState Component
 *
 * Renders when scan phase is 'reviewing'. Shows result preview UI.
 * Mode-aware: different layouts for single vs batch review.
 *
 * Note: This is a minimal placeholder. The full review UI is handled by
 * TransactionEditorView (single) and BatchReviewView (batch).
 * This component provides a consistent phase-gated entry point.
 *
 * @see docs/sprint-artifacts/epic14e-feature-architecture/stories/14e-9c-state-components-tests.md
 */
import React from 'react';
import { CheckCircle, FileStack } from 'lucide-react';
import { useScanPhase, useScanMode, useResultCount } from '../../store';

export interface ReviewingStateProps {
  /** Translation function */
  t: (key: string) => string;
  /** Theme for styling */
  theme: 'light' | 'dark';
  /** Callback when user wants to review/edit results */
  onReview?: () => void;
  /** Callback when user wants to save results */
  onSave?: () => void;
  /** Children to render (allows wrapping existing review UI) */
  children?: React.ReactNode;
}

/**
 * Reviewing state component - renders during result review.
 *
 * Phase guard: Returns null if phase !== 'reviewing'
 * Mode-aware:
 * - Single mode: Shows single transaction review prompt
 * - Batch mode: Shows batch review summary
 *
 * If children are provided, renders them (for wrapping existing review components).
 * Otherwise, shows a summary UI with review/save actions.
 */
export const ReviewingState: React.FC<ReviewingStateProps> = ({
  t,
  theme,
  onReview,
  onSave,
  children,
}) => {
  const phase = useScanPhase();
  const mode = useScanMode();
  const resultCount = useResultCount();

  // Phase guard - only render when reviewing
  if (phase !== 'reviewing') {
    return null;
  }

  // If children provided, render them directly (wrapper mode)
  if (children) {
    return <>{children}</>;
  }

  const isDark = theme === 'dark';
  const isBatch = mode === 'batch';
  const Icon = isBatch ? FileStack : CheckCircle;

  // Mode-aware messaging
  const title = isBatch
    ? t('batchReviewTitle') || 'Batch Review'
    : t('reviewTitle') || 'Review Transaction';

  const message = isBatch
    ? t('batchReviewMessage')?.replace('{count}', String(resultCount)) ||
      `${resultCount} receipts ready for review`
    : t('reviewMessage') || 'Review and confirm your transaction';

  return (
    <div
      className="flex flex-col items-center justify-center p-6 rounded-xl"
      style={{
        backgroundColor: 'var(--surface)',
        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
      }}
      role="status"
      aria-label={title}
    >
      {/* Success icon */}
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
        style={{
          backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)',
        }}
      >
        <Icon
          size={28}
          style={{ color: '#22c55e' }}
          aria-hidden="true"
        />
      </div>

      {/* Title */}
      <h3
        className="text-lg font-bold mb-2"
        style={{ color: 'var(--primary)' }}
      >
        {title}
      </h3>

      {/* Message */}
      <p
        className="text-sm text-center mb-6 max-w-xs"
        style={{ color: 'var(--secondary)' }}
      >
        {message}
      </p>

      {/* Action buttons */}
      <div className="flex gap-3 w-full max-w-xs">
        {/* Review/Edit button */}
        {onReview && (
          <button
            onClick={onReview}
            className="flex-1 py-3 px-4 rounded-xl font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: 'var(--accent)' }}
            aria-label={t('review') || 'Review'}
          >
            {t('review') || 'Review'}
          </button>
        )}

        {/* Quick Save button (single mode only) */}
        {onSave && !isBatch && (
          <button
            onClick={onSave}
            className="flex-1 py-3 px-4 rounded-xl font-bold transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{
              backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)',
              color: '#22c55e',
            }}
            aria-label={t('save') || 'Save'}
          >
            {t('save') || 'Save'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ReviewingState;
