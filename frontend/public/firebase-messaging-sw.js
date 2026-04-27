/**
 * Firebase Messaging Service Worker
 *
 * Story 9.18: Initial push notification setup
 * Story 14c.13: FCM Push Notifications for Shared Groups
 *
 * Handles background push notifications when the app is not in focus.
 * This service worker runs independently of the main app.
 *
 * Note: Firebase config values here are public (not secrets).
 * They identify the project but don't grant any special permissions.
 */

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// Firebase configuration (public values - safe to include)
firebase.initializeApp({
  apiKey: 'AIzaSyDoIgjggfVampyZysdeWTucVFurxnbCL1M',
  authDomain: 'boletapp-d609f.firebaseapp.com',
  projectId: 'boletapp-d609f',
  storageBucket: 'boletapp-d609f.firebasestorage.app',
  messagingSenderId: '171460588224',
  appId: '1:171460588224:web:69e7552f8fa95297603325'
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
