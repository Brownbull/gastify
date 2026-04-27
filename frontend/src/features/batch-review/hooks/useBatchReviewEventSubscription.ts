/**
 * Story 16-7: Batch Review Event Subscription Hook
 * Story TD-16-5: Renamed from review:saved to batch:editing-finished (AC-3).
 *
 * Subscribes to batch:editing-finished events and transitions batch-review state.
 * Replaces direct cross-feature import of batchReviewActions in
 * useTransactionEditorHandlers.
 *
 * The transaction-editor feature emits events; batch-review listens locally.
 */

import { useEffect } from 'react';
import { appEvents } from '@shared/events';
import { batchReviewActions } from '@features/batch-review';

/**
 * Subscribe to batch:editing-finished events and transition batch review state.
 *
 * When batch editing is finished (cancel or save path) from the editor,
 * this hook receives the event and calls finishEditing() to transition
 * batch-review from editing → reviewing phase.
 *
 * AC-ARCH-PATTERN-3: Cleanup function returned in useEffect.
 */
export function useBatchReviewEventSubscription(): void {
  useEffect(() => {
    const handleEditingFinished = () => {
      batchReviewActions.finishEditing();
    };

    appEvents.on('batch:editing-finished', handleEditingFinished);
    return () => {
      appEvents.off('batch:editing-finished', handleEditingFinished);
    };
  }, []);
}
