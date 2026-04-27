/**
 * useScanStore — Credit & Control tests
 *
 * Control actions: restoreState, refundCredit (credit lifecycle management).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getScanState, scanActions, registerCreditRefundCallback } from '../index';
import { createMockTransaction, resetAllStores, getWorkflowState } from './helpers';

describe('useScanStore — Credit & Control', () => {
  beforeEach(() => {
    resetAllStores();
  });

  describe('Control actions', () => {
    it('restoreState restores state from persistence', () => {
      const savedState = {
        phase: 'capturing' as const,
        mode: 'single' as const,
        images: ['saved-image'],
        requestId: 'saved-req',
        userId: 'saved-user',
      };
      scanActions.restoreState(savedState);
      expect(getScanState().phase).toBe('capturing');
      expect(getWorkflowState().images).toContain('saved-image');
      expect(getScanState().requestId).toBe('saved-req');
    });

    it('restoreState transitions interrupted scanning to error', () => {
      const interruptedState = {
        phase: 'scanning' as const,
        creditStatus: 'reserved' as const,
      };
      scanActions.restoreState(interruptedState);
      expect(getScanState().phase).toBe('error');
      expect(getScanState().creditStatus).toBe('refunded');
      expect(getScanState().error).toContain('interrumpido');
    });

    it('refundCredit changes creditStatus from reserved to refunded', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('image');
      scanActions.processStart('normal', 1);
      expect(getScanState().creditStatus).toBe('reserved');
      scanActions.refundCredit();
      expect(getScanState().creditStatus).toBe('refunded');
    });

    it('refundCredit does NOT change if creditStatus is not reserved', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('image');
      scanActions.processStart('normal', 1);
      scanActions.processSuccess([createMockTransaction()]);
      expect(getScanState().creditStatus).toBe('confirmed');
      scanActions.refundCredit();
      expect(getScanState().creditStatus).toBe('confirmed');
    });
  });

  describe('restoreState runtime validation', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('rejects state with unknown keys and logs warning', () => {
      const malformed = {
        phase: 'capturing' as const,
        bogusKey: 'should-not-exist',
        anotherFake: 42,
      };
      scanActions.restoreState(malformed as Record<string, unknown>);
      // Should still restore valid keys
      expect(getScanState().phase).toBe('capturing');
      // Should log warning about unknown keys
      expect(consoleSpy).toHaveBeenCalledWith(
        '[ScanStore:guard]',
        expect.stringContaining('unknown keys')
      );
    });

    it('rejects non-object input gracefully', () => {
      scanActions.restoreState(null as unknown as Record<string, unknown>);
      // Should remain in initial state
      expect(getScanState().phase).toBe('idle');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[ScanStore:guard]',
        expect.stringContaining('invalid restoreState input')
      );
    });

    it('accepts valid partial state without warnings', () => {
      const validPartial = {
        phase: 'reviewing' as const,
        results: [createMockTransaction()],
      };
      scanActions.restoreState(validPartial);
      expect(getScanState().phase).toBe('reviewing');
      // No guard violation warnings for valid input
      const guardCalls = consoleSpy.mock.calls.filter(
        (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('[ScanStore:guard]') && typeof c[1] === 'string' && c[1].includes('unknown keys')
      );
      expect(guardCalls).toHaveLength(0);
    });

    it('rejects invalid phase value (number) and falls back to initial', () => {
      const malformedValues = {
        phase: 123,
        images: ['valid-image'],
      } as unknown as Record<string, unknown>;
      scanActions.restoreState(malformedValues);
      // Invalid phase replaced with initialScanState default
      expect(getScanState().phase).toBe('idle');
      // Valid images still applied
      expect(getWorkflowState().images).toEqual(['valid-image']);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[ScanStore:guard]',
        expect.stringContaining('invalid phase')
      );
    });

    it('rejects invalid phase value (string not in enum) and falls back to initial', () => {
      const malformedValues = {
        phase: 'notAPhase',
        images: ['valid-image'],
      } as unknown as Record<string, unknown>;
      scanActions.restoreState(malformedValues);
      expect(getScanState().phase).toBe('idle');
      expect(getWorkflowState().images).toEqual(['valid-image']);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[ScanStore:guard]',
        expect.stringContaining('invalid phase')
      );
    });

    it('rejects non-array images value (string) and falls back to initial', () => {
      const malformedValues = {
        phase: 'capturing' as const,
        images: 'not-an-array',
      } as unknown as Record<string, unknown>;
      scanActions.restoreState(malformedValues);
      expect(getScanState().phase).toBe('capturing');
      // Invalid images replaced with initialScanState default
      expect(getWorkflowState().images).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[ScanStore:guard]',
        expect.stringContaining('invalid images')
      );
    });

    it('rejects null images value and falls back to initial', () => {
      const malformedValues = {
        phase: 'capturing' as const,
        images: null,
      } as unknown as Record<string, unknown>;
      scanActions.restoreState(malformedValues);
      expect(getScanState().phase).toBe('capturing');
      expect(getWorkflowState().images).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[ScanStore:guard]',
        expect.stringContaining('invalid images')
      );
    });

    it('rejects invalid creditStatus value and falls back to initial', () => {
      const malformedValues = {
        phase: 'reviewing' as const,
        creditStatus: 'bogus-status',
      } as unknown as Record<string, unknown>;
      scanActions.restoreState(malformedValues);
      expect(getScanState().phase).toBe('reviewing');
      // Invalid creditStatus replaced with initialScanState default
      expect(getScanState().creditStatus).toBe('none');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[ScanStore:guard]',
        expect.stringContaining('invalid creditStatus')
      );
    });

    it('accepts valid enum values without warnings', () => {
      const validState = {
        phase: 'reviewing' as const,
        images: ['img-1', 'img-2'],
        creditStatus: 'confirmed' as const,
      };
      scanActions.restoreState(validState);
      expect(getScanState().phase).toBe('reviewing');
      expect(getWorkflowState().images).toEqual(['img-1', 'img-2']);
      expect(getScanState().creditStatus).toBe('confirmed');
      // No type validation warnings
      const typeCalls = consoleSpy.mock.calls.filter(
        (c: unknown[]) => typeof c[1] === 'string' && (
          c[1].includes('invalid phase') || c[1].includes('invalid images') || c[1].includes('invalid creditStatus')
        )
      );
      expect(typeCalls).toHaveLength(0);
    });
  });

  // =========================================================================
  // TD-18-3: Credit safety net tests
  // =========================================================================

  describe('Credit safety net (TD-18-3)', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;
    const mockRefund = vi.fn<(amount: number) => Promise<void>>().mockResolvedValue(undefined);

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockRefund.mockClear();
      registerCreditRefundCallback(mockRefund);
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      // Unregister callback
      registerCreditRefundCallback(null);
    });

    // AC-17: reset() with creditStatus 'reserved' → refund + guard violation
    it('reset() with creditStatus reserved calls refund and logs guard violation', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('image');
      scanActions.processStart('normal', 1);
      expect(getScanState().creditStatus).toBe('reserved');

      scanActions.reset();

      expect(mockRefund).toHaveBeenCalledWith(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[ScanStore:guard]',
        expect.stringContaining('credit safety net')
      );
      expect(getScanState().creditStatus).toBe('none');
      expect(getScanState().phase).toBe('idle');
    });

    // AC-18: reset() with creditStatus 'none' → no refund
    it('reset() with creditStatus none does NOT call refund', () => {
      scanActions.startSingle('test-user');
      expect(getScanState().creditStatus).toBe('none');

      scanActions.reset();

      expect(mockRefund).not.toHaveBeenCalled();
    });

    // AC-19: cancel() with creditStatus 'confirmed' → refund + guard violation
    it('cancel() with creditStatus confirmed calls refund and logs guard violation', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('image');
      scanActions.processStart('normal', 1);
      scanActions.processSuccess([createMockTransaction()]);
      expect(getScanState().creditStatus).toBe('confirmed');

      scanActions.cancel();

      expect(mockRefund).toHaveBeenCalledWith(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[ScanStore:guard]',
        expect.stringContaining('credit safety net')
      );
    });

    // AC-20: processStart → processError → reset → no double-refund
    it('processError then reset does NOT double-refund (already refunded)', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('image');
      scanActions.processStart('normal', 1);
      scanActions.processError('test error');
      expect(getScanState().creditStatus).toBe('refunded');

      scanActions.reset();

      // 'refunded' is not 'reserved' or 'confirmed', so no safety net fires
      expect(mockRefund).not.toHaveBeenCalled();
    });

    // AC-21: processStart → dialog shown (no processSuccess) → reset → refund
    it('reserved credit with dialog shown then reset triggers refund (TD-18-3 scenario)', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('image');
      scanActions.processStart('normal', 1);
      expect(getScanState().creditStatus).toBe('reserved');

      // Dialog is shown (simulating showScanDialog call) but processSuccess never called
      scanActions.showDialog({ type: 'total_mismatch', data: {} });
      expect(getScanState().activeDialog).not.toBeNull();

      // Reset fires (simulating handleScanOverlayDismiss)
      scanActions.reset();

      expect(mockRefund).toHaveBeenCalledWith(1);
      expect(getScanState().creditStatus).toBe('none');
      expect(getScanState().phase).toBe('idle');
    });
  });
});
