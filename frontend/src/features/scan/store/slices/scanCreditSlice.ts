/**
 * Story 16-1: Credit scan slice
 *
 * Credit status, type, and count tracking.
 * Note: credit state is primarily SET by core slice actions (processStart/Success/Error).
 * This slice owns the state and the refundCredit action.
 */

import type { StateCreator } from 'zustand';
import type { ScanFullStoreInternal, ScanCreditSlice } from './types';
import { initialScanState } from './initialState';

export const createScanCreditSlice: StateCreator<
  ScanFullStoreInternal,
  [['zustand/devtools', never]],
  [],
  ScanCreditSlice
> = (set, get) => ({
  // State
  creditStatus: initialScanState.creditStatus,
  creditType: initialScanState.creditType,
  creditsCount: initialScanState.creditsCount,

  // Actions
  refundCredit: () => {
    const state = get();
    if (state.creditStatus !== 'reserved') return;

    set({ creditStatus: 'refunded' }, undefined, 'scan/refundCredit');
  },
});
