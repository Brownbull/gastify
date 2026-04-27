/**
 * Story 16-1: Batch scan slice
 * Story 16-6: batchProgress, batchReceipts, batchEditingIndex moved to useScanWorkflowStore.
 *
 * Batch progress, receipts, and editing index.
 * Cross-slice reads: checks phase/mode from core slice via get().
 * Cross-slice writes: batchComplete sets phase, creditStatus, results, error.
 * Cross-store writes: all batch state writes go to shared workflow store.
 */

import type { StateCreator } from 'zustand';
import type { Transaction } from '@/types/transaction';
import type { BatchReceipt } from '@/types/batchReceipt';
import type { ScanFullStoreInternal, ScanBatchSlice } from './types';
import { logGuardViolation } from './guardLog';
import { useScanWorkflowStore } from '@shared/stores/useScanWorkflowStore';

// Shorthand for shared workflow store access
const wf = () => useScanWorkflowStore.getState();

export const createScanBatchSlice: StateCreator<
  ScanFullStoreInternal,
  [['zustand/devtools', never]],
  [],
  ScanBatchSlice
> = (set, get) => ({
  // State moved to useScanWorkflowStore (Story 16-6):
  // - batchProgress, batchReceipts, batchEditingIndex

  // =========================================================================
  // BATCH Actions (read/write shared workflow store, phase guards from scan store)
  // =========================================================================

  batchItemStart: (index: number) => {
    const state = get();
    if (state.phase !== 'scanning' || state.mode !== 'batch') return;
    const bp = wf().batchProgress;
    if (!bp) return;

    wf().setBatchProgress({ ...bp, current: index });
  },

  batchItemSuccess: (_index: number, result: Transaction) => {
    const state = get();
    if (state.phase !== 'scanning' || state.mode !== 'batch') return;
    const bp = wf().batchProgress;
    if (!bp) return;

    wf().setBatchProgress({
      ...bp,
      completed: [...bp.completed, result],
    });
  },

  batchItemError: (index: number, error: string) => {
    const state = get();
    if (state.phase !== 'scanning' || state.mode !== 'batch') return;
    const bp = wf().batchProgress;
    if (!bp) return;

    wf().setBatchProgress({
      ...bp,
      failed: [...bp.failed, { index, error }],
    });
  },

  batchComplete: (batchReceipts?: BatchReceipt[]) => {
    const state = get();
    if (state.phase !== 'scanning' || state.mode !== 'batch') {
      logGuardViolation({
        action: 'batchComplete',
        currentPhase: state.phase,
        expectedPhase: 'scanning',
        currentMode: state.mode,
        expectedMode: 'batch',
      });
      return;
    }
    const bp = wf().batchProgress;
    if (!bp) {
      logGuardViolation({
        action: 'batchComplete',
        currentPhase: state.phase,
        expectedPhase: 'scanning',
        detail: 'no batchProgress',
      });
      return;
    }

    // Cross-slice write: sets coreSlice (phase, error) and creditSlice (creditStatus) state
    set(
      {
        phase: 'reviewing',
        creditStatus: 'confirmed',
        results: bp.completed,
        error: null,
      },
      undefined,
      'scan/batchComplete'
    );
    // Update shared workflow store
    wf().setPhase('reviewing');
    if (batchReceipts !== undefined) {
      wf().setBatchReceipts(batchReceipts);
    }
  },

  setBatchReceipts: (receipts: BatchReceipt[]) => {
    const state = get();
    if (state.phase !== 'reviewing' || state.mode !== 'batch') {
      logGuardViolation({
        action: 'setBatchReceipts',
        currentPhase: state.phase,
        expectedPhase: 'reviewing',
        currentMode: state.mode,
        expectedMode: 'batch',
      });
      return;
    }

    wf().setBatchReceipts(receipts);
  },

  updateBatchReceipt: (id: string, updates: Partial<BatchReceipt>) => {
    const state = get();
    if (state.phase !== 'reviewing' || state.mode !== 'batch') {
      logGuardViolation({
        action: 'updateBatchReceipt',
        currentPhase: state.phase,
        expectedPhase: 'reviewing',
        currentMode: state.mode,
        expectedMode: 'batch',
      });
      return;
    }
    const batchReceipts = wf().batchReceipts;
    if (!batchReceipts) return;

    const receiptIndex = batchReceipts.findIndex((r) => r.id === id);
    if (receiptIndex === -1) {
      logGuardViolation({
        action: 'updateBatchReceipt',
        currentPhase: state.phase,
        expectedPhase: 'reviewing',
        detail: `receipt not found: ${id}`,
      });
      return;
    }

    wf().updateBatchReceipt(id, updates);
  },

  discardBatchReceipt: (id: string) => {
    const state = get();
    if (state.phase !== 'reviewing' || state.mode !== 'batch') return;
    if (!wf().batchReceipts) return;

    wf().discardBatchReceipt(id);
  },

  clearBatchReceipts: () => {
    wf().clearBatchReceipts();
  },

  setBatchEditingIndex: (index: number | null) => {
    if (index === null) {
      wf().setBatchEditingIndex(null);
      return;
    }

    const state = get();
    if (state.phase !== 'reviewing' || state.mode !== 'batch') {
      logGuardViolation({
        action: 'setBatchEditingIndex',
        currentPhase: state.phase,
        expectedPhase: 'reviewing',
        currentMode: state.mode,
        expectedMode: 'batch',
      });
      return;
    }

    const batchReceipts = wf().batchReceipts;
    if (!batchReceipts || index < 0 || index >= batchReceipts.length) {
      logGuardViolation({
        action: 'setBatchEditingIndex',
        currentPhase: state.phase,
        expectedPhase: 'reviewing',
        detail: `invalid index: ${index}`,
      });
      return;
    }

    wf().setBatchEditingIndex(index);
  },
});
