/**
 * Custom Service Worker with Web Push Support
 *
 *
 * This service worker:
 * 1. Handles native push events for web push notifications
 * 2. Integrates with VitePWA's workbox for precaching (via injectManifest)
 *
 * The push handler receives messages directly from the browser's push service
 * and displays notifications even when the app is closed.
 */

/// <reference lib="webworker" />

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

const SW_VERSION = '1.1.0';

console.log(`[sw] Service Worker v${SW_VERSION} loaded`);

// ============================================================================
// Workbox PWA Setup (injected by VitePWA)
// ============================================================================

// Take control immediately
self.skipWaiting();
clientsClaim();

// Clean up old caches
cleanupOutdatedCaches();

// Precache static assets (manifest injected by VitePWA)
precacheAndRoute(self.__WB_MANIFEST);

// ============================================================================
// Web Push Notification Handlers
// ============================================================================

interface PushNotificationPayload {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

/**
 * Handle push events from the native Push API
 *
 * This is the key handler that receives web push messages.
 * The payload is a JSON string containing notification data.
 */
self.addEventListener('push', (event: PushEvent) => {
  console.log('[sw] Push event received');

  let notification = {
    title: 'Gastify',
    body: 'You have a new notification',
    icon: '/pwa-192x192.png',
    badge: '/badge-72.png',
    url: '/',
    tag: 'gastify-notification',
    data: {} as Record<string, unknown>,
  };

  if (event.data) {
    try {
      const payload: PushNotificationPayload = event.data.json();
      console.log('[sw] Push payload:', payload);

      notification = {
        title: payload.title || notification.title,
        body: payload.body || notification.body,
        icon: payload.icon || notification.icon,
        badge: payload.badge || notification.badge,
        url: payload.url || notification.url,
        tag: payload.tag || notification.tag,
        data: payload.data || {},
      };
    } catch (e) {
      console.error('[sw] Failed to parse push payload:', e);
      notification.body = event.data.text();
    }
  }

  const options: NotificationOptions = {
    body: notification.body,
    icon: notification.icon,
    badge: notification.badge,
    tag: notification.tag,
    data: {
      url: notification.url,
      ...notification.data,
    },
    // Note: vibrate is not in NotificationOptions type but is supported
    // requireInteraction: false, // Default is false
  };

  // CRITICAL: Use self.registration.showNotification()
  // This works even when the app is closed on Android
  event.waitUntil(
    self.registration.showNotification(notification.title, options)
  );
});

/**
 * Handle notification click
 *
 * Opens the app and navigates to the relevant page based on notification data.
 */
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  console.log('[sw] Notification clicked:', event);

  event.notification.close();

  const data = (event.notification.data || {}) as { url?: string };
  const urlPath = data.url || '/';
  const urlToOpen = new URL(urlPath, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(async (windowClients: readonly WindowClient[]) => {
        // Find existing window at our origin
        for (const client of windowClients) {
          if (new URL(client.url).origin === self.location.origin) {
            if ('focus' in client) await client.focus();

            // Use postMessage for navigation (more reliable than navigate())
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              url: urlPath,
              data: data,
            });
            return;
          }
        }

        // No existing window, open new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

/**
 * Handle messages from the main app
 */
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  console.log('[sw] Message received:', event.data);

  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
