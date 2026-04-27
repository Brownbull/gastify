/**
 * Scan Feature Hooks
 *
 * Story 14e-30: Scan initiation handlers hook
 * Story 15b-1i: Consolidated scan hooks from src/hooks/
 * Story 16-2: Removed useScanState + useScanOverlayState (merged into Zustand store)
 *
 * Exports:
 * - useScanInitiation: Handlers for starting scans (handleNewTransaction, handleFileSelect, handleRescan)
 * - useScanHandlers: Scan dialog and flow handlers
 */

// Story 14e-30: Scan initiation handlers
export { useScanInitiation } from './useScanInitiation';
export type {
  ScanInitiationProps,
  ScanInitiationHandlers,
  ToastMessage,
  UserCredits as ScanUserCredits,
} from './useScanInitiation';

// Story 15b-1i: Scan handlers
export { useScanHandlers } from './useScanHandlers';
export type { UseScanHandlersProps, UseScanHandlersResult } from './useScanHandlers';

// Story 18-13b: Pending scan hooks
export { usePendingScan } from './usePendingScan';
export type { UsePendingScanProps, UsePendingScanReturn } from './usePendingScan';
export { useScanLock } from './useScanLock';
export type { ScanLockState } from './useScanLock';