/**
 * Story 16-1: UI scan slice
 * Story 16-2: Overlay state merged from useScanOverlayState
 *
 * UI-specific flags: skip scan complete modal, rescan state.
 * Overlay state: progress, ETA, error, processing history ring buffer.
 */

import type { StateCreator } from 'zustand';
import type { ScanFullStoreInternal, ScanUISlice, ScanErrorType } from './types';
import { initialScanState } from './initialState';

/** Default estimated processing time in seconds (when no history) */
const DEFAULT_ESTIMATED_TIME = 4;

/** Maximum number of processing times to keep in history */
const MAX_HISTORY_SIZE = 10;

/** Number of recent times to use for average calculation */
const RECENT_TIMES_COUNT = 5;

function calculateEstimatedTime(history: number[]): number {
  if (history.length === 0) {
    return DEFAULT_ESTIMATED_TIME;
  }
  const recentTimes = history.slice(-RECENT_TIMES_COUNT);
  const sum = recentTimes.reduce((acc, time) => acc + time, 0);
  return Math.round(sum / recentTimes.length);
}

export const createScanUISlice: StateCreator<
  ScanFullStoreInternal,
  [['zustand/devtools', never]],
  [],
  ScanUISlice
> = (set, get) => ({
  // State
  skipScanCompleteModal: initialScanState.skipScanCompleteModal,
  isRescanning: initialScanState.isRescanning,

  // Overlay state (Story 16-2)
  overlayState: initialScanState.overlayState,
  overlayProgress: initialScanState.overlayProgress,
  overlayEta: initialScanState.overlayEta,
  overlayError: initialScanState.overlayError,
  processingHistory: initialScanState.processingHistory,
  processingStartedAt: initialScanState.processingStartedAt,

  // Actions
  setSkipScanCompleteModal: (value: boolean) => {
    set({ skipScanCompleteModal: value }, undefined, 'scan/setSkipScanCompleteModal');
  },

  setIsRescanning: (value: boolean) => {
    set({ isRescanning: value }, undefined, 'scan/setIsRescanning');
  },

  // Overlay actions (Story 16-2)

  startOverlayUpload: () => {
    set({
      overlayState: 'uploading',
      overlayProgress: 0,
      overlayError: null,
      overlayEta: null,
    }, undefined, 'scan/startOverlayUpload');
  },

  setOverlayProgress: (pct: number) => {
    const clamped = Math.min(100, Math.max(0, pct));
    set({ overlayProgress: clamped }, undefined, 'scan/setOverlayProgress');
  },

  startOverlayProcessing: () => {
    const eta = calculateEstimatedTime(get().processingHistory);
    set({
      overlayState: 'processing',
      overlayProgress: 100,
      processingStartedAt: Date.now(),
      overlayEta: eta,
    }, undefined, 'scan/startOverlayProcessing');
  },

  setOverlayReady: () => {
    const { processingStartedAt, processingHistory } = get();
    let newHistory = processingHistory;
    if (processingStartedAt !== null) {
      const processingTime = Math.round((Date.now() - processingStartedAt) / 1000);
      newHistory = [...processingHistory, processingTime].slice(-MAX_HISTORY_SIZE);
    }
    set({
      overlayState: 'ready',
      overlayEta: null,
      processingStartedAt: null,
      processingHistory: newHistory,
    }, undefined, 'scan/setOverlayReady');
  },

  setOverlayError: (type: ScanErrorType, message: string) => {
    set({
      overlayState: 'error',
      overlayError: { type, message },
      overlayEta: null,
      processingStartedAt: null,
    }, undefined, 'scan/setOverlayError');
  },

  resetOverlay: () => {
    set({
      overlayState: initialScanState.overlayState,
      overlayProgress: initialScanState.overlayProgress,
      overlayEta: initialScanState.overlayEta,
      overlayError: initialScanState.overlayError,
      processingStartedAt: initialScanState.processingStartedAt,
      // Preserve processingHistory across resets (session-scoped ETA data)
    }, undefined, 'scan/resetOverlay');
  },

  retryOverlay: () => {
    set({
      overlayState: 'idle',
      overlayProgress: 0,
      overlayError: null,
      overlayEta: null,
    }, undefined, 'scan/retryOverlay');
  },

  pushProcessingTime: (seconds: number) => {
    const newHistory = [...get().processingHistory, seconds].slice(-MAX_HISTORY_SIZE);
    set({ processingHistory: newHistory }, undefined, 'scan/pushProcessingTime');
  },
});
