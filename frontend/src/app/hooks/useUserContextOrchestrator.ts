/**
 * useUserContextOrchestrator - Composes auth, preferences, credits,
 * notifications, personal records, and accessibility hooks.
 *
 * Story 15b-4f: App.tsx fan-out reduction
 */
import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { useUserCredits } from '../../hooks/useUserCredits';
import { usePersonalRecords } from '../../hooks/usePersonalRecords';
import { useInAppNotifications } from '../../hooks/useInAppNotifications';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { migrateCreatedAt } from '../../utils/migrateCreatedAt';

export function useUserContextOrchestrator() {
    const { user, services, initError, signIn, signInWithTestCredentials, signOut } = useAuth();

    const { preferences: userPreferences } = useUserPreferences(user, services);

    const {
        credits: userCredits,
        deductCredits: deductUserCredits,
        deductSuperCredits: deductUserSuperCredits,
        addCredits: addUserCredits,
        addSuperCredits: addUserSuperCredits,
    } = useUserCredits(user);

    const {
        recordToCelebrate,
        showRecordBanner,
        checkForRecords,
        dismissRecord,
    } = usePersonalRecords({
        db: services?.db ?? null,
        userId: user?.uid ?? null,
        appId: services?.appId ?? null,
    });

    const db = services?.db ?? null;

    const {
        notifications: inAppNotifications,
        unreadCount: inAppNotificationsUnreadCount,
        markAsRead: markNotificationAsRead,
        markAllAsRead: markAllNotificationsAsRead,
        deleteNotification: deleteInAppNotification,
        deleteAllNotifications: deleteAllInAppNotifications,
    } = useInAppNotifications(db, user?.uid ?? null, services?.appId ?? null);

    const prefersReducedMotion = useReducedMotion();

    // DEV: Expose migration function to browser console for fixing createdAt
    useEffect(() => {
        if (import.meta.env.DEV && services?.db && user?.uid) {
            (window as any).runCreatedAtMigration = async (dryRun = true) => {
                return migrateCreatedAt(services.db, user.uid, services.appId, dryRun);
            };
        }
    }, [services, user]);

    return {
        user,
        services,
        initError,
        signIn,
        signInWithTestCredentials,
        signOut,
        db,
        userPreferences,
        userCredits,
        deductUserCredits,
        deductUserSuperCredits,
        addUserCredits,
        addUserSuperCredits,
        recordToCelebrate,
        showRecordBanner,
        checkForRecords,
        dismissRecord,
        inAppNotifications,
        inAppNotificationsUnreadCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteInAppNotification,
        deleteAllInAppNotifications,
        prefersReducedMotion,
    };
}
