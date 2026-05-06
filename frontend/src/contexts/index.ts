/**
 * Story 14c-refactor.9: Context barrel exports
 *
 * Central export point for all React contexts.
 * Import from here for cleaner imports.
 *
 * @example
 * ```tsx
 * import { useAuthContext } from './contexts';
 * ```
 */

// =============================================================================
// Story 14c-refactor.9: New Contexts
// =============================================================================

// AuthContext - Firebase authentication state
export {
    AuthProvider,
    useAuthContext,
    useAuthContextOptional,
    type AuthContextValue,
    type Services,
} from './AuthContext';

// =============================================================================
// Story 14e-45: NavigationContext DELETED
// =============================================================================
//
// NavigationContext removed (Story 14e-45), then Zustand store removed.
// Navigation now uses TanStack Router directly.
// - View type: import { View } from '@app/types'
// - Route helpers: import { viewToPath, pathToView } from '@/lib/routeMapping'

// Story 15-7c: ThemeContext DELETED (15-TD-7) — theme settings use useSettingsStore (Zustand)
// Use useThemeSettings() from '@/shared/stores'.

// Story 15b-3g: NotificationContext DELETED — zero consumers. App.tsx calls useInAppNotifications directly.

// Story 15-7b: AppStateContext DELETED (15-TD-7) — useToast() is the toast mechanism

// Story 14e-11: ScanContext removed - scan state now managed by Zustand store
// Use @features/scan/store for scan state and actions

// Story 15b-3f: AnalyticsContext DELETED — analytics state uses useAnalyticsStore (Zustand)
// Use useAnalyticsNavigation() from @features/analytics/hooks for component access.
// Use analyticsActions from @features/analytics/stores for imperative access.

// Story 15b-3g: HistoryFiltersContext DELETED — replaced by useHistoryFiltersInit hook.
// State access via useHistoryFilters() from @/shared/hooks or useHistoryFiltersStore.
// getDefaultFilterState available from @/shared/stores/useHistoryFiltersStore.

// =============================================================================
// Story 14e-25d: ViewHandlersContext DELETED
// =============================================================================
//
// ViewHandlersContext was removed in Story 14e-25d. Views now use direct hooks:
// - Navigation: useNavigationActions() from @/shared/stores
// - Toast: useToast() from @/shared/hooks
// - Modals: useModalActions() from @/managers/ModalManager
// - History navigation: useHistoryNavigation() from @/shared/hooks
