/**
 * PWA Update Hook - Story 9.14
 *
 * Hook for detecting and handling PWA service worker updates.
 * Uses vite-plugin-pwa's useRegisterSW hook under the hood.
 *
 * Story 9.15+: Enhanced with manual check for updates functionality.
 */

import { useState, useCallback, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export interface PWAUpdateState {
  /** True when a new version is available */
  needRefresh: boolean;
  /** True when app can work offline (service worker registered) */
  offlineReady: boolean;
  /** True when actively checking for updates */
  checking: boolean;
  /** Dismiss the update notification */
  close: () => void;
  /** Update to the new version (activates waiting SW and reloads) */
  update: () => void;
  /** Manually check for updates */
  checkForUpdates: () => Promise<boolean>;
}

/**
 * Hook for managing PWA updates.
 *
 * @returns PWAUpdateState - Current update state and handlers
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { needRefresh, checking, update, checkForUpdates } = usePWAUpdate();
 *
 *   return (
 *     <div>
 *       <button onClick={checkForUpdates} disabled={checking}>
 *         {checking ? 'Checking...' : 'Check for Updates'}
 *       </button>
 *       {needRefresh && <button onClick={update}>Update Now</button>}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePWAUpdate(): PWAUpdateState {
  const [checking, setChecking] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      // Store registration for manual update checks
      registrationRef.current = registration || null;

      // Log successful registration in development
      if (import.meta.env.DEV) {
        console.log('[PWA] Service worker registered:', registration);
      }
    },
    onRegisterError(error) {
      console.error('[PWA] Service worker registration failed:', error);
    },
  });

  const close = () => {
    setNeedRefresh(false);
    setOfflineReady(false);
  };

  const update = () => {
    updateServiceWorker(true);
  };

  /**
   * Manually check for service worker updates.
   * Returns true if an update was found or applied.
   */
  const checkForUpdates = useCallback(async (): Promise<boolean> => {
    setChecking(true);

    try {
      // Get current registration or get it from navigator
      let registration = registrationRef.current;

      if (!registration && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        registration = reg ?? null;
        registrationRef.current = registration;
      }

      if (!registration) {
        console.log('[PWA] No service worker registration found');
        setChecking(false);
        return false;
      }

      // Check if there's already a waiting SW
      if (registration.waiting) {
        console.log('[PWA] Update already waiting, activating...');
        setNeedRefresh(true);
        setChecking(false);
        return true;
      }

      // Force check for updates
      console.log('[PWA] Checking for updates...');
      await registration.update();

      // Wait a moment for the update check to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if update was found
      if (registration.waiting) {
        console.log('[PWA] New version found and ready');
        setNeedRefresh(true);
        setChecking(false);
        return true;
      }

      // Check if installing
      if (registration.installing) {
        console.log('[PWA] New version installing...');

        // Wait for installation to complete
        return new Promise((resolve) => {
          const installing = registration!.installing!;

          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed') {
              console.log('[PWA] New version installed');
              setNeedRefresh(true);
              setChecking(false);
              resolve(true);
            } else if (installing.state === 'activated') {
              // SW was activated directly (autoUpdate behavior)
              console.log('[PWA] New version activated, reloading...');
              setChecking(false);
              window.location.reload();
              resolve(true);
            } else if (installing.state === 'redundant') {
              console.log('[PWA] Installation failed');
              setChecking(false);
              resolve(false);
            }
          });

          // Timeout after 30 seconds
          setTimeout(() => {
            setChecking(false);
            resolve(false);
          }, 30000);
        });
      }

      console.log('[PWA] App is up to date');
      setChecking(false);
      return false;

    } catch (error) {
      console.error('[PWA] Error checking for updates:', error);
      setChecking(false);
      return false;
    }
  }, [setNeedRefresh]);

  return {
    needRefresh,
    offlineReady,
    checking,
    close,
    update,
    checkForUpdates,
  };
}

export default usePWAUpdate;
