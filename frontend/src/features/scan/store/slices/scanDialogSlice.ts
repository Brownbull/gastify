/**
 * Story 16-1: Dialog scan slice
 * Story 16-6: activeDialog mirrored to useScanWorkflowStore.
 *
 * Active dialog state management.
 * Dialogs can be shown from any phase.
 * Cross-store writes: mirrors activeDialog to shared workflow store.
 */

import type { StateCreator } from 'zustand';
import type { DialogState } from '../../types/scanStateMachine';
import type { ScanFullStoreInternal, ScanDialogSlice } from './types';
import { initialScanState } from './initialState';
import { logGuardViolation } from './guardLog';
import { useScanWorkflowStore } from '@shared/stores/useScanWorkflowStore';

// Shorthand for shared workflow store access
const wf = () => useScanWorkflowStore.getState();

export const createScanDialogSlice: StateCreator<
  ScanFullStoreInternal,
  [['zustand/devtools', never]],
  [],
  ScanDialogSlice
> = (set, get) => ({
  // State
  activeDialog: initialScanState.activeDialog,

  // Actions
  showDialog: (dialog: DialogState): boolean => {
    const current = get().activeDialog;
    if (current !== null) {
      logGuardViolation({
        action: 'showDialog',
        currentPhase: get().phase,
        expectedPhase: get().phase,
        detail: `blocked: '${dialog.type}' while '${current.type}' is active`,
      });
      return false;
    }
    set({ activeDialog: dialog }, undefined, 'scan/showDialog');
    wf().setActiveDialog(dialog);
    return true;
  },

  resolveDialog: (type, _result) => {
    const state = get();
    if (!state.activeDialog || state.activeDialog.type !== type) {
      logGuardViolation({
        action: 'resolveDialog',
        currentPhase: state.phase,
        expectedPhase: state.phase,
        detail: `dialog type mismatch: expected '${type}', active is '${state.activeDialog?.type ?? 'none'}'`,
      });
      return;
    }

    set({ activeDialog: null }, undefined, 'scan/resolveDialog');
    wf().setActiveDialog(null);
  },

  dismissDialog: () => {
    set({ activeDialog: null }, undefined, 'scan/dismissDialog');
    wf().setActiveDialog(null);
  },
});
