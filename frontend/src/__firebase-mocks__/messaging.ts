// Shim for `firebase/messaging` — push notifications are no-ops in the mock.
import type { FirebaseApp } from './app';

export interface Messaging {
  app: FirebaseApp;
}

let cached: Messaging | null = null;

export function getMessaging(app?: FirebaseApp): Messaging {
  if (cached) return cached;
  cached = { app: app ?? ({ name: '[DEFAULT]', options: {}, automaticDataCollectionEnabled: false } as FirebaseApp) };
  return cached;
}

export function getToken(_messaging: Messaging, _options?: { vapidKey?: string }): Promise<string> {
  return Promise.resolve('mock-fcm-token');
}

export function deleteToken(_messaging: Messaging): Promise<boolean> {
  return Promise.resolve(true);
}

export function onMessage(_messaging: Messaging, _next: (payload: unknown) => void): () => void {
  return () => {};
}

export function isSupported(): Promise<boolean> {
  return Promise.resolve(false);
}
