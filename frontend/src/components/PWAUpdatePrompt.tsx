/**
 * PWA Update Prompt Component - Story 9.14, Updated Story 14.42
 *
 * Displays a top banner notification when a new version of the app is available,
 * allowing users to update or dismiss.
 *
 * Story 14.42 Changes:
 * - Repositioned from bottom toast to top banner (below TopHeader)
 * - Added Spanish translations
 * - Added session-based dismiss logic (shows again on next session)
 * - Fixed update button to properly reload the app
 */

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, X, Check } from 'lucide-react';
import { usePWAUpdate } from '../hooks/usePWAUpdate';
import { TRANSLATIONS, type Language } from '../utils/translations';

/** Session storage key for dismiss state */
const DISMISS_KEY = 'pwa-update-dismissed-session';

/** Delay before reload to allow service worker activation (ms) */
const SW_ACTIVATION_DELAY_MS = 500;

interface PWAUpdatePromptProps {
  /** Current language setting */
  language?: Language;
}

/**
 * PWA Update Prompt - Shows when a new version is available
 *
 * Features:
 * - Top banner (below TopHeader) for high visibility
 * - Update and dismiss buttons with translations
 * - Session-based dismiss (shows again on next session)
 * - Forces page reload after service worker update
 * - Uses app theme colors
 */
export function PWAUpdatePrompt({ language = 'es' }: PWAUpdatePromptProps) {
  const { needRefresh, offlineReady, update, close } = usePWAUpdate();
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Check session storage for dismiss state on mount
  useEffect(() => {
    const wasDismissed = sessionStorage.getItem(DISMISS_KEY) === 'true';
    setDismissed(wasDismissed);
  }, []);

  // Get translations
  const t = TRANSLATIONS[language];

  /**
   * Handle dismiss - stores in session storage so banner shows again next session
   */
  const handleDismiss = useCallback(() => {
    sessionStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
    close();
  }, [close]);

  /**
   * Handle update - triggers service worker update and forces page reload
   * Story 14.42: Fixed to ensure page actually reloads after update
   */
  const handleUpdate = useCallback(() => {
    setUpdating(true);

    // Call the update function from usePWAUpdate
    update();

    // Wait a moment for service worker to activate, then force reload
    // The reload ensures the new service worker takes control
    setTimeout(() => {
      window.location.reload();
    }, SW_ACTIVATION_DELAY_MS);
  }, [update]);

  // Show nothing if:
  // - No update available and not newly offline-ready
  // - User dismissed during this session
  // - Currently updating
  if ((!needRefresh && !offlineReady) || dismissed) {
    return null;
  }

  // For offline-ready notification, use existing close behavior (no session storage)
  if (!needRefresh && offlineReady) {
    return (
      <div
        className="fixed top-16 left-0 right-0 z-50 px-4 pt-2"
        role="alert"
        aria-live="polite"
      >
        <div className="max-w-md mx-auto bg-[var(--success)] bg-opacity-10 border border-[var(--success)] rounded-lg shadow-lg p-3 flex items-center gap-3">
          <Check className="w-5 h-5 text-[var(--success)] flex-shrink-0" />
          <p className="flex-1 text-sm text-[var(--primary)]">
            {t.pwaOfflineReady}
          </p>
          <button
            onClick={close}
            className="p-1 rounded-md text-[var(--secondary)] hover:bg-[var(--bg)] transition-colors"
            aria-label={t.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Update available banner
  return (
    <div
      className="fixed top-16 left-0 right-0 z-50 px-4 pt-2"
      role="alert"
      aria-live="polite"
      data-testid="pwa-update-banner"
    >
      <div className="max-w-md mx-auto bg-[var(--accent)] bg-opacity-10 border border-[var(--accent)] rounded-lg shadow-lg p-4">
        {/* Header with icon */}
        <div className="flex items-start gap-3">
          <RefreshCw
            className={`w-5 h-5 text-[var(--accent)] flex-shrink-0 mt-0.5 ${
              updating ? 'animate-spin' : ''
            }`}
          />
          <div className="flex-1 min-w-0">
            {/* Title */}
            <p className="text-sm font-medium text-[var(--primary)]">
              {t.updateBannerTitle}
            </p>
            {/* Message */}
            <p className="text-sm text-[var(--secondary)] mt-1">
              {t.updateBannerMessage}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2 mt-3">
          <button
            onClick={handleDismiss}
            disabled={updating}
            className="px-3 py-1.5 text-sm font-medium rounded-md text-[var(--secondary)] hover:bg-[var(--bg)] transition-colors disabled:opacity-50"
            aria-label={t.updateLater}
          >
            {t.updateLater}
          </button>
          <button
            onClick={handleUpdate}
            disabled={updating}
            className="px-4 py-1.5 text-sm font-medium rounded-md bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            aria-label={t.updateNow}
          >
            {updating && <RefreshCw className="w-4 h-4 animate-spin" />}
            {t.updateNow}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PWAUpdatePrompt;
