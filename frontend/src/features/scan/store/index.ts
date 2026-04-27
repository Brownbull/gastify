/**
 * Story 14e-6c: Scan Store Module Exports
 *
 * Complete exports for the scan Zustand store including:
 * - Core store hook and initial state (14e-6a)
 * - All selector hooks for efficient subscriptions (14e-6c)
 * - useScanActions hook for React components (14e-6c)
 * - Direct access functions for non-React code (14e-6c)
 */

// =============================================================================
// Core Store
// =============================================================================

export { useScanStore, initialScanState } from './useScanStore';

// Scan constants (Story 16-2: migrated from hooks/useScanState)
/** Processing timeout in milliseconds (TD-18-11: increased from 30s to 60s for cold start margin) */
export const PROCESSING_TIMEOUT_MS = 60000;
/** Ready state display duration in milliseconds (500ms checkmark) */
export const READY_DISPLAY_MS = 500;

// =============================================================================
// Selectors (Story 14e-6c)
// =============================================================================

// Phase/Mode selectors
export { useScanPhase, useScanMode } from './selectors';

// Boolean computed selectors
export {
  useHasActiveRequest,
  useIsProcessing,
  useIsIdle,
  useHasError,
  useHasDialog,
  useIsBlocking,
  useCreditSpent,
} from './selectors';

// Data selectors (Story 14e-9b)
export { useScanActiveDialog, useScanError, useScanResults } from './selectors';

// UI flag selectors (Story 14e-38)
export { useSkipScanCompleteModal, useIsRescanning } from './selectors';

// Overlay selectors (Story 16-2)
export {
  useOverlayState,
  useOverlayProgress,
  useOverlayEta,
  useOverlayError,
} from './selectors';

// Complex computed selectors
export { useCanNavigateFreely, useCanSave, useCurrentView } from './selectors';

// Count selectors
export { useImageCount, useResultCount } from './selectors';

// Pending scan selectors (Story 18-13b)
export { usePendingScanId, usePendingScanStatus, usePendingScanDeadline } from './selectors';

// Image selectors (Story 14e-34a)
export { useScanImages } from './selectors';

// Progress selectors (Story 14e-9c)
export { useBatchProgress, useProcessingProgress } from './selectors';

// =============================================================================
// Action Hooks & Direct Access (Story 14e-6c)
// =============================================================================

// React hook for actions (stable references)
export { useScanActions } from './selectors';

// Direct access for non-React code
export { getScanState, scanActions } from './selectors';

// TD-18-3: Credit safety net callback registration
export { registerCreditRefundCallback } from './slices/scanCoreSlice';

// Type export
export type { ScanActionsType } from './selectors';

// =============================================================================
// Type Re-exports for Convenience
// =============================================================================

export type {
  ScanState,
  ScanPhase,
  ScanMode,
  CreditStatus,
  CreditType,
  BatchProgress,
  ScanCurrentView,
  ScanComputedValues,
  DialogState,
  ScanDialogType,
} from '../types/scanStateMachine';

export type { ScanDialogResultMap, ScanOverlayState, ScanErrorType } from './slices/types';
