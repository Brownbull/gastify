/**
 * Web Push Service (Client-side)
 *
 *
 * Uses the native Push API with VAPID keys for reliable
 * cross-browser push notification delivery, especially on Android Chrome.
 *
 * Benefits over FCM:
 * - Works when PWA is closed (browser handles push directly)
 * - More reliable on Chrome Android
 * - No Firebase dependency for push
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStorageString, setStorageString, removeStorageItem } from '@/utils/storage';

/**
 * VAPID public key for Web Push subscriptions
 *
 * Must match VAPID_PUBLIC_KEY in Cloud Functions .env
 * Note: VAPID public keys are designed to be public - they're included
 * in every push subscription request. Only the private key is secret.
 */
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

/**
 * Constants for web push management
 */
export const WEB_PUSH_CONSTANTS = {
  /** LocalStorage key for notification enabled state */
  LOCAL_STORAGE_KEY: 'web_push_enabled',
  /** LocalStorage key for subscription endpoint */
  LOCAL_STORAGE_ENDPOINT_KEY: 'web_push_endpoint',
} as const;

/**
 * Check if web push notifications are supported
 */
export function isWebPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get the current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

/**
 * Request permission to show notifications
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('[WebPush] Failed to request permission:', error);
    return 'denied';
  }
}

/**
 * Convert VAPID public key to Uint8Array for PushManager
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Subscribe to web push notifications
 *
 * @returns The subscription or null if failed
 */
export async function subscribeToWebPush(): Promise<PushSubscription | null> {
  if (!isWebPushSupported()) {
    console.warn('[WebPush] Push notifications not supported');
    return null;
  }

  if (!VAPID_PUBLIC_KEY) {
    console.error('[WebPush] VAPID public key not configured. Set VITE_VAPID_PUBLIC_KEY in .env');
    return null;
  }

  try {
    // Wait for VitePWA's service worker to be ready
    // The service worker is registered by VitePWA and includes our push handlers
    const registration = await navigator.serviceWorker.ready;
    console.log('[WebPush] Service worker ready');

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      console.log('[WebPush] New subscription created');
    } else {
      console.log('[WebPush] Using existing subscription');
    }

    return subscription;
  } catch (error) {
    console.error('[WebPush] Failed to subscribe:', error);
    return null;
  }
}

/**
 * Unsubscribe from web push notifications
 */
export async function unsubscribeFromWebPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return true;

    const success = await subscription.unsubscribe();
    console.log('[WebPush] Unsubscribed:', success);
    return success;
  } catch (error) {
    console.error('[WebPush] Failed to unsubscribe:', error);
    return false;
  }
}

/**
 * Save the subscription to the server (Firestore via Cloud Function)
 */
export async function saveSubscriptionToServer(
  subscription: PushSubscription
): Promise<boolean> {
  try {
    const functions = getFunctions();
    const saveWebPushSubscription = httpsCallable<
      { subscription: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent: string } },
      { success: boolean }
    >(functions, 'saveWebPushSubscription');

    const keys = subscription.toJSON().keys;
    if (!keys?.p256dh || !keys?.auth) {
      console.error('[WebPush] Subscription missing keys');
      return false;
    }

    const result = await saveWebPushSubscription({
      subscription: {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        userAgent: navigator.userAgent,
      },
    });

    console.log('[WebPush] Saved to server:', result.data.success);
    return result.data.success;
  } catch (error) {
    console.error('[WebPush] Failed to save to server:', error);
    return false;
  }
}

/**
 * Delete the subscription from the server
 */
export async function deleteSubscriptionFromServer(): Promise<boolean> {
  try {
    const functions = getFunctions();
    const deleteWebPushSubscription = httpsCallable<
      { endpoint?: string },
      { success: boolean; deletedCount: number }
    >(functions, 'deleteWebPushSubscription');

    const result = await deleteWebPushSubscription({});
    console.log('[WebPush] Deleted from server:', result.data.deletedCount);
    return result.data.success;
  } catch (error) {
    console.error('[WebPush] Failed to delete from server:', error);
    return false;
  }
}

/**
 * Enable web push notifications (full flow)
 *
 * 1. Request permission
 * 2. Subscribe to push
 * 3. Save subscription to server
 */
export async function enableWebPushNotifications(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isWebPushSupported()) {
    return { success: false, error: 'Push notifications not supported in this browser' };
  }

  // Request permission
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    return { success: false, error: 'Notification permission denied' };
  }

  // Subscribe to push
  const subscription = await subscribeToWebPush();
  if (!subscription) {
    return { success: false, error: 'Failed to create push subscription' };
  }

  // Save to server
  const saved = await saveSubscriptionToServer(subscription);
  if (!saved) {
    return { success: false, error: 'Failed to save subscription to server' };
  }

  // Store in localStorage
  setStorageString(WEB_PUSH_CONSTANTS.LOCAL_STORAGE_KEY, 'true');
  setStorageString(WEB_PUSH_CONSTANTS.LOCAL_STORAGE_ENDPOINT_KEY, subscription.endpoint);

  return { success: true };
}

/**
 * Disable web push notifications (full flow)
 *
 * 1. Unsubscribe from browser
 * 2. Delete from server
 */
export async function disableWebPushNotifications(): Promise<{
  success: boolean;
  error?: string;
}> {
  // Unsubscribe from browser
  await unsubscribeFromWebPush();

  // Delete from server
  await deleteSubscriptionFromServer();

  // Clear localStorage
  removeStorageItem(WEB_PUSH_CONSTANTS.LOCAL_STORAGE_KEY);
  removeStorageItem(WEB_PUSH_CONSTANTS.LOCAL_STORAGE_ENDPOINT_KEY);

  return { success: true };
}

/**
 * Check if web push is enabled in localStorage
 */
export function isWebPushEnabledLocal(): boolean {
  return getStorageString(WEB_PUSH_CONSTANTS.LOCAL_STORAGE_KEY, 'false') === 'true';
}
