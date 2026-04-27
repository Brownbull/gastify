/**
 * AppView Sub-View
 * Story 14.22 AC #9: PWA installation and notifications settings
 *
 * Migrates PWASettingsSection and NotificationSettings into dedicated sub-view
 * Also displays app version number
 */

import React from 'react';
import { PWASettingsSection } from '../PWASettingsSection';
import { NotificationSettings } from '../NotificationSettings';
import type { Firestore } from 'firebase/firestore';

interface AppViewProps {
    t: (key: string) => string;
    theme: string;
    // Push notifications settings
    db?: Firestore | null;
    userId?: string | null;
    appId?: string | null;
    onShowToast?: (message: string) => void;
}

export const AppView: React.FC<AppViewProps> = ({
    t,
    theme,
    db = null,
    userId = null,
    appId = null,
    onShowToast,
}) => {
    return (
        <div className="space-y-3">
            {/* PWA Installation Section - includes version badge */}
            <PWASettingsSection t={t} theme={theme as 'light' | 'dark'} onShowToast={onShowToast} />

            {/* Push Notifications Settings */}
            <NotificationSettings
                t={t}
                theme={theme as 'light' | 'dark'}
                db={db}
                userId={userId}
                appId={appId}
                onShowToast={onShowToast}
            />
        </div>
    );
};
