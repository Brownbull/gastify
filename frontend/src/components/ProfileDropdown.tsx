/**
 * ProfileDropdown Component
 *
 * Story 14.16: Shared profile dropdown menu used across all screens
 *
 * A reusable dropdown menu that displays user info and navigation options.
 * Used in TopHeader (home screens) and ReportsView header.
 *
 * Features:
 * - User name and email display
 * - Navigation to Transactions, Reports, Goals
 * - Settings link
 * - Click outside to close
 * - Escape key to close
 */

import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Receipt, FileText, Target, Settings, Package } from 'lucide-react';

export interface ProfileDropdownProps {
  /** Whether the dropdown is open */
  isOpen: boolean;
  /** Callback when dropdown should close */
  onClose: () => void;
  /** User display name */
  userName: string;
  /** User email address */
  userEmail: string;
  /** Navigation handler - called with view name */
  onNavigate: (view: string) => void;
  /** Current theme */
  theme: string;
  /** Translation function */
  t: (key: string) => string;
  /** Reference to the trigger button (for click outside detection) */
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

/**
 * ProfileDropdown - Shared dropdown menu component
 */
export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  isOpen,
  onClose,
  userName,
  userEmail,
  onNavigate,
  theme,
  t,
  triggerRef,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';
  const [position, setPosition] = useState({ top: 0, right: 0 });

  // Calculate position based on trigger button location
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4, // 4px gap below trigger
        right: window.innerWidth - rect.right, // Align to right edge of trigger
      });
    }
  }, [isOpen, triggerRef]);

  // Close on click outside (excluding the trigger button)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Don't close if clicking the trigger button (toggle handles that)
      if (triggerRef.current && triggerRef.current.contains(target)) {
        return;
      }
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose, triggerRef]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Menu items - consistent across all screens
  // Story 14.31: Added "items" menu item for Items History View
  const menuItems = [
    { key: 'transactions', icon: Receipt, label: t('purchases'), action: () => onNavigate('history') },
    { key: 'items', icon: Package, label: t('productos'), action: () => onNavigate('items') },
    { key: 'reports', icon: FileText, label: t('reports'), action: () => onNavigate('reports') },
    { key: 'goals', icon: Target, label: t('goals'), action: () => onNavigate('goals'), disabled: true, badge: t('comingSoon') },
  ];

  // Use portal to render outside header's stacking context
  return createPortal(
    <div
      ref={dropdownRef}
      data-testid="profile-dropdown"
      className="fixed z-[9999] min-w-[160px] rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2 duration-200"
      style={{
        top: `${position.top}px`,
        right: `${position.right}px`,
        backgroundColor: 'var(--bg-secondary, #ffffff)',
        border: `1px solid ${isDark ? 'var(--border-light, #334155)' : 'var(--border-light, #e2e8f0)'}`,
      }}
      role="menu"
      aria-orientation="vertical"
    >
      {/* User info header */}
      <div
        className="px-3.5 py-2.5 border-b mb-1"
        style={{ borderColor: isDark ? 'var(--border-light, #334155)' : 'var(--border-light, #e2e8f0)' }}
      >
        <div className="text-sm font-semibold" style={{ color: 'var(--text-primary, #0f172a)' }}>
          {userName || 'Usuario'}
        </div>
        <div className="text-xs" style={{ color: 'var(--text-tertiary, #94a3b8)' }}>
          {userEmail || ''}
        </div>
      </div>

      {/* Menu items */}
      {menuItems.map((item) => (
        <button
          key={item.key}
          onClick={() => {
            if (!item.disabled) {
              item.action();
              onClose();
            }
          }}
          disabled={item.disabled}
          className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors ${
            item.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/10'
          }`}
          role="menuitem"
          style={{ color: item.disabled ? 'var(--text-tertiary, #94a3b8)' : 'var(--text-primary, #0f172a)' }}
        >
          <item.icon
            size={18}
            strokeWidth={2}
            style={{ color: item.disabled ? 'var(--text-tertiary, #94a3b8)' : 'var(--text-secondary, #475569)' }}
          />
          <span className="text-sm font-medium flex-1">{item.label}</span>
          {item.badge && (
            <span className="text-xs" style={{ color: 'var(--text-tertiary, #94a3b8)' }}>
              {item.badge}
            </span>
          )}
        </button>
      ))}

      {/* Divider */}
      <div
        className="border-t mt-1 pt-1"
        style={{ borderColor: isDark ? 'var(--border-light, #334155)' : 'var(--border-light, #e2e8f0)' }}
      >
        {/* Settings */}
        <button
          onClick={() => {
            onNavigate('settings');
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          role="menuitem"
          style={{ color: 'var(--text-primary, #0f172a)' }}
        >
          <Settings size={18} strokeWidth={2} style={{ color: 'var(--text-secondary, #475569)' }} />
          <span className="text-sm font-medium">{t('settings')}</span>
        </button>
      </div>
    </div>,
    document.body
  );
};

/**
 * ProfileAvatar Component
 *
 * Circular avatar button with user initials that triggers the dropdown.
 */
export interface ProfileAvatarProps {
  /** User initials to display */
  initials: string;
  /** Click handler */
  onClick: () => void;
}

export const ProfileAvatar = React.forwardRef<HTMLButtonElement, ProfileAvatarProps>(
  ({ initials, onClick }, ref) => {
    return (
      <button
        ref={ref}
        data-testid="profile-avatar"
        onClick={onClick}
        className="flex items-center justify-center cursor-pointer p-0 bg-transparent border-none rounded-full transition-transform duration-200 hover:scale-105"
        style={{ width: '40px', height: '40px' }}
        aria-label="Open profile menu"
        aria-haspopup="true"
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: '40px',
            height: '40px',
            background: 'var(--primary, #2563eb)',
            border: '2px solid var(--border-light, #e2e8f0)',
          }}
        >
          <span
            className="text-white"
            style={{ fontSize: '14px', fontWeight: 600 }}
          >
            {initials}
          </span>
        </div>
      </button>
    );
  }
);
ProfileAvatar.displayName = 'ProfileAvatar';

/**
 * Get initials from a name (e.g., "Juan Díaz" -> "JD")
 */
export const getInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export default ProfileDropdown;
