/**
 * Story 16-7: Application Event Types
 * Story TD-16-5: Payload polish — resultIndex replaces empty transactionIds,
 *   review:saved renamed to batch:editing-finished.
 *
 * Typed event map for cross-feature communication via mitt.
 * Events use `feature:action` format with past tense (AC-ARCH-PATTERN-1).
 * Payloads carry indices/IDs only, never full objects (AC-ARCH-PATTERN-2).
 * Subscribers read full data from shared stores (useScanWorkflowStore).
 */

import type { ScanMode } from '@shared/types/scanWorkflow';

/**
 * Application-wide event map for typed mitt emitter.
 *
 * Convention: `feature:action` (past tense)
 * Payload: IDs/indices only — subscriber reads full data from shared stores.
 */
export type AppEvents = {
  /**
   * Scan completed — transaction available in shared workflow store.
   * resultIndex points to the active result set by processSuccess.
   * Subscriber reads pendingTransaction from getWorkflowState().
   */
  'scan:completed': { resultIndex: number };

  /** Scan cancelled by user. */
  'scan:cancelled': { mode: ScanMode };

  /**
   * Batch editing finished — batch-review should transition state.
   * Pure signal event (no payload data needed). Fired on cancel path
   * to indicate editing phase is complete.
   */
  'batch:editing-finished': Record<string, never>;
};
