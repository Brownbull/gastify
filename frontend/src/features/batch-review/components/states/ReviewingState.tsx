/**
 * ReviewingState Component
 *
 * Story 14e-15: State component for batch reviewing phase.
 * Renders the list of receipt cards for review.
 *
 * @see docs/sprint-artifacts/epic14e-feature-architecture/stories/14e-15-batch-review-feature-components.md
 */

import React from 'react';
import { BatchReviewCard } from '../BatchReviewCard';
import type { BatchReceipt } from '@/types/batchReceipt';
import type { Currency } from '@/types/settings';

export interface ReviewingStateProps {
  /** Receipts to display */
  receipts: BatchReceipt[];
  /** Current theme */
  theme: 'light' | 'dark';
  /** Display currency */
  currency: Currency;
  /** Translation function */
  t: (key: string) => string;
  /** Called when Save button is clicked on a receipt */
  onSaveReceipt?: (receiptId: string) => Promise<void>;
  /** Called when Edit button is clicked */
  onEditReceipt: (receipt: BatchReceipt) => void;
  /** Called when Discard button is clicked */
  onDiscardReceipt: (receipt: BatchReceipt) => void;
  /** Called when Retry button is clicked */
  onRetryReceipt?: (receipt: BatchReceipt) => void;
}

/**
 * ReviewingState Component
 *
 * Displays the list of receipt cards for batch review.
 * Used when batch phase is 'reviewing'.
 */
export const ReviewingState: React.FC<ReviewingStateProps> = ({
  receipts,
  theme,
  currency,
  t,
  onSaveReceipt,
  onEditReceipt,
  onDiscardReceipt,
  onRetryReceipt,
}) => {
  return (
    <div className="space-y-3" role="list" aria-label={t('batchReviewList')}>
      {receipts.map((receipt) => (
        <BatchReviewCard
          key={receipt.id}
          receipt={receipt}
          theme={theme}
          currency={currency}
          t={t}
          onSave={onSaveReceipt ? async () => onSaveReceipt(receipt.id) : undefined}
          onEdit={() => onEditReceipt(receipt)}
          onDiscard={() => onDiscardReceipt(receipt)}
          onRetry={receipt.status === 'error' && onRetryReceipt ? () => onRetryReceipt(receipt) : undefined}
        />
      ))}
    </div>
  );
};

export default ReviewingState;
