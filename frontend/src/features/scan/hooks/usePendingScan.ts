/**
 * Story 18-13b: Pending scan Firestore listener hook
 *
 * Subscribes to a pending_scans document via onSnapshot.
 * Handles status transitions: processing → completed/failed.
 * On completed: feeds result into processScan pipeline at Step 5.
 * On failed/expired: shows error overlay.
 *
 * AC-ARCH-PATTERN-2: All hook calls before early returns.
 * AC-ARCH-PATTERN-4: onSnapshot unsubscribed in useEffect cleanup.
 */

import { useEffect, useRef, useCallback } from 'react';
import { doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { FirestorePendingScan, FirestoreScanResult } from '@/types/pendingScan';
import { scanActions, useScanStore } from '../store';
import type { ScanResult } from '../handlers/processScan/types';

/** Props for the usePendingScan hook */
export interface UsePendingScanProps {
  /** Active pending scan ID (null = no subscription) */
  scanId: string | null;
  /** Firebase Auth user ID */
  userId: string;
  /** Callback to invoke processScan with the async result */
  onCompleted: (result: ScanResult, imageUrls: string[]) => void;
  /** Translation function */
  t: (key: string) => string;
}

/** Return value for the usePendingScan hook */
export interface UsePendingScanReturn {
  /** Cancel the pending scan (deletes Firestore doc) */
  cancelPendingScan: () => Promise<void>;
  /** Retry a failed scan (creates new scan) */
  retryPendingScan: () => void;
}

/**
 * Map FirestoreScanResult to the ScanResult shape expected by processScan.
 */
function mapToScanResult(result: FirestoreScanResult): ScanResult {
  return {
    merchant: result.merchant,
    date: result.date,
    total: result.total,
    category: result.category,
    items: result.items.map((item) => ({
      name: item.name,
      totalPrice: item.totalPrice,
      unitPrice: item.unitPrice,
      qty: item.qty,
      category: item.category,
      subcategory: item.subcategory,
    })),
    imageUrls: result.imageUrls,
    thumbnailUrl: result.thumbnailUrl,
    currency: result.currency,
    country: result.country,
    city: result.city,
    receiptType: result.receiptType,
    promptVersion: result.promptVersion,
    merchantSource: result.merchantSource,
  };
}

export function usePendingScan(props: UsePendingScanProps): UsePendingScanReturn {
  const { scanId, userId, onCompleted, t } = props;

  // Track whether we've already processed a completed result to avoid double-processing
  const processedRef = useRef<string | null>(null);

  // --------------------------------------------------
  // onSnapshot listener (AC-ARCH-PATTERN-4: cleanup)
  // --------------------------------------------------
  useEffect(() => {
    if (!scanId || !userId) return;

    // Validate scanId format to prevent Firestore path traversal (no slashes or special chars)
    if (!/^[a-zA-Z0-9_-]+$/.test(scanId)) return;

    const docRef = doc(db, 'pending_scans', scanId);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (!snapshot.exists()) {
        // Doc deleted (canceled or cleaned up) — clear state
        scanActions.clearPendingScan();
        return;
      }

      const data = snapshot.data() as FirestorePendingScan;

      // Verify ownership
      if (data.userId !== userId) return;

      scanActions.setPendingScanStatus(data.status);

      if (data.status === 'completed' && data.result) {
        // Guard against double-processing: component-scoped ref + store-scoped field
        if (processedRef.current === scanId) return;
        const storeState = useScanStore.getState();
        if (storeState.processedScanId === scanId) return;
        processedRef.current = scanId;
        scanActions.setProcessedScanId(scanId);

        // Verify credit was deducted server-side before processing result
        if (!data.creditDeducted) {
          scanActions.setOverlayError('api', t('scanError'));
          return;
        }

        const scanResult = mapToScanResult(data.result);
        scanActions.clearPendingScan();
        onCompleted(scanResult, data.imageUrls);
      }

      if (data.status === 'failed') {
        const errorMessage = data.error || t('scanError');
        scanActions.setOverlayError('api', errorMessage);
      }

      // Check deadline for processing scans
      if (data.status === 'processing' && data.processingDeadline) {
        const deadlineMs = data.processingDeadline.toMillis();
        if (Date.now() > deadlineMs) {
          scanActions.setOverlayError('timeout', t('scanTimeout'));
        }
      }
    }, (error) => {
      const msg = error instanceof Error ? error.message : t('scanError');
      scanActions.setOverlayError('api', msg);
    });

    return () => {
      unsubscribe();
    };
  }, [scanId, userId, onCompleted, t]);

  // --------------------------------------------------
  // Cancel resolution
  // --------------------------------------------------
  const cancelPendingScan = useCallback(async () => {
    if (!scanId) return;

    try {
      const docRef = doc(db, 'pending_scans', scanId);
      // Use runTransaction for multi-device safety (AC-22)
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(docRef);
        if (!snap.exists()) return; // Already resolved elsewhere
        // Verify ownership before deletion
        if (snap.data()?.userId !== userId) return;
        transaction.delete(docRef);
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'cancel failed';
      console.error('Failed to cancel pending scan:', msg);
    } finally {
      scanActions.clearPendingScan();
      scanActions.resetOverlay();
      processedRef.current = null;
    }
  }, [scanId, userId]);

  // --------------------------------------------------
  // Retry (signals parent to re-initiate; does not manage scan flow itself)
  // --------------------------------------------------
  const retryPendingScan = useCallback(() => {
    // Clear the failed state; the parent component handles re-initiating
    scanActions.clearPendingScan();
    scanActions.resetOverlay();
    processedRef.current = null;
  }, []);

  return { cancelPendingScan, retryPendingScan };
}
