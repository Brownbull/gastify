/**
 * Story 14e-6c: Scan Zustand Store Selectors
 *
 * Memoized selector hooks for efficient state subscription.
 * Components only re-render when their specific subscribed values change.
 *
 * Architecture Reference:
 * - Zustand shallow comparison for object selectors
 * - Atlas pattern: Individual selectors for granular subscriptions
 *
 * Categories:
 * - Phase/Mode: useScanPhase, useScanMode
 * - Boolean: useHasActiveRequest, useIsProcessing, useIsIdle, useHasError, useHasDialog, useIsBlocking, useCreditSpent
 * - Complex: useCanNavigateFreely, useCanSave, useCurrentView
 * - Count: useImageCount, useResultCount
 * - Actions: useScanActions, getScanState, scanActions
 */

import { useShallow } from 'zustand/react/shallow';
import { useScanStore } from './useScanStore';
import { useScanWorkflowStore } from '@shared/stores/useScanWorkflowStore';
import { canSaveTransaction } from '../types/scanStateMachine';
import type {
  ScanCurrentView,
  ScanDialogType,
  DialogState,
  CreditType,
  ScanState,
} from '../types/scanStateMachine';
import type { Transaction } from '@/types/transaction';
import type { BatchReceipt } from '@/types/batchReceipt';
import type { ScanDialogResultMap, ScanErrorType } from './slices/types';
import type { FirestoreScanStatus } from '@/types/pendingScan';

// =============================================================================
// Phase & Mode Selectors (AC1)
// =============================================================================

/**
 * Select current scan phase.
 * Re-renders only when phase changes.
 */
export const useScanPhase = () => useScanStore((s) => s.phase);

/**
 * Select current scan mode (single/batch/statement).
 * Story 16-6: Reads from shared workflow store (canonical source for consumers).
 */
export const useScanMode = () => useScanWorkflowStore((s) => s.mode);

// =============================================================================
// Boolean Computed Selectors (AC2)
// =============================================================================

/**
 * True if state machine is not idle (blocks new requests per precedence rule).
 * Re-renders only when idle status changes.
 */
export const useHasActiveRequest = () => useScanStore((s) => s.phase !== 'idle');

/**
 * True if currently in a phase that should show processing UI.
 * Re-renders only when processing status changes.
 */
export const useIsProcessing = () =>
  useScanStore((s) => s.phase === 'scanning' || s.phase === 'saving');

/**
 * True if in idle phase.
 * Re-renders only when idle status changes.
 */
export const useIsIdle = () => useScanStore((s) => s.phase === 'idle');

/**
 * True if an error occurred.
 * Re-renders only when error status changes.
 */
export const useHasError = () => useScanStore((s) => s.phase === 'error');

/**
 * True if there's an active dialog.
 * Re-renders only when dialog presence changes.
 */
export const useHasDialog = () => useScanStore((s) => s.activeDialog !== null);

/**
 * Get the active dialog state (type and data).
 * Used by components that need to read dialog data (e.g., ScanCompleteModal).
 * Story 14e-9b: Added for component migration to Zustand.
 */
export const useScanActiveDialog = () => useScanStore((s) => s.activeDialog);

/**
 * Get the current error message (if any).
 * Story 14e-9b: Added for component migration to Zustand.
 */
export const useScanError = () => useScanStore((s) => s.error);

// =============================================================================
// UI Flag Selectors (Story 14e-38)
// =============================================================================

/**
 * Get skipScanCompleteModal flag (skip scan_complete dialog in QuickSaveCard flow).
 * Story 14e-38: Added for App.tsx migration.
 */
export const useSkipScanCompleteModal = () => useScanStore((s) => s.skipScanCompleteModal);

/**
 * Get isRescanning flag (rescan in progress, button disabled state).
 * Story 14e-38: Added for App.tsx migration.
 */
export const useIsRescanning = () => useScanStore((s) => s.isRescanning);

// =============================================================================
// Overlay Selectors (Story 16-2)
// =============================================================================

export const useOverlayState = () => useScanStore((s) => s.overlayState);
export const useOverlayProgress = () => useScanStore((s) => s.overlayProgress);
export const useOverlayEta = () => useScanStore((s) => s.overlayEta);
export const useOverlayError = () => useScanStore((s) => s.overlayError);

/**
 * Get all scan results (transactions).
 * Story 14e-9b: Added for component migration to Zustand.
 */
export const useScanResults = () => useScanStore((s) => s.results);

/**
 * True when active request AND dialog showing.
 * User must resolve dialog to proceed.
 */
export const useIsBlocking = () =>
  useScanStore((s) => s.phase !== 'idle' && s.activeDialog !== null);

/**
 * True if credit has been spent (confirmed).
 * Can't cancel without warning when true.
 */
export const useCreditSpent = () => useScanStore((s) => s.creditStatus === 'confirmed');

// =============================================================================
// Complex Computed Selectors (AC3)
// =============================================================================

/**
 * True if user can navigate away without losing data.
 * Logic: isIdle || (!hasDialog && !isProcessing)
 */
export const useCanNavigateFreely = () =>
  useScanStore((s) => {
    const isIdle = s.phase === 'idle';
    const hasDialog = s.activeDialog !== null;
    const isProcessing = s.phase === 'scanning' || s.phase === 'saving';
    return isIdle || (!hasDialog && !isProcessing);
  });

/**
 * True if save button should be enabled.
 * Logic: reviewing && results.length > 0 && validResults && !hasDialog
 */
export const useCanSave = () =>
  useScanStore(
    (s) =>
      s.phase === 'reviewing' &&
      s.results.length > 0 &&
      s.results.some(canSaveTransaction) &&
      s.activeDialog === null
  );

/**
 * Derive the current view from state.
 * Used for routing/rendering decisions.
 */
export const useCurrentView = (): ScanCurrentView =>
  useScanStore((s) => {
    if (s.phase === 'idle') {
      return 'none';
    }

    if (s.phase === 'error') {
      return 'error';
    }

    if (s.phase === 'scanning' || s.phase === 'saving') {
      return 'processing';
    }

    if (s.phase === 'capturing') {
      switch (s.mode) {
        case 'single':
          return 'single-capture';
        case 'batch':
          return 'batch-capture';
        case 'statement':
          return 'statement-capture';
      }
    }

    if (s.phase === 'reviewing') {
      return s.mode === 'batch' ? 'batch-review' : 'single-review';
    }

    return 'none';
  });

// =============================================================================
// Progress Selectors (Story 14e-9c)
// =============================================================================

/**
 * Get batch progress state (for batch mode processing).
 * Story 16-6: Reads from shared workflow store.
 */
export const useBatchProgress = () => useScanWorkflowStore((s) => s.batchProgress);

/**
 * Get processing progress as percentage (0-100).
 * For batch mode: calculates from batchProgress.
 * For single mode: returns -1 (indeterminate).
 * Story 16-6: Reads from shared workflow store.
 */
export const useProcessingProgress = () =>
  useScanWorkflowStore((s) => {
    if (s.mode === 'batch' && s.batchProgress && s.batchProgress.total > 0) {
      const completed = s.batchProgress.completed.length + s.batchProgress.failed.length;
      return Math.round((completed / s.batchProgress.total) * 100);
    }
    // Single mode: indeterminate progress
    return -1;
  });

// =============================================================================
// Count Selectors (AC4)
// =============================================================================

/**
 * Get all captured images (base64 strings).
 * Story 16-6: Reads from shared workflow store.
 */
export const useScanImages = () => useScanWorkflowStore((s) => s.images);

/**
 * Number of images currently captured.
 * Story 16-6: Reads from shared workflow store.
 */
export const useImageCount = () => useScanWorkflowStore((s) => s.images.length);

/**
 * Number of successfully processed results.
 */
export const useResultCount = () => useScanStore((s) => s.results.length);

// =============================================================================
// Pending Scan Selectors (Story 18-13b)
// =============================================================================

export const usePendingScanId = () => useScanStore((s) => s.pendingScanId);
export const usePendingScanStatus = () => useScanStore((s) => s.pendingScanStatus);
export const usePendingScanDeadline = () => useScanStore((s) => s.pendingScanDeadline);

// =============================================================================
// Actions Hook (AC5)
// =============================================================================

/**
 * Hook to access all scan store actions with stable references.
 * Actions are extracted from the store state, not the hook itself,
 * ensuring stable references across re-renders.
 *
 * Usage:
 * ```tsx
 * const { startSingle, addImage, processStart } = useScanActions();
 *
 * // Start a scan
 * startSingle(userId);
 *
 * // Add an image
 * addImage(base64Data);
 * ```
 */
export const useScanActions = () =>
  useScanStore(
    useShallow((s) => ({
      // START actions
      startSingle: s.startSingle,
      startBatch: s.startBatch,
      startStatement: s.startStatement,

      // IMAGE actions
      addImage: s.addImage,
      removeImage: s.removeImage,
      setImages: s.setImages,

      // PROCESS actions
      processStart: s.processStart,
      processSuccess: s.processSuccess,
      processError: s.processError,

      // DIALOG actions
      showDialog: s.showDialog,
      resolveDialog: s.resolveDialog,
      dismissDialog: s.dismissDialog,

      // RESULT actions
      updateResult: s.updateResult,
      setActiveResult: s.setActiveResult,

      // SAVE actions
      saveStart: s.saveStart,
      saveSuccess: s.saveSuccess,
      saveError: s.saveError,

      // BATCH actions
      batchItemStart: s.batchItemStart,
      batchItemSuccess: s.batchItemSuccess,
      batchItemError: s.batchItemError,
      batchComplete: s.batchComplete,
      setBatchReceipts: s.setBatchReceipts,
      updateBatchReceipt: s.updateBatchReceipt,
      discardBatchReceipt: s.discardBatchReceipt,
      clearBatchReceipts: s.clearBatchReceipts,
      setBatchEditingIndex: s.setBatchEditingIndex,

      // CONTROL actions
      cancel: s.cancel,
      reset: s.reset,
      restoreState: s.restoreState,
      refundCredit: s.refundCredit,

      // UI flag actions (Story 14e-38)
      setSkipScanCompleteModal: s.setSkipScanCompleteModal,
      setIsRescanning: s.setIsRescanning,

      // Overlay actions (Story 16-2)
      startOverlayUpload: s.startOverlayUpload,
      setOverlayProgress: s.setOverlayProgress,
      startOverlayProcessing: s.startOverlayProcessing,
      setOverlayReady: s.setOverlayReady,
      setOverlayError: s.setOverlayError,
      resetOverlay: s.resetOverlay,
      retryOverlay: s.retryOverlay,
      pushProcessingTime: s.pushProcessingTime,

      // Pending scan actions (Story 18-13b)
      setPendingScan: s.setPendingScan,
      clearPendingScan: s.clearPendingScan,
      setPendingScanStatus: s.setPendingScanStatus,
    }))
  );

// =============================================================================
// Direct Access Functions (AC6)
// =============================================================================

/**
 * Get current scan state snapshot (for non-React code).
 *
 * Usage:
 * ```ts
 * const state = getScanState();
 * if (state.phase === 'idle') {
 *   // Can start new scan
 * }
 * ```
 */
export const getScanState = () => useScanStore.getState();

/**
 * Direct action access for non-React code (services, utilities).
 * These actions work outside the React component tree.
 *
 * Usage:
 * ```ts
 * import { scanActions } from '@features/scan';
 *
 * // In a service
 * scanActions.processStart('normal', 1);
 * ```
 */
export const scanActions = {
  // START actions
  startSingle: (userId: string) => useScanStore.getState().startSingle(userId),
  startBatch: (userId: string) => useScanStore.getState().startBatch(userId),
  startStatement: (userId: string) => useScanStore.getState().startStatement(userId),

  // IMAGE actions
  addImage: (image: string) => useScanStore.getState().addImage(image),
  removeImage: (index: number) => useScanStore.getState().removeImage(index),
  setImages: (images: string[]) => useScanStore.getState().setImages(images),

  // PROCESS actions
  processStart: (creditType: CreditType, creditsCount: number) =>
    useScanStore.getState().processStart(creditType, creditsCount),
  processSuccess: (results: Transaction[]) => useScanStore.getState().processSuccess(results),
  processError: (error: string) => useScanStore.getState().processError(error),

  // DIALOG actions
  showDialog: (dialog: DialogState) => useScanStore.getState().showDialog(dialog),
  resolveDialog: <T extends ScanDialogType>(type: T, result: ScanDialogResultMap[T]) =>
    useScanStore.getState().resolveDialog(type, result),
  dismissDialog: () => useScanStore.getState().dismissDialog(),

  // RESULT actions
  updateResult: (index: number, updates: Partial<Transaction>) =>
    useScanStore.getState().updateResult(index, updates),
  setActiveResult: (index: number) => useScanStore.getState().setActiveResult(index),

  // SAVE actions
  saveStart: () => useScanStore.getState().saveStart(),
  saveSuccess: () => useScanStore.getState().saveSuccess(),
  saveError: (error: string) => useScanStore.getState().saveError(error),

  // BATCH actions
  batchItemStart: (index: number) => useScanStore.getState().batchItemStart(index),
  batchItemSuccess: (index: number, result: Transaction) =>
    useScanStore.getState().batchItemSuccess(index, result),
  batchItemError: (index: number, error: string) =>
    useScanStore.getState().batchItemError(index, error),
  batchComplete: (batchReceipts?: BatchReceipt[]) =>
    useScanStore.getState().batchComplete(batchReceipts),
  setBatchReceipts: (receipts: BatchReceipt[]) =>
    useScanStore.getState().setBatchReceipts(receipts),
  updateBatchReceipt: (id: string, updates: Partial<BatchReceipt>) =>
    useScanStore.getState().updateBatchReceipt(id, updates),
  discardBatchReceipt: (id: string) => useScanStore.getState().discardBatchReceipt(id),
  clearBatchReceipts: () => useScanStore.getState().clearBatchReceipts(),
  setBatchEditingIndex: (index: number | null) =>
    useScanStore.getState().setBatchEditingIndex(index),

  // CONTROL actions
  cancel: () => useScanStore.getState().cancel(),
  reset: () => useScanStore.getState().reset(),
  restoreState: (state: Partial<ScanState>) => useScanStore.getState().restoreState(state),
  refundCredit: () => useScanStore.getState().refundCredit(),

  // UI flag actions (Story 14e-38)
  setSkipScanCompleteModal: (value: boolean) =>
    useScanStore.getState().setSkipScanCompleteModal(value),
  setIsRescanning: (value: boolean) => useScanStore.getState().setIsRescanning(value),

  // Overlay actions (Story 16-2)
  startOverlayUpload: () => useScanStore.getState().startOverlayUpload(),
  setOverlayProgress: (pct: number) => useScanStore.getState().setOverlayProgress(pct),
  startOverlayProcessing: () => useScanStore.getState().startOverlayProcessing(),
  setOverlayReady: () => useScanStore.getState().setOverlayReady(),
  setOverlayError: (type: ScanErrorType, message: string) =>
    useScanStore.getState().setOverlayError(type, message),
  resetOverlay: () => useScanStore.getState().resetOverlay(),
  retryOverlay: () => useScanStore.getState().retryOverlay(),
  pushProcessingTime: (seconds: number) => useScanStore.getState().pushProcessingTime(seconds),

  // Pending scan actions (Story 18-13b)
  setPendingScan: (scanId: string, deadline: number) =>
    useScanStore.getState().setPendingScan(scanId, deadline),
  clearPendingScan: () => useScanStore.getState().clearPendingScan(),
  setPendingScanStatus: (status: FirestoreScanStatus) =>
    useScanStore.getState().setPendingScanStatus(status),
  setProcessedScanId: (scanId: string) =>
    useScanStore.getState().setProcessedScanId(scanId),
} as const;

// Export the type for scanActions
export type ScanActionsType = typeof scanActions;
