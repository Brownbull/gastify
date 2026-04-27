/**
 * useInAppNotifications Hook
 *
 *
 * Real-time subscription to user's in-app notifications.
 * Provides read/unread state management and notification count.
 *
 * @example
 * ```tsx
 * const {
 *   notifications,
 *   unreadCount,
 *   isLoading,
 *   markAsRead,
 *   markAllAsRead,
 * } = useInAppNotifications(db, userId, appId);
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import {
    collection,
    query,
    orderBy,
    limit,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    type Firestore,
} from 'firebase/firestore';
import type { InAppNotification, InAppNotificationClient } from '../types/notification';
import { toDateSafe } from '@/utils/timestamp';
import { batchWrite, batchDelete, type BatchResult } from '@/lib/firestoreBatch';
import { notificationsPath, notificationDocSegments } from '@/lib/firestorePaths';

// ============================================================================
// Types
// ============================================================================

export interface UseInAppNotificationsResult {
    /** List of notifications (newest first) */
    notifications: InAppNotificationClient[];
    /** Number of unread notifications */
    unreadCount: number;
    /** Whether initial load is in progress */
    isLoading: boolean;
    /** Error if subscription failed */
    error: Error | null;
    /** Mark a specific notification as read */
    markAsRead: (notificationId: string) => Promise<void>;
    /** Mark all notifications as read */
    markAllAsRead: () => Promise<void>;
    /** Delete a specific notification */
    deleteNotification: (notificationId: string) => Promise<void>;
    /** Delete all notifications. Returns BatchResult for partial-failure detection. */
    deleteAllNotifications: () => Promise<BatchResult | undefined>;
}

// ============================================================================
// Constants
// ============================================================================

/** Maximum number of notifications to fetch */
const MAX_NOTIFICATIONS = 50;

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Subscribe to user's in-app notifications.
 *
 * @param db - Firestore instance
 * @param userId - Current user's ID
 * @param appId - Application ID
 * @returns Notifications state and management functions
 */
export function useInAppNotifications(
    db: Firestore | null,
    userId: string | null,
    appId: string | null
): UseInAppNotificationsResult {
    const [notifications, setNotifications] = useState<InAppNotificationClient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Subscribe to notifications collection
    useEffect(() => {
        if (!db || !userId || !appId) {
            setNotifications([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        const notificationsRef = collection(
            db,
            notificationsPath(appId, userId)
        );

        const q = query(
            notificationsRef,
            orderBy('createdAt', 'desc'),
            limit(MAX_NOTIFICATIONS)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const notifs: InAppNotificationClient[] = snapshot.docs.map((doc) => {
                    const data = doc.data() as InAppNotification;
                    return {
                        ...data,
                        id: doc.id,
                        createdAt: toDateSafe(data.createdAt) || new Date(),
                    };
                });
                setNotifications(notifs);
                setIsLoading(false);
            },
            (err) => {
                console.error('[useInAppNotifications] Subscription error:', err);
                setError(err);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [db, userId, appId]);

    // Calculate unread count
    const unreadCount = notifications.filter((n) => !n.read).length;

    // Mark a single notification as read
    const markAsRead = useCallback(
        async (notificationId: string) => {
            if (!db || !userId || !appId) return;

            try {
                const notifRef = doc(db, ...notificationDocSegments(appId, userId, notificationId));
                await updateDoc(notifRef, { read: true });
            } catch (err) {
                console.error('[useInAppNotifications] Failed to mark as read:', err);
            }
        },
        [db, userId, appId]
    );

    // Mark all notifications as read
    const markAllAsRead = useCallback(async () => {
        if (!db || !userId || !appId) return;
        const currentDb = db;
        const uid = userId;
        const aid = appId;

        const unreadNotifs = notifications.filter((n) => !n.read);
        if (unreadNotifs.length === 0) return;

        try {
            await batchWrite(currentDb, unreadNotifs, (batch, notif) => {
                const notifRef = doc(currentDb, ...notificationDocSegments(aid, uid, notif.id));
                batch.update(notifRef, { read: true });
            });
        } catch (err) {
            console.error('[useInAppNotifications] Failed to mark all as read:', err);
        }
    }, [db, userId, appId, notifications]);

    // Delete a single notification
    const deleteNotification = useCallback(
        async (notificationId: string) => {
            if (!db || !userId || !appId) return;

            try {
                const notifRef = doc(db, ...notificationDocSegments(appId, userId, notificationId));
                await deleteDoc(notifRef);
            } catch (err) {
                console.error('[useInAppNotifications] Failed to delete notification:', err);
            }
        },
        [db, userId, appId]
    );

    // Delete all notifications — returns BatchResult for partial-failure detection
    const deleteAllNotifications = useCallback(async (): Promise<BatchResult | undefined> => {
        if (!db || !userId || !appId) return undefined;
        if (notifications.length === 0) return undefined;
        const currentDb = db;
        const uid = userId;
        const aid = appId;

        try {
            const refs = notifications.map((notif) =>
                doc(currentDb, ...notificationDocSegments(aid, uid, notif.id))
            );
            return await batchDelete(currentDb, refs);
        } catch (err) {
            console.error('[useInAppNotifications] Failed to delete all notifications:', err);
            const batchResult = (err as Error & { batchResult?: BatchResult })?.batchResult;
            if (batchResult) return batchResult;
            return undefined;
        }
    }, [db, userId, appId, notifications]);

    return {
        notifications,
        unreadCount,
        isLoading,
        error,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteAllNotifications,
    };
}

export default useInAppNotifications;
