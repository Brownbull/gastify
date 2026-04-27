/**
 * Push Notifications Hook
 *
 * Story 9.18: Initial push notification setup
 *
 * Hook for managing push notification state and functionality.
 * Uses the native Push API with VAPID keys instead of FCM for
 * reliable notification delivery when the app is closed.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { setStorageString } from '@/utils/storage';
import {
  isWebPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToWebPush,
  saveSubscriptionToServer,
  disableWebPushNotifications,
  isWebPushEnabledLocal,
  WEB_PUSH_CONSTANTS,
} from '../services/webPushService';
import type { NotificationClickData } from '../types/notification';
export type { NotificationClickData };

export interface PushNotificationState {
  /** Whether push notifications are supported in this browser */
  isSupported: boolean;
  /** Current notification permission status */
  permission: NotificationPermission;
  /** The push subscription endpoint (indicates subscription exists) */
  token: string | null;
  /** Whether we're currently requesting permission or subscribing */
  isLoading: boolean;
  /** Error message if something went wrong */
  error: string | null;
  /** Request notification permission and subscribe to web push */
  enableNotifications: () => Promise<boolean>;
  /** Unsubscribe from web push */
  disableNotifications: () => Promise<void>;
}

interface UsePushNotificationsOptions {
  /** Firestore instance (kept for API compatibility) */
  db: unknown;
  /** User ID (kept for API compatibility) */
  userId: string | null;
  /** App ID (kept for API compatibility) */
  appId: string | null;
  /** Callback when a foreground notification is received */
  onNotificationReceived?: (title: string, body: string) => void;
  /** Callback when a notification is clicked (for delta fetch) */
  onNotificationClick?: (data: NotificationClickData) => void;
}

/**
 * Hook for managing push notifications using Web Push (VAPID).
 *
 * @param options Configuration options
 * @returns PushNotificationState
 */
export function usePushNotifications({
  userId,
  onNotificationReceived,
  onNotificationClick
}: UsePushNotificationsOptions): PushNotificationState {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track initialization to prevent duplicate operations
  const initializedRef = useRef(false);

  // Check support and initial permission on mount
  useEffect(() => {
    const supported = isWebPushSupported();
    console.log('[usePushNotifications] isSupported:', supported);
    setIsSupported(supported);

    if (supported) {
      const currentPermission = getNotificationPermission();
      console.log('[usePushNotifications] currentPermission:', currentPermission);
      setPermission(currentPermission);

      // Restore token state from localStorage if permission is granted
      if (currentPermission === 'granted' && isWebPushEnabledLocal()) {
        // Set a placeholder token to indicate enabled state
        // The actual subscription is managed by the service worker
        setToken('web-push-enabled');
      }
    }
  }, []);

  // Listen for service worker messages (for foreground notifications and notification clicks)
  useEffect(() => {
    if (!isSupported) return;
    if (!onNotificationReceived && !onNotificationClick) return;

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        console.log('[usePushNotifications] Notification clicked:', event.data);
        if (onNotificationClick) {
          const data = event.data.data || {};
          onNotificationClick({
            type: data.type,
            groupId: data.groupId,
            transactionId: data.transactionId,
            url: event.data.url,
          });
        }
      } else if (event.data?.type === 'PUSH_RECEIVED') {
        // Foreground push received
        const { title, body } = event.data;
        if (title && body && onNotificationReceived) {
          onNotificationReceived(title, body);
        }
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [isSupported, onNotificationReceived, onNotificationClick]);

  // Auto-subscribe on mount if user is authenticated and was previously enabled
  useEffect(() => {
    if (!isSupported || !userId || initializedRef.current) return;
    if (permission !== 'granted' || !isWebPushEnabledLocal()) return;

    initializedRef.current = true;

    // Re-subscribe to ensure subscription is saved to server
    (async () => {
      try {
        const subscription = await subscribeToWebPush();
        if (subscription) {
          await saveSubscriptionToServer(subscription);
          console.log('[usePushNotifications] Re-subscribed on mount');
        }
      } catch (err) {
        console.warn('[usePushNotifications] Failed to re-subscribe on mount:', err);
      }
    })();
  }, [isSupported, userId, permission]);

  /**
   * Request permission and enable notifications
   */
  const enableNotifications = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request permission
      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);

      if (newPermission !== 'granted') {
        setError('Notification permission was denied');
        return false;
      }

      // Subscribe to web push
      const subscription = await subscribeToWebPush();
      if (!subscription) {
        setError('Failed to create push subscription');
        return false;
      }

      // Save to server
      const saved = await saveSubscriptionToServer(subscription);
      if (!saved) {
        setError('Failed to save subscription to server');
        return false;
      }

      // Update state
      setToken('web-push-enabled');

      // Store in localStorage
      setStorageString(WEB_PUSH_CONSTANTS.LOCAL_STORAGE_KEY, 'true');
      setStorageString(WEB_PUSH_CONSTANTS.LOCAL_STORAGE_ENDPOINT_KEY, subscription.endpoint);

      return true;
    } catch (err) {
      console.error('[usePushNotifications] Failed to enable:', err);
      setError('Failed to enable notifications');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  /**
   * Disable notifications
   */
  const disableNotifications = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await disableWebPushNotifications();
      setToken(null);
    } catch (err) {
      console.error('[usePushNotifications] Failed to disable:', err);
      setError('Failed to disable notifications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isSupported,
    permission,
    token,
    isLoading,
    error,
    enableNotifications,
    disableNotifications
  };
}

export default usePushNotifications;
