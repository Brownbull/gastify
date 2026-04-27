/**
 * Story 14c-refactor.11: AppLayout - App shell layout component
 *
 * Provides the main app shell structure including:
 * - Theme class application to root container
 * - Main content area with proper sizing and overflow
 * - Consistent padding based on view type
 * - Safe area insets for PWA/mobile
 *
 * This component extracts the structural layout logic from App.tsx,
 * providing a clean interface for the app shell while leaving
 * specific content rendering to child components.
 *
 * Architecture Reference: Epic 14c-refactor - App Decomposition
 *
 * @example
 * ```tsx
 * <AppLayout
 *   theme={theme}
 *   colorTheme={colorTheme}
 *   isFullScreenView={isFullScreenView}
 *   mainRef={mainRef}
 * >
 *   <TopHeader ... />
 *   <main>{viewContent}</main>
 *   <Nav ... />
 * </AppLayout>
 * ```
 */

import type { AppLayoutProps, AppMainContentProps } from './types';

// =============================================================================
// Component
// =============================================================================

/**
 * App shell layout component.
 *
 * Handles the outer container structure with proper theme classes and styling.
 * Uses CSS variables for theming (defined in index.html and activated by classes).
 *
 * Layout structure:
 * - Fixed max-width container (max-w-md) for mobile-first design
 * - Centered with shadow and border for card-like appearance on desktop
 * - Flex column with overflow hidden for proper scrolling
 * - Dynamic viewport height (dvh) for PWA compatibility
 */
export function AppLayout({
    children,
    theme,
    colorTheme,
}: AppLayoutProps): JSX.Element {
    const isDark = theme === 'dark';
    const themeClass = isDark ? 'dark' : '';
    // 'normal' is base CSS, 'professional' and 'mono' are overrides
    const dataTheme = colorTheme !== 'normal' ? colorTheme : undefined;

    return (
        <div
            className={`h-screen h-[100dvh] max-w-md mx-auto shadow-xl border-x flex flex-col overflow-hidden ${themeClass}`}
            data-theme={dataTheme}
            style={{
                backgroundColor: 'var(--bg)',
                color: 'var(--primary)',
                borderColor: isDark ? '#1e293b' : '#e2e8f0',
            }}
        >
            {children}
        </div>
    );
}

// =============================================================================
// Sub-components
// =============================================================================

/**
 * Main content area component.
 *
 * Handles the scrollable main content area with proper padding
 * based on whether the current view is full-screen or not.
 *
 * Full-screen views (trends, history, reports, etc.) manage their own
 * headers and padding, so this component applies no padding.
 *
 * Regular views get padding for the top header and bottom nav.
 */
export function AppMainContent({
    children,
    isFullScreenView,
    mainRef,
}: AppMainContentProps): JSX.Element {
    return (
        <main
            ref={mainRef}
            className={`flex-1 overflow-y-auto ${isFullScreenView ? '' : 'p-3'}`}
            style={{
                paddingBottom: isFullScreenView
                    ? '0'
                    : 'calc(6rem + var(--safe-bottom, 0px))',
                paddingTop: isFullScreenView
                    ? '0'
                    : 'calc(5rem + env(safe-area-inset-top, 0px))',
            }}
        >
            {children}
        </main>
    );
}

export default AppLayout;
