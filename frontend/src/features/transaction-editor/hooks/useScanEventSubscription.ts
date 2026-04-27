/**
 * Story 16-7: Scan Event Subscription Hook
 * Story TD-16-5: Reads from shared workflow store instead of getScanState() (AC-2).
 *
 * Subscribes to scan:completed events and sets up transaction-editor state.
 * Replaces direct cross-feature import of transactionEditorActions in processScan.
 *
 * The scan feature emits events; this feature listens and reacts locally.
 * Data is read from the shared workflow store (pendingTransaction), not from
 * the scan feature store — eliminating cross-feature read coupling.
 */

import { useEffect, useRef } from 'react';
import { appEvents } from '@shared/events';
import { useTransactionEditorActions } from '@features/transaction-editor/store';
import { getWorkflowState } from '@shared/stores';

/**
 * Subscribe to scan:completed events and hydrate editor state.
 *
 * Must be mounted in a component that lives for the duration of scan flows
 * (e.g., App-level or feature orchestrator).
 *
 * Reads pendingTransaction from the shared workflow store (set synchronously
 * by processSuccess before the event fires).
 *
 * AC-ARCH-PATTERN-3: Cleanup function returned in useEffect.
 */
export function useScanEventSubscription(): void {
  const actions = useTransactionEditorActions();
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  useEffect(() => {
    const handleScanCompleted = (_event: { resultIndex: number }) => {
      const transaction = getWorkflowState().pendingTransaction;
      if (!transaction) return;

      actionsRef.current.setTransaction(transaction);
      actionsRef.current.setCreditUsed(true);
      actionsRef.current.setAnimateItems(true);
    };

    appEvents.on('scan:completed', handleScanCompleted);
    return () => {
      appEvents.off('scan:completed', handleScanCompleted);
    };
  }, []); // Stable — reads from shared store getState() and ref
}
