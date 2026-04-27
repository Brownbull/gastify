/**
 * Story 16-1: Composed Scan Store
 *
 * Zustand store composed from 5 focused slices:
 * - Core: phase machine, images, process, save, result, control
 * - Batch: batch progress, receipts, editing
 * - Credit: credit status, type, count
 * - Dialog: active dialog management
 * - UI: skip modal, rescan flags
 *
 * Architecture Reference:
 * - docs/sprint-artifacts/epic14d/scan-request-lifecycle.md
 * - docs/sprint-artifacts/epic14e-feature-architecture/architecture-decision.md (ADR-018)
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { UseBoundStore, StoreApi } from 'zustand';
import type { ScanFullStoreInternal, ScanFullStore } from './slices/types';
import { createScanCoreSlice } from './slices/scanCoreSlice';
import { createScanBatchSlice } from './slices/scanBatchSlice';
import { createScanCreditSlice } from './slices/scanCreditSlice';
import { createScanDialogSlice } from './slices/scanDialogSlice';
import { createScanUISlice } from './slices/scanUISlice';
import { createScanPendingSlice } from './slices/scanPendingSlice';

export { initialScanState } from './slices/initialState';

// Store uses ScanFullStoreInternal internally (_guardPhase needed by core slice).
// Cast to ScanFullStore so consumers cannot access _guardPhase via getState().
const _useScanStore = create<ScanFullStoreInternal>()(
  devtools(
    (...args) => ({
      ...createScanCoreSlice(...args),
      ...createScanBatchSlice(...args),
      ...createScanCreditSlice(...args),
      ...createScanDialogSlice(...args),
      ...createScanUISlice(...args),
      ...createScanPendingSlice(...args),
    }),
    {
      name: 'scan-store',
      enabled: import.meta.env.DEV,
    }
  )
);

export const useScanStore = _useScanStore as unknown as UseBoundStore<StoreApi<ScanFullStore>>;
