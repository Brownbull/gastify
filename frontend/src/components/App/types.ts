/**
 * Story 14c-refactor.11: App Components Shared Types
 * Story 14e-22: AppProvidersProps moved to src/app/types.ts
 * Story 14e-25a.1: View type moved to src/app/types.ts (re-exported here for backward compatibility)
 *
 * Type definitions shared across App-level components:
 * - AppErrorBoundary
 * - AppLayout
 * - AppRoutes
 *
 * Note: AppProviders is now in src/app/, use @app imports.
 * Note: View type is now in src/app/types.ts, prefer @app imports for new code.
 *
 * Architecture Reference: Epic 14c-refactor - App Decomposition
 */

import type { ReactNode } from 'react';
import type { Theme, ColorTheme, FontFamily } from '../../types/settings';
import type { View } from '@app/types';

// =============================================================================
// View Types (re-exported from @app/types for backward compatibility)
// =============================================================================
// Story 14e-25a.1: View type and utilities now live in src/app/types.ts
// Re-export here for backward compatibility with existing imports.
// For new code, prefer: import type { View } from '@app/types';

export {
    type View,
    FULL_SCREEN_VIEWS,
    VIEWS_WITHOUT_TOP_HEADER,
    shouldShowTopHeader,
    isFullScreenView,
} from '@app/types';

// =============================================================================
// Theme Types (re-exported for convenience)
// =============================================================================

export type { Theme, ColorTheme, FontFamily };

// =============================================================================
// Provider Props Types
// =============================================================================
// Story 14e-22: AppProvidersProps moved to src/app/types.ts
// Use: import type { AppProvidersProps } from '@app';

// =============================================================================
// Layout Props Types
// =============================================================================

/**
 * Props for AppLayout component.
 *
 * AppLayout handles the outer container structure with theme classes.
 */
export interface AppLayoutProps {
    children: ReactNode;

    /** Light or dark theme */
    theme: Theme;

    /** Color theme (normal, professional, mono) */
    colorTheme: ColorTheme;
}

/**
 * Props for AppMainContent sub-component.
 *
 * AppMainContent handles the scrollable main content area with proper padding
 * based on whether the current view is full-screen or not.
 */
export interface AppMainContentProps {
    children: ReactNode;

    /** Whether the view is full-screen (manages its own padding) */
    isFullScreenView: boolean;

    /** Ref for scroll position management */
    mainRef?: React.RefObject<HTMLElement>;
}

// =============================================================================
// Routes Props Types
// =============================================================================

/**
 * Props for AppRoutes component.
 *
 * AppRoutes provides a clean interface for view rendering while delegating
 * the actual view component creation to the parent via render prop.
 */
export interface AppRoutesProps {
    /** Current view to render */
    view: View;

    /** Render function that returns the view component */
    renderView: (view: View) => ReactNode;
}

// =============================================================================
// Error Boundary Types
// =============================================================================

/**
 * Props for AppErrorBoundary component.
 */
export interface AppErrorBoundaryProps {
    children: ReactNode;
}

/**
 * State for AppErrorBoundary component.
 */
export interface AppErrorBoundaryState {
    hasError: boolean;
    error: string;
    errorInfo: string;
}

