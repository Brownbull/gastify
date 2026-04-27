/**
 * useScanStore — Guards & Edge Cases
 *
 * AC2: Reset/cancel transitions, AC3: Invalid phase transition guards, AC4: Edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initialScanState, getScanState, scanActions } from '../index';
import { logGuardViolation } from '../slices/guardLog';
import { createMockTransaction, getStateOnly, resetAllStores, getWorkflowState } from './helpers';

describe('useScanStore — Guards & Edge Cases', () => {
  beforeEach(() => {
    resetAllStores();
  });

  describe('AC2: Reset transitions (any → idle)', () => {
    it('resets from capturing to idle', () => {
      scanActions.startSingle('test-user');
      expect(getScanState().phase).toBe('capturing');
      scanActions.reset();
      expect(getStateOnly()).toEqual(initialScanState);
    });

    it('resets from scanning to idle', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('image');
      scanActions.processStart('normal', 1);
      expect(getScanState().phase).toBe('scanning');
      scanActions.reset();
      expect(getStateOnly()).toEqual(initialScanState);
    });

    it('resets from reviewing to idle', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('image');
      scanActions.processStart('normal', 1);
      scanActions.processSuccess([createMockTransaction()]);
      expect(getScanState().phase).toBe('reviewing');
      scanActions.reset();
      expect(getStateOnly()).toEqual(initialScanState);
    });

    it('resets from saving to idle', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('image');
      scanActions.processStart('normal', 1);
      scanActions.processSuccess([createMockTransaction()]);
      scanActions.saveStart();
      expect(getScanState().phase).toBe('saving');
      scanActions.reset();
      expect(getStateOnly()).toEqual(initialScanState);
    });

    it('resets from error to idle', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('image');
      scanActions.processStart('normal', 1);
      scanActions.processError('Error');
      expect(getScanState().phase).toBe('error');
      scanActions.reset();
      expect(getStateOnly()).toEqual(initialScanState);
    });
  });

  describe('AC2: Cancel transitions (non-saving → idle)', () => {
    it('cancels from capturing', () => {
      scanActions.startSingle('test-user');
      expect(getScanState().phase).toBe('capturing');
      scanActions.cancel();
      expect(getStateOnly()).toEqual(initialScanState);
    });

    it('cancels from reviewing', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('image');
      scanActions.processStart('normal', 1);
      scanActions.processSuccess([createMockTransaction()]);
      expect(getScanState().phase).toBe('reviewing');
      scanActions.cancel();
      expect(getStateOnly()).toEqual(initialScanState);
    });
  });

  describe('AC3: Invalid phase transition guards', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('startSingle blocked when phase !== idle', () => {
      scanActions.startSingle('user-1');
      const originalRequestId = getScanState().requestId;
      scanActions.startSingle('user-2');
      expect(getScanState().phase).toBe('capturing');
      expect(getScanState().userId).toBe('user-1');
      expect(getScanState().requestId).toBe(originalRequestId);
    });

    it('startBatch blocked when phase !== idle', () => {
      scanActions.startSingle('user-1');
      scanActions.startBatch('user-2');
      expect(getScanState().mode).toBe('single');
      expect(getScanState().userId).toBe('user-1');
    });

    it('addImage blocked when phase !== capturing', () => {
      scanActions.addImage('should-not-add');
      expect(getWorkflowState().images).toHaveLength(0);
    });

    it('processStart blocked when phase !== capturing', () => {
      scanActions.processStart('normal', 1);
      expect(getScanState().phase).toBe('idle');
    });

    it('processStart blocked when images.length === 0', () => {
      scanActions.startSingle('test-user');
      scanActions.processStart('normal', 1);
      expect(getScanState().phase).toBe('capturing');
    });

    it('processStart blocked when images.length === 0 in capturing phase', () => {
      scanActions.startSingle('test-user');
      expect(getScanState().phase).toBe('capturing');
      expect(getWorkflowState().images).toHaveLength(0);
      scanActions.processStart('normal', 1);
      expect(getScanState().phase).toBe('capturing');
      expect(getScanState().creditStatus).toBe('none');
    });


    it('processSuccess blocked when phase !== scanning', () => {
      scanActions.startSingle('test-user');
      scanActions.processSuccess([createMockTransaction()]);
      expect(getScanState().results).toHaveLength(0);
      expect(getScanState().phase).toBe('capturing');
    });

    it('batchComplete blocked when phase !== scanning', () => {
      scanActions.startBatch('test-user');
      scanActions.batchComplete();
      expect(getScanState().phase).toBe('capturing');
    });

    it('batchComplete blocked when mode !== batch', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('image');
      scanActions.processStart('normal', 1);
      scanActions.batchComplete();
      expect(getScanState().phase).toBe('scanning');
    });

    it('saveStart blocked when phase !== reviewing', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('image');
      scanActions.processStart('normal', 1);
      scanActions.saveStart();
      expect(getScanState().phase).toBe('scanning');
    });

    it('cancel blocked when phase === saving', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('image');
      scanActions.processStart('normal', 1);
      scanActions.processSuccess([createMockTransaction()]);
      scanActions.saveStart();
      expect(getScanState().phase).toBe('saving');
      scanActions.cancel();
      expect(getScanState().phase).toBe('saving');
    });

    it('structured guard violation logged on blocked transitions', () => {
      scanActions.startSingle('user-1');
      scanActions.startSingle('user-2');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[ScanStore:guard]',
        expect.stringContaining('"action":"startSingle"')
      );
      // Verify full structured payload includes current and expected phase
      const guardCall = consoleSpy.mock.calls.find(
        (c: unknown[]) => typeof c[1] === 'string' && c[1].includes('"action":"startSingle"')
      );
      expect(guardCall).toBeDefined();
      const payload = JSON.parse(guardCall![1] as string);
      expect(payload).toMatchObject({
        store: 'scan',
        action: 'startSingle',
        currentPhase: 'capturing',
        expectedPhase: 'idle',
      });
      expect(payload.timestamp).toBeGreaterThan(0);
    });
  });

  describe('AC4: Edge cases', () => {
    it('rapid consecutive startSingle calls - only first succeeds', () => {
      scanActions.startSingle('user-1');
      const firstRequestId = getScanState().requestId;
      const firstUserId = getScanState().userId;
      scanActions.startSingle('user-2');
      scanActions.startSingle('user-3');
      scanActions.startSingle('user-4');
      expect(getScanState().requestId).toBe(firstRequestId);
      expect(getScanState().userId).toBe(firstUserId);
    });

    it('reset during scanning phase clears all state', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('image');
      scanActions.processStart('normal', 1);
      expect(getScanState().phase).toBe('scanning');
      expect(getScanState().creditStatus).toBe('reserved');
      scanActions.reset();
      expect(getStateOnly()).toEqual(initialScanState);
      expect(getScanState().creditStatus).toBe('none');
    });

    it('reset during saving phase clears all state', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('image');
      scanActions.processStart('normal', 1);
      scanActions.processSuccess([createMockTransaction()]);
      scanActions.saveStart();
      expect(getScanState().phase).toBe('saving');
      scanActions.reset();
      expect(getStateOnly()).toEqual(initialScanState);
    });

    it('cancel during reviewing phase returns to idle', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('image');
      scanActions.processStart('normal', 1);
      scanActions.processSuccess([createMockTransaction()]);
      expect(getScanState().phase).toBe('reviewing');
      expect(getScanState().creditStatus).toBe('confirmed');
      scanActions.cancel();
      expect(getStateOnly()).toEqual(initialScanState);
    });

    it('multiple addImage calls in succession', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('image-1');
      scanActions.addImage('image-2');
      scanActions.addImage('image-3');
      expect(getWorkflowState().images).toHaveLength(3);
      expect(getWorkflowState().images).toEqual(['image-1', 'image-2', 'image-3']);
    });

    it('removeImage at invalid index does not crash', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('image-1');
      scanActions.removeImage(-1);
      scanActions.removeImage(5);
      scanActions.removeImage(100);
      expect(getWorkflowState().images).toHaveLength(1);
      expect(getWorkflowState().images[0]).toBe('image-1');
    });

    it('removeImage removes correct image by index', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('image-0');
      scanActions.addImage('image-1');
      scanActions.addImage('image-2');
      scanActions.removeImage(1);
      expect(getWorkflowState().images).toEqual(['image-0', 'image-2']);
    });
  });

  describe('AC-2: Pluggable guard logging sink', () => {
    it('uses custom sink when provided instead of console.warn', () => {
      const customSink = vi.fn();
      logGuardViolation(
        { action: 'testAction', currentPhase: 'idle', expectedPhase: 'capturing' },
        customSink,
      );
      expect(customSink).toHaveBeenCalledTimes(1);
      expect(customSink).toHaveBeenCalledWith(
        expect.objectContaining({
          store: 'scan',
          action: 'testAction',
          currentPhase: 'idle',
          expectedPhase: 'capturing',
        }),
      );
      expect(customSink.mock.calls[0][0].timestamp).toBeGreaterThan(0);
    });

    it('falls back to console.warn when no sink provided', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      logGuardViolation({ action: 'fallbackTest', currentPhase: 'idle', expectedPhase: 'capturing' });
      expect(consoleSpy).toHaveBeenCalledWith(
        '[ScanStore:guard]',
        expect.stringContaining('"action":"fallbackTest"'),
      );
      consoleSpy.mockRestore();
    });
  });
});
