/**
 * Feature: Scan
 *
 * This module contains the scan Zustand store, handlers, components, and
 * the ScanFeature orchestrator.
 *
 * Implemented incrementally across Stories 14e-6 through 14e-11:
 * - Story 14e-6a: Store foundation with core actions (START_*, IMAGE_*, PROCESS_*)
 * - Story 14e-6b: Remaining actions (DIALOG_*, SAVE_*, BATCH_*, CONTROL)
 * - Story 14e-6c: Selectors & module exports
 * - Story 14e-6d: Comprehensive tests & verification
 * - Story 14e-8a-c: processScan handler extraction
 * - Story 14e-9a-c: Component migration & state components
 * - Story 14e-10: ScanFeature orchestrator
 *
 * Usage:
 * ```tsx
 * // Import store and selectors
 * import {
 *   useScanStore,
 *   useScanPhase,
 *   useScanActions,
 *   getScanState,
 *   scanActions,
 * } from '@features/scan';
 *
 * // Import processScan handler
 * import { processScan } from '@features/scan';
 *
 * // Import ScanFeature orchestrator (Story 14e-10)
 * import { ScanFeature } from '@features/scan';
 *
 * // In React components
 * const phase = useScanPhase();
 * const { startSingle } = useScanActions();
 *
 * // In non-React code
 * const state = getScanState();
 * scanActions.startSingle(userId);
 * ```
 */

// Re-export ScanFeature orchestrator (Story 14e-10, 14e-23a)
export { ScanFeature } from './ScanFeature';
export type { ScanFeatureProps } from './ScanFeature';

// Re-export entire store module
export * from './store';

// Re-export handlers module (Story 14e-8c)
export * from './handlers';

// Re-export components (Story 14e-9a)
export * from './components';

// Re-export hooks (Story 14e-30)
export * from './hooks';

// Re-export utils (Story 14e-40)
export * from './utils';

// Re-export views (Story 15b-3)
export * from './views';

// Re-export services (TD-18-22: copyPendingToReceipts needed by useTransactionHandlers)
export { copyPendingToReceipts } from './services/pendingScanUpload';

// Types: scan-internal types available via @features/scan/types/scanStateMachine
// Shared types available via @shared/types/scanWorkflow
// Store re-exports commonly-used types (ScanState, ScanPhase, ScanMode, etc.)
