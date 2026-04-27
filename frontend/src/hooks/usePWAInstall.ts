/**
 * PWA Install Hook - Story 9.14
 *
 * Hook for handling PWA installation prompt.
 * Captures the beforeinstallprompt event and provides install functionality.
 */

import { useState, useEffect, useCallback } from 'react';

// BeforeInstallPromptEvent is not in standard TypeScript DOM types
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface PWAInstallState {
  /** True when app can be installed (install prompt available) */
  canInstall: boolean;
  /** True when app is already installed (running in standalone mode) */
  isInstalled: boolean;
  /** True while install prompt is showing */
  isInstalling: boolean;
  /** Trigger the install prompt */
  install: () => Promise<boolean>;
}

/**
 * Hook for managing PWA installation.
 *
 * @returns PWAInstallState - Current install state and handlers
 *
 * @example
 * ```tsx
 * function InstallButton() {
 *   const { canInstall, isInstalled, install } = usePWAInstall();
 *
 *   if (isInstalled) {
 *     return <span>App is installed!</span>;
 *   }
 *
 *   if (!canInstall) {
 *     return null; // Install not available
 *   }
 *
 *   return <button onClick={install}>Install App</button>;
 * }
 * ```
 */
export function usePWAInstall(): PWAInstallState {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Check if app is already installed (running in standalone mode)
  useEffect(() => {
    // Check display-mode media query for standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    // Also check iOS-specific property
    const isIOSStandalone = (window.navigator as any).standalone === true;

    setIsInstalled(isStandalone || isIOSStandalone);

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Capture the beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67+ from showing mini-infobar
      e.preventDefault();
      // Store the event for later use
      setInstallPrompt(e as BeforeInstallPromptEvent);

      if (import.meta.env.DEV) {
        console.log('[PWA] Install prompt captured');
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Also listen for successful installation
    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);

      if (import.meta.env.DEV) {
        console.log('[PWA] App was installed');
      }
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (!installPrompt) {
      return false;
    }

    setIsInstalling(true);

    try {
      // Show the install prompt
      await installPrompt.prompt();

      // Wait for user choice
      const { outcome } = await installPrompt.userChoice;

      if (outcome === 'accepted') {
        setInstallPrompt(null);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[PWA] Install error:', error);
      return false;
    } finally {
      setIsInstalling(false);
    }
  }, [installPrompt]);

  return {
    canInstall: !!installPrompt && !isInstalled,
    isInstalled,
    isInstalling,
    install,
  };
}

export default usePWAInstall;
