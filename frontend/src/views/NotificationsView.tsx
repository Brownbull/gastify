/**
 * NotificationsView - Notifications/Alerts Panel
 *
 * Displays in-app notifications.
 * Matches InsightsView layout with ProfileAvatar and ProfileDropdown.
 */

import React, { useState, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';
import { ProfileDropdown, ProfileAvatar, getInitials } from '../components/ProfileDropdown';
import type { InAppNotificationClient } from '../types/notification';
import type { User } from 'firebase/auth';
import type { BatchResult } from '@/lib/firestoreBatch';

interface NotificationsViewProps {
  user: User | null;
  navigateToView: (view: string) => void;
  setView: (view: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  theme: string;
  lang: 'en' | 'es';
  inAppNotifications: InAppNotificationClient[];
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  deleteInAppNotification: (id: string) => Promise<void>;
  deleteAllInAppNotifications: () => Promise<BatchResult | undefined>;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  user,
  navigateToView,
  setView,
  t,
  theme,
  lang: _lang,
  inAppNotifications,
  markNotificationAsRead: _markNotificationAsRead,
  markAllNotificationsAsRead: _markAllNotificationsAsRead,
  deleteInAppNotification: _deleteInAppNotification,
  deleteAllInAppNotifications: _deleteAllInAppNotifications,
}) => {
  // Profile dropdown state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  // Get initials for avatar
  const initials = getInitials(user?.displayName || user?.email || '');

  // Handle profile menu navigation
  const handleProfileNavigate = (targetView: string) => {
    setIsProfileOpen(false);
    if (targetView === 'settings') {
      setView('settings');
    } else {
      navigateToView(targetView);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Fixed Header - matching InsightsView style */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center"
        style={{
          height: '72px',
          paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)',
          paddingLeft: '16px',
          paddingRight: '16px',
          backgroundColor: 'var(--bg)',
        }}
      >
        <div className="w-full flex items-center justify-between">
          {/* Left: Back button + Title */}
          <div className="flex items-center gap-0">
            <button
              onClick={() => navigateToView('dashboard')}
              className="min-w-10 min-h-10 flex items-center justify-center -ml-1"
              style={{ color: 'var(--text-primary)' }}
            >
              <ChevronLeft size={28} strokeWidth={2.5} />
            </button>
            <span
              className="font-semibold"
              style={{
                fontFamily: 'var(--font-family)',
                color: 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '20px',
              }}
            >
              {t('alerts')}
            </span>
          </div>

          {/* Right: Profile Avatar with Dropdown */}
          <div className="flex items-center justify-end min-w-[48px] relative">
            <ProfileAvatar
              ref={profileButtonRef}
              initials={initials}
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            />
            <ProfileDropdown
              isOpen={isProfileOpen}
              onClose={() => setIsProfileOpen(false)}
              userName={user?.displayName || ''}
              userEmail={user?.email || ''}
              onNavigate={handleProfileNavigate}
              theme={theme}
              t={t}
              triggerRef={profileButtonRef}
            />
          </div>
        </div>
      </header>

      {/* Content area with top padding for fixed header - full width, no side padding */}
      <div className="flex-1 pt-[72px] pb-24 overflow-y-auto">
        {/* Empty State - No notifications */}
        {inAppNotifications.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center min-h-[50vh]">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--bg-tertiary, #f1f5f9)' }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: 'var(--text-secondary, #64748b)' }}
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <h2
              className="text-lg font-semibold mb-2"
              style={{ color: 'var(--text-primary, #0f172a)' }}
            >
              {t('alerts')}
            </h2>
            <p
              className="text-sm"
              style={{ color: 'var(--text-secondary, #64748b)' }}
            >
              {t('noPendingInvitations')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsView;
