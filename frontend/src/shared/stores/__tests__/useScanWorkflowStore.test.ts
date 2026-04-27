/**
 * Story 16-6: Shared Scan Workflow Store Tests
 *
 * Tests for the shared store that holds scan workflow data consumed by
 * batch-review and transaction-editor features. No phase guards — scan
 * feature mediates access.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import type { BatchReceipt } from '@/types/batchReceipt';
import type { BatchProgress } from '@shared/types/scanWorkflow';

// Store under test
import {
  useScanWorkflowStore,
  getWorkflowState,
} from '../useScanWorkflowStore';

/** Helper: get store actions via getState() (replaces removed workflowActions facade). */
const wf = () => useScanWorkflowStore.getState();

// =============================================================================
// Test Helpers
// =============================================================================

function createMockBatchReceipt(overrides: Partial<BatchReceipt> = {}): BatchReceipt {
  return {
    id: 'receipt-1',
    index: 0,
    transaction: {
      id: 'tx-1',
      date: '2026-01-01',
      merchant: 'Test Store',
      category: 'Supermarket',
      total: 1000,
      items: [{ name: 'Item', totalPrice: 1000, qty: 1 }],
      currency: 'CLP',
    },
    status: 'ready',
    confidence: 0.95,
    ...overrides,
  } as BatchReceipt;
}

function createMockBatchProgress(overrides: Partial<BatchProgress> = {}): BatchProgress {
  return {
    current: 0,
    total: 3,
    completed: [],
    failed: [],
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('useScanWorkflowStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useScanWorkflowStore.getState().reset();
    });
  });

  // =========================================================================
  // Initial State
  // =========================================================================

  describe('initial state', () => {
    it('has empty images array', () => {
      expect(getWorkflowState().images).toEqual([]);
    });

    it('has null batchReceipts', () => {
      expect(getWorkflowState().batchReceipts).toBeNull();
    });

    it('has null batchProgress', () => {
      expect(getWorkflowState().batchProgress).toBeNull();
    });

    it('has null batchEditingIndex', () => {
      expect(getWorkflowState().batchEditingIndex).toBeNull();
    });

    it('has single mode by default', () => {
      expect(getWorkflowState().mode).toBe('single');
    });

    it('has idle phase by default', () => {
      expect(getWorkflowState().phase).toBe('idle');
    });

    it('has null activeDialog', () => {
      expect(getWorkflowState().activeDialog).toBeNull();
    });

    it('has null pendingTransaction', () => {
      expect(getWorkflowState().pendingTransaction).toBeNull();
    });
  });

  // =========================================================================
  // Image Actions
  // =========================================================================

  describe('image actions', () => {
    it('setImages replaces all images', () => {
      act(() => {
        wf().setImages(['img1', 'img2']);
      });
      expect(getWorkflowState().images).toEqual(['img1', 'img2']);
    });

    it('addImage appends to images array', () => {
      act(() => {
        wf().setImages(['img1']);
        wf().addImage('img2');
      });
      expect(getWorkflowState().images).toEqual(['img1', 'img2']);
    });

    it('removeImage removes by index', () => {
      act(() => {
        wf().setImages(['a', 'b', 'c']);
        wf().removeImage(1);
      });
      expect(getWorkflowState().images).toEqual(['a', 'c']);
    });

    it('removeImage with out-of-range index is safe', () => {
      act(() => {
        wf().setImages(['a', 'b']);
        wf().removeImage(5);
      });
      expect(getWorkflowState().images).toEqual(['a', 'b']);
    });
  });

  // =========================================================================
  // Batch Receipt Actions
  // =========================================================================

  describe('batch receipt actions', () => {
    it('setBatchReceipts sets receipts array', () => {
      const receipts = [createMockBatchReceipt()];
      act(() => {
        wf().setBatchReceipts(receipts);
      });
      expect(getWorkflowState().batchReceipts).toEqual(receipts);
    });

    it('updateBatchReceipt updates by id', () => {
      const receipt = createMockBatchReceipt({ id: 'r1' });
      act(() => {
        wf().setBatchReceipts([receipt]);
        wf().updateBatchReceipt('r1', { confidence: 0.5 });
      });
      expect(getWorkflowState().batchReceipts![0].confidence).toBe(0.5);
    });

    it('updateBatchReceipt ignores unknown id', () => {
      const receipt = createMockBatchReceipt({ id: 'r1' });
      act(() => {
        wf().setBatchReceipts([receipt]);
        wf().updateBatchReceipt('unknown', { confidence: 0.5 });
      });
      expect(getWorkflowState().batchReceipts![0].confidence).toBe(0.95);
    });

    it('discardBatchReceipt removes by id', () => {
      const r1 = createMockBatchReceipt({ id: 'r1' });
      const r2 = createMockBatchReceipt({ id: 'r2', index: 1 });
      act(() => {
        wf().setBatchReceipts([r1, r2]);
        wf().discardBatchReceipt('r1');
      });
      expect(getWorkflowState().batchReceipts).toHaveLength(1);
      expect(getWorkflowState().batchReceipts![0].id).toBe('r2');
    });

    it('clearBatchReceipts sets to null', () => {
      act(() => {
        wf().setBatchReceipts([createMockBatchReceipt()]);
        wf().clearBatchReceipts();
      });
      expect(getWorkflowState().batchReceipts).toBeNull();
    });
  });

  // =========================================================================
  // Batch Progress Actions
  // =========================================================================

  describe('batch progress actions', () => {
    it('setBatchProgress sets progress object', () => {
      const progress = createMockBatchProgress();
      act(() => {
        wf().setBatchProgress(progress);
      });
      expect(getWorkflowState().batchProgress).toEqual(progress);
    });

    it('setBatchProgress(null) clears progress', () => {
      act(() => {
        wf().setBatchProgress(createMockBatchProgress());
        wf().setBatchProgress(null);
      });
      expect(getWorkflowState().batchProgress).toBeNull();
    });
  });

  // =========================================================================
  // Batch Editing Index Actions
  // =========================================================================

  describe('batch editing index actions', () => {
    it('setBatchEditingIndex sets index', () => {
      act(() => {
        wf().setBatchEditingIndex(2);
      });
      expect(getWorkflowState().batchEditingIndex).toBe(2);
    });

    it('setBatchEditingIndex(null) clears index', () => {
      act(() => {
        wf().setBatchEditingIndex(2);
        wf().setBatchEditingIndex(null);
      });
      expect(getWorkflowState().batchEditingIndex).toBeNull();
    });
  });

  // =========================================================================
  // Mode Actions
  // =========================================================================

  describe('mode actions', () => {
    it('setMode changes mode', () => {
      act(() => {
        wf().setMode('batch');
      });
      expect(getWorkflowState().mode).toBe('batch');
    });

    it('setMode to statement', () => {
      act(() => {
        wf().setMode('statement');
      });
      expect(getWorkflowState().mode).toBe('statement');
    });
  });

  // =========================================================================
  // Mirrored State Actions
  // =========================================================================

  describe('mirrored state actions', () => {
    it('setPhase changes phase', () => {
      act(() => {
        wf().setPhase('scanning');
      });
      expect(getWorkflowState().phase).toBe('scanning');
    });

    it('setActiveDialog sets dialog state', () => {
      const dialog = { type: 'cancel_warning' as const, data: null };
      act(() => {
        wf().setActiveDialog(dialog);
      });
      expect(getWorkflowState().activeDialog).toEqual(dialog);
    });

    it('setActiveDialog(null) clears dialog', () => {
      act(() => {
        wf().setActiveDialog({ type: 'cancel_warning' as const, data: null });
        wf().setActiveDialog(null);
      });
      expect(getWorkflowState().activeDialog).toBeNull();
    });
  });

  // =========================================================================
  // Pending Transaction Actions (TD-16-5)
  // =========================================================================

  describe('pending transaction actions', () => {
    it('setPendingTransaction stores transaction', () => {
      const tx = { merchant: 'Test', total: 500, date: '2026-03-07', category: 'Other' } as never;
      act(() => {
        wf().setPendingTransaction(tx);
      });
      expect(getWorkflowState().pendingTransaction).toEqual(tx);
    });

    it('setPendingTransaction(null) clears transaction', () => {
      act(() => {
        wf().setPendingTransaction({ merchant: 'Test', total: 500 } as never);
        wf().setPendingTransaction(null);
      });
      expect(getWorkflowState().pendingTransaction).toBeNull();
    });
  });

  // =========================================================================
  // Reset
  // =========================================================================

  describe('reset', () => {
    it('restores all state to initial values', () => {
      act(() => {
        wf().setImages(['img1']);
        wf().setMode('batch');
        wf().setPhase('scanning');
        wf().setBatchProgress(createMockBatchProgress());
        wf().setBatchReceipts([createMockBatchReceipt()]);
        wf().setBatchEditingIndex(1);
        wf().setActiveDialog({ type: 'cancel_warning' as const, data: null });
        wf().setPendingTransaction({ merchant: 'Store', total: 100, date: '2026-01-01', category: 'Other' } as never);
      });

      act(() => {
        useScanWorkflowStore.getState().reset();
      });

      const state = getWorkflowState();
      expect(state.images).toEqual([]);
      expect(state.mode).toBe('single');
      expect(state.phase).toBe('idle');
      expect(state.batchProgress).toBeNull();
      expect(state.batchReceipts).toBeNull();
      expect(state.batchEditingIndex).toBeNull();
      expect(state.activeDialog).toBeNull();
      expect(state.pendingTransaction).toBeNull();
    });
  });

  // =========================================================================
  // Direct Access (getWorkflowState, getState())
  // =========================================================================

  describe('direct access', () => {
    it('getWorkflowState returns current state snapshot', () => {
      act(() => {
        wf().setImages(['snapshot']);
      });
      expect(getWorkflowState().images).toEqual(['snapshot']);
    });

    it('getState().setImages works outside React', () => {
      wf().setImages(['direct']);
      expect(getWorkflowState().images).toEqual(['direct']);
    });
  });

  // =========================================================================
  // Derived Selectors
  // =========================================================================

  describe('derived selectors (isProcessing)', () => {
    it('isProcessing is false when idle', () => {
      const state = getWorkflowState();
      expect(state.phase === 'scanning' || state.phase === 'saving').toBe(false);
    });

    it('isProcessing is true when scanning', () => {
      act(() => {
        wf().setPhase('scanning');
      });
      const state = getWorkflowState();
      expect(state.phase === 'scanning' || state.phase === 'saving').toBe(true);
    });

    it('isProcessing is true when saving', () => {
      act(() => {
        wf().setPhase('saving');
      });
      const state = getWorkflowState();
      expect(state.phase === 'scanning' || state.phase === 'saving').toBe(true);
    });
  });
});
