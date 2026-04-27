/**
 * Story 14c-refactor.11: App components barrel exports
 *
 * Central export point for App-level architectural components.
 * These components handle the app's structural concerns:
 * - Error boundaries
 * - Provider composition
 * - Layout shell
 * - View routing
 *
 * @example
 * ```tsx
 * import {
 *   AppErrorBoundary,
 *   AppProviders,
 *   AppLayout,
 *   AppRoutes,
 *   shouldShowTopHeader,
 *   isFullScreenView,
 * } from './components/App';
 * ```
 */

// =============================================================================
// Shared Types (re-export from types.ts)
// =============================================================================

// Story 14e-22: AppProvidersProps moved to src/app/types.ts
export type {
    View,
    Theme,
    ColorTheme,
    FontFamily,
    AppLayoutProps,
    AppMainContentProps,
    AppRoutesProps,
    AppErrorBoundaryProps,
    AppErrorBoundaryState,
} from './types';

export {
    FULL_SCREEN_VIEWS,
    VIEWS_WITHOUT_TOP_HEADER,
    shouldShowTopHeader,
    isFullScreenView,
} from './types';

// =============================================================================
// Error Handling
// =============================================================================

export { AppErrorBoundary } from './AppErrorBoundary';

// =============================================================================
// Provider Composition
// =============================================================================
// Story 14e-22: AppProviders moved to src/app/AppProviders.tsx
// Use: import { AppProviders } from '@app/AppProviders';

// =============================================================================
// Layout Components
// =============================================================================

export { AppLayout, AppMainContent } from './AppLayout';

// =============================================================================
// Routing
// =============================================================================

export { AppRoutes } from './AppRoutes';

// =============================================================================
// Overlays (Story 14c-refactor.22d)
// =============================================================================

export { AppOverlays } from './AppOverlays';
export type { AppOverlaysProps } from './AppOverlays';

// Story 15b-0b: viewRenderers re-exports REMOVED to break 3 circular deps.
// Import render functions directly from ./viewRenderers instead of this barrel.
