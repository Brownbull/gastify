/**
 * EmptyState Component
 *
 * Story 14e-15: State component for empty batch review.
 * Renders a message when there are no receipts to review.
 *
 * @see docs/sprint-artifacts/epic14e-feature-architecture/stories/14e-15-batch-review-feature-components.md
 */

import React from 'react';

export interface EmptyStateProps {
  /** Translation function */
  t: (key: string) => string;
  /** Current theme */
  theme: 'light' | 'dark';
}

/**
 * EmptyState Component
 *
 * Displays an empty state message when there are no receipts.
 * Used when batch is empty (all discarded or no results).
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ t, theme }) => {
  const isDark = theme === 'dark';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  return (
    <div className={`text-center py-8 ${textSecondary}`} role="status" aria-live="polite">
      <p>{t('batchReviewEmpty')}</p>
    </div>
  );
};

export default EmptyState;
