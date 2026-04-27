/**
 * Shared test helpers for scan store tests.
 * Avoids duplication of mock factories across test files.
 * Story 16-6: Updated for shared workflow store migration.
 */

import type { Transaction } from '@/types/transaction';
import type { BatchReceipt } from '@/types/batchReceipt';
import { useScanStore, initialScanState, getScanState } from '../index';
import { useScanWorkflowStore, getWorkflowState } from '@shared/stores/useScanWorkflowStore';

export { getWorkflowState };

export function createMockTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'test-tx-1',
    date: '2026-01-25',
    merchant: 'Test Merchant',
    category: 'Supermarket',
    total: 1000,
    items: [{ name: 'Test Item', totalPrice: 1000, qty: 1 }],
    currency: 'CLP',
    ...overrides,
  };
}

export function createMockBatchReceipts(count: number = 3): BatchReceipt[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `receipt-${i}`,
    index: i,
    transaction: createMockTransaction({ id: `tx-${i}`, merchant: `Store ${i}` }),
    status: i === 0 ? 'ready' : i === 1 ? 'review' : 'error',
    confidence: i === 0 ? 0.95 : i === 1 ? 0.6 : 0,
    error: i === 2 ? 'Processing failed' : undefined,
  })) as BatchReceipt[];
}

/**
 * Reset both scan store and workflow store between tests.
 * Story 16-6: Must reset both stores since state is split.
 *
 * INTENTIONAL TEST COUPLING (TD-16-4 AC-3):
 * This function directly resets both stores because they form a tightly-coupled
 * writer/reader pair (scan writes, shared store transports). A store registry
 * pattern would add indirection for minimal gain — these are the only two stores
 * that need coordinated reset, and this is test-only code.
 */
export function resetAllStores(): void {
  useScanStore.setState(initialScanState);
  useScanWorkflowStore.getState().reset();
}

/**
 * Get scan-local state only (excludes workflow fields that moved to shared store).
 * Story 16-6: Removed images, batchProgress, batchReceipts, batchEditingIndex.
 */
export function getStateOnly(): typeof initialScanState {
  const fullState = getScanState();
  return {
    phase: fullState.phase,
    mode: fullState.mode,
    requestId: fullState.requestId,
    userId: fullState.userId,
    startedAt: fullState.startedAt,
    results: fullState.results,
    activeResultIndex: fullState.activeResultIndex,
    creditStatus: fullState.creditStatus,
    creditType: fullState.creditType,
    creditsCount: fullState.creditsCount,
    activeDialog: fullState.activeDialog,
    error: fullState.error,
    storeType: fullState.storeType,
    currency: fullState.currency,
    skipScanCompleteModal: fullState.skipScanCompleteModal,
    isRescanning: fullState.isRescanning,
    // Overlay state (Story 16-2)
    overlayState: fullState.overlayState,
    overlayProgress: fullState.overlayProgress,
    overlayEta: fullState.overlayEta,
    overlayError: fullState.overlayError,
    processingHistory: fullState.processingHistory,
    processingStartedAt: fullState.processingStartedAt,
    // Pending scan state (Story 18-13b)
    pendingScanId: fullState.pendingScanId,
    pendingScanDeadline: fullState.pendingScanDeadline,
    pendingScanStatus: fullState.pendingScanStatus,
    processedScanId: fullState.processedScanId,
  };
}
