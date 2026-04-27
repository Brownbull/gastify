/**
 * Service Worker for Web Push Notifications
 *
 * Story 14c.13: VAPID-based web push for reliable Android notifications
 *
 * This service worker handles native push events (not Firebase FCM).
 * It receives push messages directly from the browser's push service
 * and displays notifications even when the app is closed.
 *
 * Key difference from firebase-messaging-sw.js:
 * - Uses native Push API (self.addEventListener('push'))
 * - Works reliably when app is closed on Android Chrome
 * - No Firebase SDK dependency for push
 */

const SW_VERSION = '1.0.0';

console.log(`[sw.js] Service Worker v${SW_VERSION} loaded`);

/**
 * Handle push events from the native Push API
 *
 * This is the key handler that receives web push messages.
 * The payload is a JSON string containing notification data.
 */
self.addEventListener('push', (event) => {
  console.log('[sw.js] Push event received');

  let notification = {
    title: 'Gastify',
    body: 'You have a new notification',
    icon: '/pwa-192x192.png',
    badge: '/badge-72.png',
    url: '/',
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[sw.js] Push payload:', payload);

      notification = {
        title: payload.title || notification.title,
        body: payload.body || notification.body,
        icon: payload.icon || notification.icon,
        badge: payload.badge || notification.badge,
        url: payload.url || notification.url,
        tag: payload.tag,
        data: payload.data || {},
      };
    } catch (e) {
      console.error('[sw.js] Failed to parse push payload:', e);
      notification.body = event.data.text();
    }
  }

  const options = {
    body: notification.body,
    icon: notification.icon,
    badge: notification.badge,
    tag: notification.tag || 'gastify-notification',
    data: {
      url: notification.url,
      ...notification.data,
    },
    vibrate: [200, 100, 200],
    requireInteraction: false,
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
self.addEventListener('notificationclick', (event) => {
  console.log('[sw.js] Notification clicked:', event);

  event.notification.close();

  const data = event.notification.data || {};
  const urlPath = data.url || '/';
  const urlToOpen = new URL(urlPath, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(async (windowClients) => {
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
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

/**
 * Handle messages from the main app
 */
self.addEventListener('message', (event) => {
  console.log('[sw.js] Message received:', event.data);

  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/**
 * Install event - activate immediately
 */
self.addEventListener('install', (event) => {
  console.log(`[sw.js] Installing v${SW_VERSION}`);
  // Skip waiting to activate immediately
  self.skipWaiting();
});

/**
 * Activate event - claim clients immediately
 */
self.addEventListener('activate', (event) => {
  console.log(`[sw.js] Activating v${SW_VERSION}`);
  // Claim all clients immediately
  event.waitUntil(clients.claim());
});
