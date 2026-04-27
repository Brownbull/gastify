/**
 * Story 14c-refactor.10: App-level hooks barrel exports
 * Story 14e-25d: ViewHandlersContext deleted - views use direct hooks
 *
 * Central export point for app-level initialization, lifecycle,
 * and coordination hooks.
 *
 * These hooks extract non-scan related App.tsx logic into
 * reusable, testable modules.
 *
 * ## Handler Access (Story 14e-25d)
 *
 * Views now use direct hooks for navigation and handlers:
 * - Navigation: useNavigationActions() from @/shared/stores
 * - Toast: useToast() from @/shared/hooks
 * - Modals: useModalActions() from @/managers/ModalManager
 * - History navigation: useHistoryNavigation() from @/shared/hooks
 *
 * @example
 * ```tsx
 * import {
 *   useOnlineStatus,
 *   useAppLifecycle,
 *   useAppInitialization,
 *   useDeepLinking,
 * } from './hooks/app';
 * ```
 */

// =============================================================================
// App Lifecycle Hooks
// =============================================================================

// Online/Offline status monitoring
export {
    useOnlineStatus,
    type UseOnlineStatusResult,
} from './useOnlineStatus';

// App lifecycle events (foreground/background, beforeunload)
export {
    useAppLifecycle,
    type UseAppLifecycleResult,
} from './useAppLifecycle';

// =============================================================================
// App Initialization Hooks
// =============================================================================

// App initialization coordination
export {
    useAppInitialization,
    type UseAppInitializationResult,
} from './useAppInitialization';

// =============================================================================
// Transaction & Scan Handler Hooks
// =============================================================================

// Story 14c-refactor.20: Transaction CRUD handlers
export {
    useTransactionHandlers,
    type UseTransactionHandlersProps,
    type UseTransactionHandlersResult,
} from './useTransactionHandlers';

// Story 14c-refactor.20: Scan flow handlers
export {
    useScanHandlers,
    type UseScanHandlersProps,
    type UseScanHandlersResult,
} from './useScanHandlers';

// =============================================================================
// Navigation & Dialog Handler Hooks
// =============================================================================

// Story 14c-refactor.21: Navigation handlers
export {
    useNavigationHandlers,
    type UseNavigationHandlersProps,
    type UseNavigationHandlersResult,
} from './useNavigationHandlers';

// Story 14c-refactor.21: Dialog handlers
export {
    useDialogHandlers,
    type UseDialogHandlersProps,
    type UseDialogHandlersResult,
    type ToastMessage,
    type ConflictDialogData,
} from './useDialogHandlers';

// =============================================================================
// View Props Composition Hooks (Story 14c-refactor.26)
// =============================================================================

// Story 14e-25b.1: useTrendsViewProps DELETED - TrendsView now owns its data via useTrendsViewData
// Story 14e-25d: useHistoryViewProps DELETED - HistoryView now owns its data via useHistoryViewData
// Story 14e-16: useBatchReviewViewProps DELETED - BatchReviewFeature uses store selectors
// Story 14e-25b.2: useDashboardViewProps DELETED - DashboardView now owns its data via useDashboardViewData
// Story 14e-25d: useSettingsViewProps DELETED - SettingsView now owns its data via useSettingsViewData
// Story 14e-28b: useTransactionEditorViewProps DELETED - TransactionEditorView now owns its data via internal hooks
// Story 14e-31: useItemsViewProps DELETED - ItemsView now owns its data via useItemsViewData
