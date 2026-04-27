/**
 * useScanStore — Core tests
 *
 * AC1: Test file structure, AC2: Forward phase transitions, AC6: DevTools, Result actions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  useScanStore,
  initialScanState,
  getScanState,
  scanActions,
} from '../index';
import { createMockTransaction, createMockBatchReceipts, getStateOnly, resetAllStores, getWorkflowState } from './helpers';

describe('useScanStore — Core', () => {
  beforeEach(() => {
    resetAllStores();
  });

  describe('AC1: Test file structure', () => {
    it('imports from store module correctly', () => {
      expect(useScanStore).toBeDefined();
      expect(initialScanState).toBeDefined();
      expect(getScanState).toBeDefined();
      expect(scanActions).toBeDefined();
    });

    it('store reset works between tests', () => {
      scanActions.startSingle('user-1');
      expect(getScanState().phase).toBe('capturing');
      useScanStore.setState(initialScanState);
      expect(getScanState().phase).toBe('idle');
    });

    it('has correct initial state', () => {
      expect(getStateOnly()).toEqual(initialScanState);
      expect(getScanState().phase).toBe('idle');
      expect(getScanState().mode).toBe('single');
      expect(getWorkflowState().images).toHaveLength(0);
      expect(getScanState().results).toHaveLength(0);
      expect(getScanState().creditStatus).toBe('none');
    });
  });

  describe('AC2: Valid forward phase transitions', () => {
    describe('idle → capturing', () => {
      it('transitions via startSingle', () => {
        expect(getScanState().phase).toBe('idle');
        scanActions.startSingle('test-user');
        expect(getScanState().phase).toBe('capturing');
        expect(getScanState().mode).toBe('single');
        expect(getScanState().userId).toBe('test-user');
        expect(getScanState().requestId).toMatch(/^req-\d+-[a-z0-9]+$/);
        expect(getScanState().startedAt).toBeGreaterThan(0);
      });

      it('transitions via startBatch with batchProgress', () => {
        expect(getScanState().phase).toBe('idle');
        scanActions.startBatch('test-user');
        expect(getScanState().phase).toBe('capturing');
        expect(getScanState().mode).toBe('batch');
        expect(getScanState().userId).toBe('test-user');
        expect(getWorkflowState().batchProgress).toEqual({
          current: 0, total: 0, completed: [], failed: [],
        });
      });

      it('transitions via startStatement', () => {
        expect(getScanState().phase).toBe('idle');
        scanActions.startStatement('test-user');
        expect(getScanState().phase).toBe('capturing');
        expect(getScanState().mode).toBe('statement');
        expect(getScanState().userId).toBe('test-user');
      });
    });

    describe('capturing → scanning', () => {
      it('transitions via processStart', () => {
        scanActions.startSingle('test-user');
        scanActions.addImage('base64-image-data');
        expect(getScanState().phase).toBe('capturing');
        scanActions.processStart('normal', 1);
        expect(getScanState().phase).toBe('scanning');
        expect(getScanState().creditStatus).toBe('reserved');
        expect(getScanState().creditType).toBe('normal');
        expect(getScanState().creditsCount).toBe(1);
      });
    });

    describe('scanning → reviewing', () => {
      it('transitions via processSuccess', () => {
        scanActions.startSingle('test-user');
        scanActions.addImage('base64-image-data');
        scanActions.processStart('normal', 1);
        expect(getScanState().phase).toBe('scanning');
        const mockTx = createMockTransaction();
        scanActions.processSuccess([mockTx]);
        expect(getScanState().phase).toBe('reviewing');
        expect(getScanState().creditStatus).toBe('confirmed');
        expect(getScanState().results).toHaveLength(1);
        expect(getScanState().results[0]).toEqual(mockTx);
        expect(getScanState().activeResultIndex).toBe(0);
      });

      it('transitions via batchComplete for batch mode', () => {
        scanActions.startBatch('test-user');
        scanActions.addImage('image-1');
        scanActions.addImage('image-2');
        scanActions.processStart('super', 2);
        expect(getScanState().phase).toBe('scanning');
        const tx1 = createMockTransaction({ id: 'tx-1' });
        const tx2 = createMockTransaction({ id: 'tx-2' });
        scanActions.batchItemSuccess(0, tx1);
        scanActions.batchItemSuccess(1, tx2);
        const mockReceipts = createMockBatchReceipts(2);
        scanActions.batchComplete(mockReceipts);
        expect(getScanState().phase).toBe('reviewing');
        expect(getScanState().creditStatus).toBe('confirmed');
        expect(getWorkflowState().batchReceipts).toEqual(mockReceipts);
      });
    });

    describe('scanning → error', () => {
      it('transitions via processError', () => {
        scanActions.startSingle('test-user');
        scanActions.addImage('base64-image-data');
        scanActions.processStart('normal', 1);
        expect(getScanState().phase).toBe('scanning');
        scanActions.processError('Network error');
        expect(getScanState().phase).toBe('error');
        expect(getScanState().error).toBe('Network error');
        expect(getScanState().creditStatus).toBe('refunded');
      });
    });

    describe('reviewing → saving → idle/reviewing', () => {
      it('transitions via saveStart', () => {
        scanActions.startSingle('test-user');
        scanActions.addImage('base64-image-data');
        scanActions.processStart('normal', 1);
        scanActions.processSuccess([createMockTransaction()]);
        expect(getScanState().phase).toBe('reviewing');
        scanActions.saveStart();
        expect(getScanState().phase).toBe('saving');
      });

      it('transitions via saveSuccess', () => {
        scanActions.startSingle('test-user');
        scanActions.addImage('base64-image-data');
        scanActions.processStart('normal', 1);
        scanActions.processSuccess([createMockTransaction()]);
        scanActions.saveStart();
        expect(getScanState().phase).toBe('saving');
        scanActions.saveSuccess();
        expect(getScanState().phase).toBe('idle');
        expect(getStateOnly()).toEqual(initialScanState);
      });

      it('transitions via saveError', () => {
        scanActions.startSingle('test-user');
        scanActions.addImage('base64-image-data');
        scanActions.processStart('normal', 1);
        const mockTx = createMockTransaction();
        scanActions.processSuccess([mockTx]);
        scanActions.saveStart();
        expect(getScanState().phase).toBe('saving');
        scanActions.saveError('Save failed');
        expect(getScanState().phase).toBe('reviewing');
        expect(getScanState().error).toBe('Save failed');
        expect(getScanState().results).toHaveLength(1);
      });
    });
  });

  describe('Cross-store write mirroring (Story 16-6)', () => {
    it('startSingle mirrors phase and mode to workflow store', () => {
      scanActions.startSingle('test-user');
      expect(getWorkflowState().phase).toBe('capturing');
      expect(getWorkflowState().mode).toBe('single');
    });

    it('startBatch mirrors phase, mode, and batchProgress to workflow store', () => {
      scanActions.startBatch('test-user');
      expect(getWorkflowState().phase).toBe('capturing');
      expect(getWorkflowState().mode).toBe('batch');
      expect(getWorkflowState().batchProgress).toEqual({
        current: 0, total: 0, completed: [], failed: [],
      });
    });

    it('startStatement mirrors phase and mode to workflow store', () => {
      scanActions.startStatement('test-user');
      expect(getWorkflowState().phase).toBe('capturing');
      expect(getWorkflowState().mode).toBe('statement');
    });

    it('processStart mirrors phase to workflow store', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('img');
      scanActions.processStart('normal', 1);
      expect(getWorkflowState().phase).toBe('scanning');
    });

    it('processSuccess mirrors phase to workflow store', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('img');
      scanActions.processStart('normal', 1);
      scanActions.processSuccess([createMockTransaction()]);
      expect(getWorkflowState().phase).toBe('reviewing');
    });

    it('processError mirrors phase to workflow store', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('img');
      scanActions.processStart('normal', 1);
      scanActions.processError('fail');
      expect(getWorkflowState().phase).toBe('error');
    });

    it('saveStart mirrors phase to workflow store', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('img');
      scanActions.processStart('normal', 1);
      scanActions.processSuccess([createMockTransaction()]);
      scanActions.saveStart();
      expect(getWorkflowState().phase).toBe('saving');
    });

    it('saveSuccess resets workflow store', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('img');
      scanActions.processStart('normal', 1);
      scanActions.processSuccess([createMockTransaction()]);
      scanActions.saveStart();
      scanActions.saveSuccess();
      expect(getWorkflowState().phase).toBe('idle');
      expect(getWorkflowState().mode).toBe('single');
      expect(getWorkflowState().images).toHaveLength(0);
    });

    it('saveError mirrors phase to workflow store', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('img');
      scanActions.processStart('normal', 1);
      scanActions.processSuccess([createMockTransaction()]);
      scanActions.saveStart();
      scanActions.saveError('Save failed');
      expect(getWorkflowState().phase).toBe('reviewing');
    });

    it('cancel resets workflow store', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('img');
      scanActions.cancel();
      expect(getWorkflowState().phase).toBe('idle');
      expect(getWorkflowState().images).toHaveLength(0);
    });

    it('reset resets workflow store', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('img');
      scanActions.reset();
      expect(getWorkflowState().phase).toBe('idle');
      expect(getWorkflowState().images).toHaveLength(0);
    });

    it('addImage writes to workflow store', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('img-1');
      scanActions.addImage('img-2');
      expect(getWorkflowState().images).toEqual(['img-1', 'img-2']);
    });

    it('removeImage writes to workflow store', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('img-1');
      scanActions.addImage('img-2');
      scanActions.removeImage(0);
      expect(getWorkflowState().images).toEqual(['img-2']);
    });
  });

  describe('restoreState workflow forwarding (Story 16-6)', () => {
    it('forwards images to workflow store', () => {
      scanActions.restoreState({ phase: 'capturing', images: ['restored-img'] });
      expect(getWorkflowState().images).toEqual(['restored-img']);
    });

    it('forwards batchProgress to workflow store', () => {
      const bp = { current: 1, total: 3, completed: [createMockTransaction()], failed: [] };
      scanActions.restoreState({ phase: 'reviewing', batchProgress: bp });
      expect(getWorkflowState().batchProgress).toEqual(bp);
    });

    it('forwards batchReceipts to workflow store', () => {
      const receipts = createMockBatchReceipts(2);
      scanActions.restoreState({ phase: 'reviewing', batchReceipts: receipts });
      expect(getWorkflowState().batchReceipts).toEqual(receipts);
    });

    it('forwards batchEditingIndex to workflow store', () => {
      scanActions.restoreState({ phase: 'reviewing', batchEditingIndex: 2 });
      expect(getWorkflowState().batchEditingIndex).toBe(2);
    });

    it('mirrors phase and mode to workflow store', () => {
      scanActions.restoreState({ phase: 'capturing', mode: 'batch' });
      expect(getWorkflowState().phase).toBe('capturing');
      expect(getWorkflowState().mode).toBe('batch');
    });

    it('rejects oversized images array (corruption guard)', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const hugeImages = Array.from({ length: 101 }, (_, i) => `img-${i}`);
      scanActions.restoreState({ phase: 'capturing', images: hugeImages });
      expect(getWorkflowState().images).toEqual([]);
      consoleSpy.mockRestore();
    });
  });

  describe('AC6: DevTools action names', () => {
    it('actions produce correct action names', () => {
      scanActions.startSingle('test-user');
      expect(getScanState().phase).toBe('capturing');
      scanActions.addImage('image');
      expect(getWorkflowState().images).toHaveLength(1);
      scanActions.processStart('normal', 1);
      expect(getScanState().phase).toBe('scanning');
      scanActions.processSuccess([createMockTransaction()]);
      expect(getScanState().phase).toBe('reviewing');
    });

    it('store name is set for DevTools', () => {
      expect(useScanStore).toBeDefined();
      expect(typeof useScanStore.getState).toBe('function');
      expect(typeof useScanStore.setState).toBe('function');
    });
  });

  describe('Error recovery flows (Story 16-3)', () => {
    it('scan fail -> reset -> store is idle (phase, overlay, images all reset)', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('base64-image-data');
      scanActions.processStart('normal', 1);
      scanActions.processError('Network error');
      expect(getScanState().phase).toBe('error');
      expect(getScanState().error).toBe('Network error');

      scanActions.reset();

      expect(getScanState().phase).toBe('idle');
      expect(getScanState().error).toBeNull();
      expect(getWorkflowState().images).toHaveLength(0);
      expect(getScanState().overlayState).toBe('idle');
      expect(getScanState().overlayError).toBeNull();
    });

    it('scan fail -> reset -> gallery select -> image accepted', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('base64-image-data');
      scanActions.processStart('normal', 1);
      scanActions.processError('Network error');
      expect(getScanState().phase).toBe('error');

      scanActions.reset();
      expect(getScanState().phase).toBe('idle');

      scanActions.startSingle('test-user');
      expect(getScanState().phase).toBe('capturing');
      scanActions.addImage('gallery-image-data');
      expect(getWorkflowState().images).toHaveLength(1);
      expect(getWorkflowState().images[0]).toBe('gallery-image-data');
    });

    it('scan fail -> reset -> retry scan succeeds', () => {
      scanActions.startSingle('test-user');
      scanActions.addImage('base64-image-data');
      scanActions.processStart('normal', 1);
      scanActions.processError('Network error');
      expect(getScanState().phase).toBe('error');

      scanActions.reset();
      expect(getScanState().phase).toBe('idle');

      scanActions.startSingle('test-user');
      scanActions.addImage('retry-image');
      scanActions.processStart('normal', 1);
      const mockTx = createMockTransaction({ id: 'retry-tx' });
      scanActions.processSuccess([mockTx]);
      expect(getScanState().phase).toBe('reviewing');
      expect(getScanState().results).toHaveLength(1);
      expect(getScanState().results[0].id).toBe('retry-tx');
    });
  });

  describe('Result actions', () => {
    beforeEach(() => {
      scanActions.startSingle('test-user');
      scanActions.addImage('image');
      scanActions.processStart('normal', 1);
      scanActions.processSuccess([createMockTransaction()]);
    });

    it('updateResult updates result at index', () => {
      expect(getScanState().results[0].merchant).toBe('Test Merchant');
      scanActions.updateResult(0, { merchant: 'Updated Merchant' });
      expect(getScanState().results[0].merchant).toBe('Updated Merchant');
    });

    it('updateResult does NOT update invalid index', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      scanActions.updateResult(99, { merchant: 'Updated' });
      expect(getScanState().results[0].merchant).toBe('Test Merchant');
      consoleSpy.mockRestore();
    });

    it('setActiveResult sets active result index', () => {
      scanActions.reset();
      scanActions.startSingle('test-user');
      scanActions.addImage('image');
      scanActions.processStart('normal', 1);
      scanActions.processSuccess([
        createMockTransaction({ id: 'tx-1' }),
        createMockTransaction({ id: 'tx-2' }),
      ]);
      expect(getScanState().activeResultIndex).toBe(0);
      scanActions.setActiveResult(1);
      expect(getScanState().activeResultIndex).toBe(1);
    });
  });
});
