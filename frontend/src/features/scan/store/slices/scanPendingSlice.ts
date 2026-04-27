/**
 * Story 18-13b: Pending scan state slice
 *
 * Tracks the async scan pipeline state: scanId, deadline, status.
 * Used by usePendingScan hook (Firestore listener) and useScanLock hook (FAB lock).
 *
 * AC-ARCH-NO-4: MUST NOT exceed 300 lines.
 */

import type { StateCreator } from 'zustand';
import type { ScanFullStoreInternal, ScanPendingSlice } from './types';
import type { FirestoreScanStatus } from '@/types/pendingScan';
import { initialScanState } from './initialState';

export const createScanPendingSlice: StateCreator<
  ScanFullStoreInternal,
  [['zustand/devtools', never]],
  [],
  ScanPendingSlice
> = (set) => ({
  // State
  pendingScanId: initialScanState.pendingScanId,
  pendingScanDeadline: initialScanState.pendingScanDeadline,
  pendingScanStatus: initialScanState.pendingScanStatus,
  processedScanId: null,

  // Actions
  setPendingScan: (scanId: string, deadline: number) => {
    set({
      pendingScanId: scanId,
      pendingScanDeadline: deadline,
      pendingScanStatus: 'processing' as FirestoreScanStatus,
      processedScanId: null, // Clear on new scan
    }, undefined, 'scan/setPendingScan');
  },

  clearPendingScan: () => {
    set({
      pendingScanId: initialScanState.pendingScanId,
      pendingScanDeadline: initialScanState.pendingScanDeadline,
      pendingScanStatus: initialScanState.pendingScanStatus,
    }, undefined, 'scan/clearPendingScan');
  },

  setProcessedScanId: (scanId: string) => {
    set({ processedScanId: scanId }, undefined, 'scan/setProcessedScanId');
  },

  setPendingScanStatus: (status: FirestoreScanStatus) => {
    set({ pendingScanStatus: status }, undefined, 'scan/setPendingScanStatus');
  },
});
