/**
 * useScanStore — Selector tests
 *
 * AC5: All selector return values tested via renderHook.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  scanActions,
  useScanPhase,
  useScanMode,
  useIsIdle,
  useIsProcessing,
  useHasActiveRequest,
  useHasError,
  useHasDialog,
  useIsBlocking,
  useCreditSpent,
  useCanNavigateFreely,
  useCanSave,
  useCurrentView,
  useImageCount,
  useResultCount,
} from '../index';
import { createMockTransaction, resetAllStores } from './helpers';

describe('useScanStore — Selectors (AC5)', () => {
  beforeEach(() => {
    resetAllStores();
  });

  it('useIsIdle returns true when phase === idle', () => {
    const { result } = renderHook(() => useIsIdle());
    expect(result.current).toBe(true);
    act(() => { scanActions.startSingle('test-user'); });
    expect(result.current).toBe(false);
  });

  it('useIsProcessing returns true during scanning/saving', () => {
    const { result } = renderHook(() => useIsProcessing());
    expect(result.current).toBe(false);
    act(() => {
      scanActions.startSingle('test-user');
      scanActions.addImage('image');
      scanActions.processStart('normal', 1);
    });
    expect(result.current).toBe(true);
    act(() => { scanActions.processSuccess([createMockTransaction()]); });
    expect(result.current).toBe(false);
    act(() => { scanActions.saveStart(); });
    expect(result.current).toBe(true);
  });

  it('useCanSave returns true only in valid reviewing state', () => {
    const { result } = renderHook(() => useCanSave());
    expect(result.current).toBe(false);
    act(() => { scanActions.startSingle('test-user'); });
    expect(result.current).toBe(false);
    act(() => {
      scanActions.addImage('image');
      scanActions.processStart('normal', 1);
      scanActions.processSuccess([createMockTransaction()]);
    });
    expect(result.current).toBe(true);
  });

  it('useCanSave returns false when result has zero total', () => {
    act(() => {
      scanActions.startSingle('test-user');
      scanActions.addImage('image');
      scanActions.processStart('normal', 1);
      scanActions.processSuccess([createMockTransaction({ total: 0 })]);
    });
    const { result } = renderHook(() => useCanSave());
    expect(result.current).toBe(false);
  });

  it('useImageCount returns correct count', () => {
    const { result } = renderHook(() => useImageCount());
    expect(result.current).toBe(0);
    act(() => {
      scanActions.startSingle('test-user');
      scanActions.addImage('image-1');
    });
    expect(result.current).toBe(1);
    act(() => {
      scanActions.addImage('image-2');
      scanActions.addImage('image-3');
    });
    expect(result.current).toBe(3);
  });

  it('useResultCount returns correct count', () => {
    const { result } = renderHook(() => useResultCount());
    expect(result.current).toBe(0);
    act(() => {
      scanActions.startSingle('test-user');
      scanActions.addImage('image');
      scanActions.processStart('normal', 1);
      scanActions.processSuccess([
        createMockTransaction({ id: 'tx-1' }),
        createMockTransaction({ id: 'tx-2' }),
      ]);
    });
    expect(result.current).toBe(2);
  });

  it('useHasActiveRequest returns true when phase !== idle', () => {
    const { result } = renderHook(() => useHasActiveRequest());
    expect(result.current).toBe(false);
    act(() => { scanActions.startSingle('test-user'); });
    expect(result.current).toBe(true);
  });

  it('useHasError returns true when phase === error', () => {
    const { result } = renderHook(() => useHasError());
    expect(result.current).toBe(false);
    act(() => {
      scanActions.startSingle('test-user');
      scanActions.addImage('image');
      scanActions.processStart('normal', 1);
      scanActions.processError('Test error');
    });
    expect(result.current).toBe(true);
  });

  it('useHasDialog returns true when activeDialog !== null', () => {
    const { result } = renderHook(() => useHasDialog());
    expect(result.current).toBe(false);
    act(() => { scanActions.showDialog({ type: 'currency_mismatch', data: {} }); });
    expect(result.current).toBe(true);
    act(() => { scanActions.dismissDialog(); });
    expect(result.current).toBe(false);
  });

  it('useIsBlocking returns true when active request AND dialog showing', () => {
    const { result } = renderHook(() => useIsBlocking());
    expect(result.current).toBe(false);
    act(() => { scanActions.startSingle('test-user'); });
    expect(result.current).toBe(false);
    act(() => { scanActions.showDialog({ type: 'currency_mismatch', data: {} }); });
    expect(result.current).toBe(true);
  });

  it('useCreditSpent returns true when creditStatus === confirmed', () => {
    const { result } = renderHook(() => useCreditSpent());
    expect(result.current).toBe(false);
    act(() => {
      scanActions.startSingle('test-user');
      scanActions.addImage('image');
      scanActions.processStart('normal', 1);
    });
    expect(result.current).toBe(false);
    act(() => { scanActions.processSuccess([createMockTransaction()]); });
    expect(result.current).toBe(true);
  });

  it('useCanNavigateFreely returns correct values', () => {
    const { result } = renderHook(() => useCanNavigateFreely());
    expect(result.current).toBe(true);
    act(() => { scanActions.startSingle('test-user'); });
    expect(result.current).toBe(true);
    act(() => { scanActions.showDialog({ type: 'currency_mismatch', data: {} }); });
    expect(result.current).toBe(false);
    act(() => {
      scanActions.dismissDialog();
      scanActions.addImage('image');
      scanActions.processStart('normal', 1);
    });
    expect(result.current).toBe(false);
  });

  it('useCurrentView returns correct view names', () => {
    const { result } = renderHook(() => useCurrentView());
    expect(result.current).toBe('none');
    act(() => { scanActions.startSingle('test-user'); });
    expect(result.current).toBe('single-capture');
    act(() => {
      scanActions.reset();
      scanActions.startBatch('test-user');
    });
    expect(result.current).toBe('batch-capture');
    act(() => {
      scanActions.addImage('image');
      scanActions.processStart('super', 1);
    });
    expect(result.current).toBe('processing');
    act(() => {
      scanActions.batchItemSuccess(0, createMockTransaction());
      scanActions.batchComplete();
    });
    expect(result.current).toBe('batch-review');
  });

  it('useScanPhase returns current phase', () => {
    const { result } = renderHook(() => useScanPhase());
    expect(result.current).toBe('idle');
    act(() => { scanActions.startSingle('test-user'); });
    expect(result.current).toBe('capturing');
  });

  it('useScanMode returns current mode', () => {
    const { result } = renderHook(() => useScanMode());
    expect(result.current).toBe('single');
    act(() => { scanActions.startBatch('test-user'); });
    expect(result.current).toBe('batch');
  });

  // ===========================================================================
  // Cross-slice integration tests (TD-16-1 AC-4)
  // ===========================================================================

  describe('Cross-slice: batch actions affect core selectors', () => {
    it('batchComplete transitions useCanSave from false to true', () => {
      const { result: canSave } = renderHook(() => useCanSave());
      expect(canSave.current).toBe(false);

      // Set up batch scanning state with completed items
      act(() => {
        scanActions.startBatch('test-user');
        scanActions.addImage('img1');
        scanActions.addImage('img2');
        scanActions.processStart('normal', 1);
        scanActions.batchItemSuccess(0, createMockTransaction({ id: 'tx-0' }));
        scanActions.batchComplete();
      });

      // Batch complete transitions to reviewing with results -> useCanSave = true
      expect(canSave.current).toBe(true);
    });

    it('batchComplete transitions useCurrentView from processing to batch-review', () => {
      const { result: view } = renderHook(() => useCurrentView());

      act(() => {
        scanActions.startBatch('test-user');
        scanActions.addImage('img1');
        scanActions.processStart('normal', 1);
      });
      expect(view.current).toBe('processing');

      act(() => {
        scanActions.batchItemSuccess(0, createMockTransaction());
        scanActions.batchComplete();
      });
      expect(view.current).toBe('batch-review');
    });
  });

  describe('Cross-slice: core actions affect credit selectors', () => {
    it('processStart sets creditStatus to reserved (useCreditSpent = false)', () => {
      const { result: creditSpent } = renderHook(() => useCreditSpent());
      expect(creditSpent.current).toBe(false);

      act(() => {
        scanActions.startSingle('test-user');
        scanActions.addImage('img1');
        scanActions.processStart('normal', 1);
      });
      // reserved != confirmed, so creditSpent stays false
      expect(creditSpent.current).toBe(false);
    });

    it('processSuccess sets creditStatus to confirmed (useCreditSpent = true)', () => {
      const { result: creditSpent } = renderHook(() => useCreditSpent());

      act(() => {
        scanActions.startSingle('test-user');
        scanActions.addImage('img1');
        scanActions.processStart('normal', 1);
        scanActions.processSuccess([createMockTransaction()]);
      });
      expect(creditSpent.current).toBe(true);
    });

    it('processError refunds credit (useCreditSpent = false)', () => {
      const { result: creditSpent } = renderHook(() => useCreditSpent());

      act(() => {
        scanActions.startSingle('test-user');
        scanActions.addImage('img1');
        scanActions.processStart('normal', 1);
        scanActions.processError('test error');
      });
      expect(creditSpent.current).toBe(false);
    });
  });
});
