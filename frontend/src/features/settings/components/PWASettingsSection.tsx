/**
 * PWA Settings Section Component - Story 9.14
 * Story 14.22: Updated to match settings.html mockup design
 *
 * Displays PWA-related settings including Install and Update sections.
 * Shows manual install instructions when automatic install isn't available.
 */

import { useState } from 'react';
import { Smartphone, RefreshCw, Check, Download } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';

interface PWASettingsSectionProps {
  t: (key: string) => string;
  theme: 'light' | 'dark';
  /** Optional callback to show toast messages */
  onShowToast?: (message: string) => void;
}

// Detect browser and platform for install instructions
function getInstallInstructions(t: (key: string) => string): { steps: string[] } {
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isSamsung = /samsungbrowser/.test(ua);

  if (isIOS) {
    return {
      steps: [
        t('installStepIOSTapShare'),
        t('installStepIOSAddHome'),
      ],
    };
  } else if (isSamsung) {
    return {
      steps: [
        t('installStepMenuTap'),
        t('installStepSamsungAdd'),
      ],
    };
  } else {
    // Chrome Android/Desktop
    return {
      steps: [
        t('installStepMenuTap'),
        t('installStepChromeInstall'),
      ],
    };
  }
}

/**
 * PWA Settings Section - Install and Update for Settings view
 * Renders two separate cards matching mockup design
 */
export function PWASettingsSection({ t, theme, onShowToast }: PWASettingsSectionProps) {
  const { canInstall, isInstalled, isInstalling, install } = usePWAInstall();
  const { needRefresh, offlineReady, checking, update, checkForUpdates } = usePWAUpdate();

  // State for showing "up to date" feedback temporarily after check
  const [justChecked, setJustChecked] = useState(false);

  const isDark = theme === 'dark';

  // Card styling matching mockup .settings-row with CSS variables
  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--surface)',
    borderRadius: '12px',
    padding: '14px 16px',
    border: '1px solid var(--border-light)',
  };

  // Get platform-specific install instructions
  const installInstructions = getInstallInstructions(t);
  const showManualInstructions = !canInstall && !isInstalled;

  return (
    <>
      {/* App Installation Card */}
      <div style={cardStyle}>
        {/* Header with icon and title */}
        <div className="flex items-center gap-2.5 mb-2">
          <Smartphone
            size={20}
            strokeWidth={2}
            style={{ color: 'var(--text-secondary)' }}
          />
          <span
            className="text-sm font-medium"
            style={{ color: 'var(--text-primary)' }}
          >
            {t('installApp')}
          </span>
        </div>

        {/* Description */}
        <p
          className="text-xs mb-3"
          style={{ color: 'var(--text-secondary)' }}
        >
          {isInstalled
            ? t('appAlreadyInstalled')
            : t('installAppHint')}
        </p>

        {/* Manual Install Instructions Box - only when auto-install not available */}
        {showManualInstructions && (
          <div
            className="rounded-lg p-3 mb-3"
            style={{
              backgroundColor: isDark ? 'rgba(100, 116, 139, 0.1)' : 'var(--bg-tertiary)',
              borderLeft: '3px solid var(--primary)',
            }}
          >
            <p
              className="text-xs font-medium mb-1.5"
              style={{ color: 'var(--text-primary)' }}
            >
              {t('installManualTitle')}
            </p>
            <ol
              className="text-xs space-y-1 pl-4"
              style={{ color: 'var(--text-secondary)', listStyleType: 'decimal' }}
            >
              {installInstructions.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Install Button - full width, primary style using var(--primary) */}
        <button
          onClick={install}
          disabled={!canInstall || isInstalling || isInstalled}
          className="w-full py-3.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          style={{
            backgroundColor: isInstalled
              ? (isDark ? 'rgba(34, 197, 94, 0.2)' : 'var(--success-light)')
              : 'var(--primary)',
            color: isInstalled ? 'var(--success)' : 'white',
          }}
          aria-label={t('installApp')}
        >
          {isInstalled ? (
            <>
              <Check size={16} strokeWidth={2} />
              {t('installed')}
            </>
          ) : isInstalling ? (
            <>
              <Download size={16} strokeWidth={2} className="animate-bounce" />
              {t('installing')}
            </>
          ) : (
            <>
              <Download size={16} strokeWidth={2} />
              {t('installApp')}
            </>
          )}
        </button>
      </div>

      {/* Updates Card */}
      <div style={cardStyle}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <RefreshCw
              size={20}
              strokeWidth={2}
              style={{ color: 'var(--text-secondary)' }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {t('updateApp')}
                </span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-tertiary)',
                    fontFamily: 'monospace',
                  }}
                >
                  v{__APP_VERSION__}
                </span>
              </div>
              <span
                className="text-xs block"
                style={{ color: justChecked ? 'var(--success)' : 'var(--text-secondary)' }}
              >
                {checking
                  ? t('checkingForUpdates')
                  : needRefresh
                    ? t('updateAvailable')
                    : justChecked
                      ? t('noUpdatesFound')
                      : offlineReady
                        ? t('appUpToDate')
                        : t('tapToCheckUpdates')}
              </span>
            </div>
          </div>

          {/* Secondary Button - uses primary color for text */}
          {!needRefresh ? (
            <button
              onClick={async () => {
                setJustChecked(false);
                const foundUpdate = await checkForUpdates();
                if (!foundUpdate) {
                  setJustChecked(true);
                  if (onShowToast) {
                    onShowToast(t('noUpdatesFound'));
                  }
                  setTimeout(() => setJustChecked(false), 5000);
                }
              }}
              disabled={checking}
              className="px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-light)',
                color: 'var(--primary)',
              }}
              aria-label={t('checkUpdates')}
            >
              {checking && <RefreshCw size={14} className="animate-spin" />}
              {t('checkUpdates')}
            </button>
          ) : (
            <button
              onClick={update}
              className="px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
              style={{
                backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : 'var(--success-light)',
                color: 'var(--success)',
              }}
              aria-label={t('pwaUpdate')}
            >
              <Download size={14} />
              {t('pwaUpdate')}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export default PWASettingsSection;
