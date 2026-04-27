/**
 * Story 14c-refactor.11: AppRoutes - View routing switch component
 *
 * Centralizes view rendering logic based on current navigation state.
 * This component provides a clean abstraction over the view switching logic
 * while allowing App.tsx to retain control over view-specific props.
 *
 * Design Decision:
 * Rather than passing all view props through this component (which would
 * create a massive prop drilling problem), we use a render prop pattern.
 * This allows App.tsx to retain its existing view rendering while this
 * component provides structure and common patterns.
 *
 * Architecture Reference: Epic 14c-refactor - App Decomposition
 *
 * @example
 * ```tsx
 * // Future usage (when views are fully extracted):
 * <AppRoutes
 *   view={view}
 *   renderView={(view) => {
 *     switch (view) {
 *       case 'dashboard': return <DashboardView {...dashboardProps} />;
 *       case 'trends': return <TrendsView {...trendsProps} />;
 *       // ...
 *     }
 *   }}
 * />
 * ```
 */

import type { AppRoutesProps } from './types';

// =============================================================================
// Component
// =============================================================================

/**
 * View routing switch component.
 *
 * Provides a clean interface for view rendering while delegating the actual
 * view component creation to the parent via render prop.
 *
 * This pattern allows:
 * - Centralized view switching logic
 * - Future middleware (analytics, transitions)
 * - Type safety for view names
 * - Clean separation of routing from view implementation
 */
export function AppRoutes({ view, renderView }: AppRoutesProps): JSX.Element {
    return <>{renderView(view)}</>;
}

export default AppRoutes;
