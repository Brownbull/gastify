/**
 * Firebase Messaging Service Worker
 *
 * Story 9.18: Initial push notification setup
 * Story 14c.13: FCM Push Notifications for Shared Groups
 *
 * Handles background push notifications when the app is not in focus.
 * This service worker runs independently of the main app.
 *
 * NOTE: `frontend/` is the Storybook mockup harness — it mocks every Firebase
 * module (see src/__firebase-mocks__/) and never registers this worker, so the
 * config below is inert. The values are placeholders; the legacy boletapp-d609f
 * project config was removed in the gastify legacy-config cleanup. If this
 * harness is ever wired to a real Firebase project, inject the config at build
 * time rather than hardcoding it (Firebase web config is public, but it should
 * still come from env so it tracks the active project).
 */

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// Placeholder Firebase config — replace via build-time injection if this
// mockup harness is ever pointed at a real project (see note above).
firebase.initializeApp({
  apiKey: 'REPLACE_WITH_FIREBASE_WEB_API_KEY',
  authDomain: 'REPLACE_WITH_PROJECT.firebaseapp.com',
  projectId: 'REPLACE_WITH_PROJECT_ID',
  storageBucket: 'REPLACE_WITH_PROJECT.firebasestorage.app',
  messagingSenderId: 'REPLACE_WITH_MESSAGING_SENDER_ID',
  appId: 'REPLACE_WITH_WEB_APP_ID'
});

const messaging = firebase.messaging();

/**
 * Handle background messages (Task 2.3)
 *
 * Story 14c.13: Enhanced to support shared group notifications
 * Payload data structure:
 * - type: 'TRANSACTION_ADDED' | other
 * - groupId: SharedGroup document ID
 * - transactionId: Transaction document ID
 * - title: Notification title (e.g., "🏠 Casa")
 * - body: Notification body (e.g., "Partner added Walmart - $45.00")
 * - icon: Group icon emoji
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);

  // Extract data from payload
  const data = payload.data || {};

  // Story 14c.13: Use data fields for notification (Cloud Function sends data-only messages)
  const notificationTitle = data.title || payload.notification?.title || 'Gastify';
  const notificationBody = data.body || payload.notification?.body || '';

  // Task 2.4: Build notification options with group context
  const notificationOptions = {
    body: notificationBody,
    icon: payload.notification?.icon || '/pwa-192x192.png',
    badge: '/badge-72.png',
    // Task 2.5: Include notification data for click handling
    data: {
      type: data.type || 'NOTIFICATION',
      groupId: data.groupId || null,
      transactionId: data.transactionId || null,
      // Preserve all data for click handler
      ...data,
    },
    // Story 14c.13 AC8: Use tag to collapse same-group notifications
    tag: data.groupId ? `shared-group-${data.groupId}` : 'gastify-notification',
    // Renotify if same tag (update existing notification)
    renotify: !!data.groupId,
  };

  // Show the notification (Task 2.4)
  self.registration.showNotification(notificationTitle, notificationOptions);
});

/**
 * Handle notification click (Task 6)
 *
 * Story 14c.13 AC5: Deep link to shared group view when notification is clicked.
 * - Extract groupId from notification data
 * - Build deep link URL: /?view=group&groupId={groupId}
 * - Focus existing window or open new one
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);

  event.notification.close();

  // Task 6.2: Extract groupId from notification data
  const data = event.notification.data || {};
  const groupId = data.groupId;

  // Task 6.3: Build deep link URL
  const url = groupId
    ? `/?view=group&groupId=${groupId}`
    : '/';

  // Task 6.4 & 6.5: Open/focus app and navigate
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Task 6.5: Handle case where app is already open
      for (const client of windowClients) {
        // Check if this is our app
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          // Focus the existing window
          client.focus();
          // Navigate to the target URL if needed
          if (groupId && client.navigate) {
            return client.navigate(url);
          }
          return;
        }
      }

      // Task 6.4: Open new window if no existing window found
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
