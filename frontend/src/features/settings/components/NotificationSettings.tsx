/**
 * Notification Settings Component
 *
 * Story 9.18: Initial push notification settings
 * Story 14.22: Updated to match settings.html mockup design
 *
 * Settings UI for push notifications with toggle switches.
 * Shows permission status and enable/disable toggle.
 */

import { useState } from 'react';
import { Bell, Clock, Send, AlertCircle, Loader2 } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import type { Firestore } from 'firebase/firestore';

interface NotificationSettingsProps {
  t: (key: string) => string;
  theme: 'light' | 'dark';
  db: Firestore | null;
  userId: string | null;
  appId: string | null;
  /** Optional callback to show toast messages */
  onShowToast?: (message: string) => void;
}

/**
 * Toggle Switch Component - matches mockup .toggle-switch style exactly
 * Width: 48px, Height: 28px, Knob: 22px
 */
interface ToggleSwitchProps {
  enabled: boolean;
  onChange: () => void;
  disabled?: boolean;
  loading?: boolean;
}

function ToggleSwitch({ enabled, onChange, disabled = false, loading = false }: ToggleSwitchProps) {
  return (
    <button
      onClick={onChange}
      disabled={disabled || loading}
      className="relative transition-colors disabled:opacity-50 flex-shrink-0"
      style={{
        width: '48px',
        height: '28px',
        borderRadius: '14px',
        backgroundColor: enabled ? 'var(--primary)' : 'var(--bg-tertiary)',
        border: enabled ? 'none' : '1px solid var(--border-light)',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      role="switch"
      aria-checked={enabled}
    >
      {loading ? (
        <Loader2
          size={14}
          className="animate-spin absolute"
          style={{
            top: '7px',
            left: enabled ? 'auto' : '7px',
            right: enabled ? '7px' : 'auto',
            color: enabled ? 'white' : 'var(--text-secondary)',
          }}
        />
      ) : (
        <div
          className="absolute bg-white rounded-full transition-all"
          style={{
            width: '22px',
            height: '22px',
            top: enabled ? '3px' : '2px',
            left: enabled ? 'auto' : '3px',
            right: enabled ? '3px' : 'auto',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />
      )}
    </button>
  );
}

/**
 * Notification Settings - Push notifications with toggle switches
 * Renders separate cards for each notification type matching mockup design
 */
export function NotificationSettings({
  t,
  theme,
  db,
  userId,
  appId,
  onShowToast
}: NotificationSettingsProps) {
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [spendingRemindersEnabled, setSpendingRemindersEnabled] = useState(false);

  const {
    isSupported,
    permission,
    token,
    isLoading,
    error,
    enableNotifications,
    disableNotifications
  } = usePushNotifications({
    db,
    userId,
    appId,
    onNotificationReceived: (title, body) => {
      if (onShowToast) {
        onShowToast(`${title}: ${body}`);
      }
    }
  });

  const isDark = theme === 'dark';

  // Card styling matching mockup .settings-row with CSS variables
  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--surface)',
    borderRadius: '12px',
    padding: '14px 16px',
    border: '1px solid var(--border-light)',
  };

  // Don't render if notifications aren't supported
  if (!isSupported) {
    return null;
  }

  const isEnabled = permission === 'granted' && !!token;
  const isDenied = permission === 'denied';

  const handleTestNotification = async () => {
    setIsSendingTest(true);
    try {
      const uniqueTag = `gastify-test-${Date.now()}`;

      if ('serviceWorker' in navigator && Notification.permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(t('testNotificationTitle'), {
          body: t('testNotificationBody'),
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: uniqueTag
        } as NotificationOptions);
        if (onShowToast) {
          onShowToast(t('testNotificationSent'));
        }
      } else if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(t('testNotificationTitle'), {
          body: t('testNotificationBody'),
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: uniqueTag
        });
        if (onShowToast) {
          onShowToast(t('testNotificationSent'));
        }
      }
    } catch (err) {
      console.error('Failed to send test notification:', err);
      if (onShowToast) {
        onShowToast(t('testNotificationFailed'));
      }
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleToggle = async () => {
    if (isEnabled) {
      await disableNotifications();
      if (onShowToast) {
        onShowToast(t('notificationsDisabled'));
      }
    } else {
      const success = await enableNotifications();
      if (success && onShowToast) {
        onShowToast(t('notificationsEnabled'));
      }
    }
  };

  const handleSpendingRemindersToggle = () => {
    setSpendingRemindersEnabled(!spendingRemindersEnabled);
    if (onShowToast) {
      onShowToast(spendingRemindersEnabled ? t('spendingRemindersDisabled') : t('spendingRemindersEnabled'));
    }
  };

  return (
    <>
      {/* Push Notifications Card */}
      <div style={cardStyle}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <Bell
              size={20}
              strokeWidth={2}
              style={{ color: 'var(--text-secondary)' }}
            />
            <div>
              <span
                className="text-sm font-medium block"
                style={{ color: 'var(--text-primary)' }}
              >
                {t('pushNotifications')}
              </span>
              <span
                className="text-xs"
                style={{ color: 'var(--text-secondary)' }}
              >
                {isDenied
                  ? t('notificationsDeniedHint')
                  : t('notificationsHint')}
              </span>
            </div>
          </div>

          <ToggleSwitch
            enabled={isEnabled}
            onChange={handleToggle}
            disabled={isDenied}
            loading={isLoading}
          />
        </div>

        {/* Denied State Instructions */}
        {isDenied && (
          <div
            className="mt-3 p-3 rounded-lg text-xs"
            style={{
              backgroundColor: isDark ? 'rgba(251, 191, 36, 0.1)' : 'rgba(245, 158, 11, 0.08)',
              borderLeft: '3px solid #f59e0b',
            }}
          >
            <p className="font-medium mb-1" style={{ color: isDark ? '#fbbf24' : '#d97706' }}>
              {t('notificationsDeniedTitle')}
            </p>
            <p style={{ color: 'var(--text-secondary)' }}>
              {t('notificationsDeniedInstructions')}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            className="mt-3 flex items-center gap-2 p-3 rounded-lg text-xs"
            style={{
              backgroundColor: isDark ? 'rgba(248, 113, 113, 0.1)' : 'rgba(239, 68, 68, 0.08)',
              color: '#ef4444',
            }}
          >
            <AlertCircle size={16} />
            {error}
          </div>
        )}
      </div>

      {/* Spending Reminders Card */}
      <div style={cardStyle}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <Clock
              size={20}
              strokeWidth={2}
              style={{ color: 'var(--text-secondary)' }}
            />
            <div>
              <span
                className="text-sm font-medium block"
                style={{ color: 'var(--text-primary)' }}
              >
                {t('spendingReminders')}
              </span>
              <span
                className="text-xs"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('spendingRemindersHint')}
              </span>
            </div>
          </div>

          <ToggleSwitch
            enabled={spendingRemindersEnabled}
            onChange={handleSpendingRemindersToggle}
            disabled={!isEnabled}
          />
        </div>
      </div>

      {/* Test Notification Card - only shown when notifications are enabled */}
      {isEnabled && (
        <div style={cardStyle}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <Send
                size={20}
                strokeWidth={2}
                style={{ color: 'var(--text-secondary)' }}
              />
              <div>
                <span
                  className="text-sm font-medium block"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {t('testNotification')}
                </span>
                <span
                  className="text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {t('testNotificationHint')}
                </span>
              </div>
            </div>

            {/* Secondary Button - uses primary color for text */}
            <button
              onClick={handleTestNotification}
              disabled={isSendingTest}
              className="px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-light)',
                color: 'var(--primary)',
              }}
              aria-label={t('testNotification')}
            >
              {isSendingTest && <Loader2 size={14} className="animate-spin" />}
              {t('send')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default NotificationSettings;
