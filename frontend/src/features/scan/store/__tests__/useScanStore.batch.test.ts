/**
 * useScanStore — Batch tests
 *
 * Batch actions and image actions in batch mode.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getScanState, scanActions } from '../index';
import { createMockTransaction, createMockBatchReceipts, resetAllStores, getWorkflowState } from './helpers';

describe('useScanStore — Batch', () => {
  beforeEach(() => {
    resetAllStores();
  });

  describe('Batch actions', () => {
    beforeEach(() => {
      scanActions.startBatch('test-user');
      scanActions.addImage('image-1');
      scanActions.addImage('image-2');
      scanActions.processStart('super', 2);
    });

    it('batchItemStart updates current index', () => {
      scanActions.batchItemStart(1);
      expect(getWorkflowState().batchProgress?.current).toBe(1);
    });

    it('batchItemSuccess adds to completed', () => {
      const mockTx = createMockTransaction();
      scanActions.batchItemSuccess(0, mockTx);
      expect(getWorkflowState().batchProgress?.completed).toContain(mockTx);
    });

    it('batchItemError adds to failed', () => {
      scanActions.batchItemError(1, 'Processing failed');
      expect(getWorkflowState().batchProgress?.failed).toContainEqual({
        index: 1,
        error: 'Processing failed',
      });
    });

    it('setBatchReceipts sets receipts in batch reviewing phase', () => {
      scanActions.batchItemSuccess(0, createMockTransaction({ id: 'tx-1' }));
      scanActions.batchComplete();
      expect(getScanState().phase).toBe('reviewing');
      const receipts = createMockBatchReceipts(2);
      scanActions.setBatchReceipts(receipts);
      expect(getWorkflowState().batchReceipts).toEqual(receipts);
    });

    it('updateBatchReceipt updates specific receipt', () => {
      scanActions.batchItemSuccess(0, createMockTransaction({ id: 'tx-1' }));
      const receipts = createMockBatchReceipts(2);
      scanActions.batchComplete(receipts);
      scanActions.updateBatchReceipt('receipt-0', { status: 'edited' });
      expect(getWorkflowState().batchReceipts?.find((r) => r.id === 'receipt-0')?.status).toBe(
        'edited'
      );
    });

    it('discardBatchReceipt removes receipt by id', () => {
      scanActions.batchItemSuccess(0, createMockTransaction({ id: 'tx-1' }));
      const receipts = createMockBatchReceipts(3);
      scanActions.batchComplete(receipts);
      expect(getWorkflowState().batchReceipts).toHaveLength(3);
      scanActions.discardBatchReceipt('receipt-1');
      expect(getWorkflowState().batchReceipts).toHaveLength(2);
      expect(getWorkflowState().batchReceipts?.find((r) => r.id === 'receipt-1')).toBeUndefined();
    });

    it('clearBatchReceipts sets batchReceipts to null', () => {
      scanActions.batchItemSuccess(0, createMockTransaction({ id: 'tx-1' }));
      const receipts = createMockBatchReceipts(2);
      scanActions.batchComplete(receipts);
      expect(getWorkflowState().batchReceipts).not.toBeNull();
      scanActions.clearBatchReceipts();
      expect(getWorkflowState().batchReceipts).toBeNull();
    });

    it('setBatchEditingIndex sets editing index in batch reviewing', () => {
      const receipts = createMockBatchReceipts(3);
      scanActions.batchItemSuccess(0, createMockTransaction({ id: 'tx-1' }));
      scanActions.batchComplete(receipts);
      scanActions.setBatchEditingIndex(1);
      expect(getWorkflowState().batchEditingIndex).toBe(1);
    });

    it('setBatchEditingIndex null is always allowed', () => {
      scanActions.reset();
      scanActions.setBatchEditingIndex(null);
      expect(getWorkflowState().batchEditingIndex).toBeNull();
    });
  });

  describe('Image actions in batch mode', () => {
    beforeEach(() => {
      scanActions.startBatch('test-user');
    });

    it('addImage updates batchProgress.total in batch mode', () => {
      scanActions.addImage('image-1');
      expect(getWorkflowState().batchProgress?.total).toBe(1);
      scanActions.addImage('image-2');
      expect(getWorkflowState().batchProgress?.total).toBe(2);
      scanActions.addImage('image-3');
      expect(getWorkflowState().batchProgress?.total).toBe(3);
    });

    it('removeImage updates batchProgress.total in batch mode', () => {
      scanActions.addImage('image-1');
      scanActions.addImage('image-2');
      scanActions.addImage('image-3');
      expect(getWorkflowState().batchProgress?.total).toBe(3);
      scanActions.removeImage(1);
      expect(getWorkflowState().batchProgress?.total).toBe(2);
      expect(getWorkflowState().images).toEqual(['image-1', 'image-3']);
    });

    it('setImages updates batchProgress.total in batch mode', () => {
      scanActions.setImages(['img-1', 'img-2', 'img-3', 'img-4']);
      expect(getWorkflowState().images).toHaveLength(4);
      expect(getWorkflowState().batchProgress?.total).toBe(4);
    });
  });
});
