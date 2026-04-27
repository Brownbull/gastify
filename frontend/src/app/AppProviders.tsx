/**
 * Story 14e-22: AppProviders - App-level provider composition
 * Story 15b-3g: NotificationProvider removed (zero consumers — App.tsx calls useInAppNotifications directly)
 *
 * Syncs fontFamily from Firestore preferences to Zustand settingsStore.
 * All other providers have been migrated to Zustand stores or direct hooks.
 *
 * @example
 * ```tsx
 * <AppProviders fontFamily={userPreferences.fontFamily}>
 *   <main>{views}</main>
 * </AppProviders>
 * ```
 */

import { useEffect, type ReactNode } from 'react';
import { settingsActions } from '../shared/stores';
import type { FontFamily } from '../types/settings';

// =============================================================================
// Component
// =============================================================================

interface AppProvidersProps {
    children: ReactNode;
    fontFamily?: FontFamily;
}

export function AppProviders({
    children,
    fontFamily = 'outfit',
}: AppProvidersProps): JSX.Element {
    useEffect(() => {
        settingsActions.setFontFamily(fontFamily);
    }, [fontFamily]);

    return <>{children}</>;
}

export default AppProviders;
