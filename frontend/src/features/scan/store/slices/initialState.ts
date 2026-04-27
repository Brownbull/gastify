/**
 * Story 16-1: Shared initial state for all scan store slices
 * Story 16-6: images, batchProgress, batchReceipts, batchEditingIndex moved to useScanWorkflowStore
 *
 * Single source of truth for initial/reset state.
 * Used by each slice for default values and by reset/cancel actions.
 */

import type { ScanState } from '../../types/scanStateMachine';
import type { ScanFullStore, ScanOverlayState, ScanErrorType, ScanPendingSlice } from './types';

// Fields moved to useScanWorkflowStore (Story 16-6)
type WorkflowFields = 'images' | 'batchProgress' | 'batchReceipts' | 'batchEditingIndex';
type ScanStoreState = Omit<ScanState, WorkflowFields>;

interface ScanUIState {
  skipScanCompleteModal: boolean;
  isRescanning: boolean;
  // Overlay state (Story 16-2)
  overlayState: ScanOverlayState;
  overlayProgress: number;
  overlayEta: number | null;
  overlayError: { type: ScanErrorType; message: string } | null;
  processingHistory: number[];
  processingStartedAt: number | null;
}

export const initialScanState: ScanStoreState & ScanUIState & Omit<ScanPendingSlice, 'setPendingScan' | 'clearPendingScan' | 'setPendingScanStatus' | 'setProcessedScanId'> = {
  // Core state
  phase: 'idle',
  mode: 'single',

  // Request identity
  requestId: null,
  userId: null,
  startedAt: null,

  // Image data: moved to useScanWorkflowStore (Story 16-6)

  // Results
  results: [],
  activeResultIndex: 0,

  // Credit tracking
  creditStatus: 'none',
  creditType: null,
  creditsCount: 0,

  // Dialog state
  activeDialog: null,

  // Error state
  error: null,

  // Batch mode: moved to useScanWorkflowStore (Story 16-6)

  // Pre-scan options
  storeType: null,
  currency: null,

  // UI flags
  skipScanCompleteModal: false,
  isRescanning: false,

  // Overlay state (Story 16-2)
  overlayState: 'idle',
  overlayProgress: 0,
  overlayEta: null,
  overlayError: null,
  processingHistory: [],
  processingStartedAt: null,

  // Pending scan state (Story 18-13b)
  pendingScanId: null,
  pendingScanDeadline: null,
  pendingScanStatus: null,
  processedScanId: null,
};

// Compile-time check: ensure initialScanState covers all state keys.
// If a new slice adds state without updating initialState, this will error.
// Auto-derived: extracts non-function keys from ScanFullStore via mapped type.
type _StateKeys = {
  [K in keyof ScanFullStore]: ScanFullStore[K] extends (...args: never[]) => unknown ? never : K;
}[keyof ScanFullStore];
void (initialScanState satisfies Record<NonNullable<_StateKeys>, unknown>);
