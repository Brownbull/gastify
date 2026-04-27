/**
 * Story 14.10: Top Header Bar Component
 *
 * A consistent top header bar across all views with:
 * - Home variant: Logo (left) | Wordmark (center) | Profile Avatar (right)
 * - Detail variant: Back button (left) | Title (center) | Empty (right)
 * - Settings variant: Back button (left) | "Configuración" (center) | Empty (right)
 *
 * Features:
 * - Fixed at top of screen (below status bar area)
 * - Safe area inset support for notch devices
 * - 44-48px height matching iOS/Android conventions
 * - 44px minimum touch targets for accessibility
 * - CSS variables for theming
 * - Profile dropdown menu with user info and navigation (shared component)
 */

import React, { useState, useRef } from 'react';
import { ArrowLeft, ChevronLeft } from 'lucide-react';
import { ProfileDropdown, ProfileAvatar, getInitials } from './ProfileDropdown';

export type HeaderVariant = 'home' | 'detail' | 'settings';

// View-specific titles for the home variant (when showing logo + title)
// Story 14.11: Added 'alerts' for the new alerts view
export type ViewTitle = 'home' | 'analytics' | 'history' | 'insights' | 'alerts' | 'gastify';

export interface TopHeaderProps {
    /**
     * Header variant determines layout:
     * - 'home': Logo (left) + Wordmark (center) + Profile Avatar (right)
     * - 'detail': Back button (left) + Title (center) + (empty right)
     * - 'settings': Back button (left) + "Configuración" (center) + (empty right)
     */
    variant: HeaderVariant;

    /**
     * View-specific title for home variant
     * When set, replaces the wordmark with the view title
     */
    viewTitle?: ViewTitle;

    /**
     * Custom title for detail variant
     */
    title?: string;

    /**
     * Story 14.22: Settings sub-view for breadcrumb display
     * When set, shows "Ajustes > SubviewName" breadcrumb style
     */
    settingsSubview?: string;

    /**
     * Back button handler (required for detail/settings variants)
     */
    onBack?: () => void;

    /**
     * Menu button handler - navigates to settings (home variant)
     */
    onMenuClick?: () => void;

    /**
     * General navigation handler for profile dropdown menu items
     * Called with view name: 'history', 'reports', 'goals', etc.
     */
    onNavigateToView?: (view: string) => void;

    /**
     * User display name for profile avatar (e.g., "Juan Díaz")
     */
    userName?: string;

    /**
     * User email for profile dropdown
     */
    userEmail?: string;

    /**
     * Theme for styling
     */
    theme: 'light' | 'dark' | string;

    /**
     * Translation function
     */
    t: (key: string) => string;

    /**
     */
    onLogoClick?: () => void;
}

/**
 * App Logo Component
 * Renders the "G" logo in a circle with theme-aware colors
 * Uses CSS variables so theme switching works automatically
 * Sized for mobile visibility: 36x36px circle
 */
interface AppLogoProps {
    theme: string;
}

const AppLogo: React.FC<AppLogoProps> = () => {
    return (
        <div
            data-testid="app-logo"
            className="g-logo-circle rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-300"
            style={{
                width: '36px',
                height: '36px',
                background: 'var(--primary, #2563eb)',
            }}
        >
            <span
                className="text-white font-bold"
                style={{
                    fontFamily: "var(--font-family-wordmark, 'Baloo 2', cursive)",
                    fontSize: '18px',
                }}
            >
                G
            </span>
        </div>
    );
};

/**
 * TopHeader Component
 */
export const TopHeader: React.FC<TopHeaderProps> = ({
    variant,
    viewTitle,
    title,
    settingsSubview,
    onBack,
    onMenuClick,
    onNavigateToView,
    userName = '',
    userEmail = '',
    theme,
    t,
    onLogoClick,
}) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileButtonRef = useRef<HTMLButtonElement>(null);

    // Determine the display title based on variant and viewTitle
    const getDisplayTitle = (): string => {
        if (variant === 'settings') {
            return t('settings');
        }
        if (variant === 'detail' && title) {
            return title;
        }
        if (variant === 'home' && viewTitle) {
            switch (viewTitle) {
                case 'analytics':
                    return t('analytics');
                case 'history':
                    // Story 14.14: Use "Transacciones" instead of "Historial"
                    return t('transactions');
                case 'insights':
                    return t('insights');
                case 'home':
                case 'gastify':
                default:
                    return 'Gastify';
            }
        }
        return 'Gastify';
    };

    // Should show the logo?
    const showLogo = variant === 'home';

    // Should show the back button?
    const showBackButton = variant === 'detail' || variant === 'settings';

    // Should show the profile avatar?
    // Story 14.22: Settings now shows profile avatar like home variant
    const showProfileAvatar = variant === 'home' || variant === 'settings';

    // Get title style based on whether it's the wordmark or a regular title
    const isWordmark = variant === 'home' && (!viewTitle || viewTitle === 'home' || viewTitle === 'gastify');

    // Handle profile navigation
    const handleProfileNavigate = (view: string) => {
        if (view === 'settings' && onMenuClick) {
            onMenuClick();
        } else if (onNavigateToView) {
            // Navigate to history, reports, goals, etc.
            onNavigateToView(view);
        }
    };

    const initials = getInitials(userName);

    return (
        <header
            className="fixed top-0 left-0 right-0 z-50 flex items-center"
            style={{
                // Increased height: 72px (was 56px) + safe area for better mobile visibility
                height: '72px',
                paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)',
                paddingLeft: '16px',
                paddingRight: '16px',
                backgroundColor: 'var(--bg)',
                // Story 14.12: No border per mockup - header blends with content background
            }}
        >
            {/* 3-column layout: Left | Center | Right */}
            <div className="w-full flex items-center justify-between">
                {/* Left side: Logo OR Back button (+ title for settings) */}
                {variant === 'settings' ? (
                    /* Story 14.22: Settings uses breadcrumb style header */
                    <div className="flex items-center gap-0">
                        <button
                            onClick={onBack}
                            className="min-w-10 min-h-10 flex items-center justify-center -ml-1"
                            aria-label="Go back"
                            data-testid="back-button"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            <ChevronLeft size={28} strokeWidth={2.5} />
                        </button>
                        <div className="flex flex-col">
                            <div className="flex items-center">
                                <span
                                    className="font-semibold"
                                    style={{
                                        fontFamily: 'var(--font-family)',
                                        color: settingsSubview ? 'var(--text-secondary)' : 'var(--text-primary)',
                                        fontWeight: 700,
                                        fontSize: '20px',
                                    }}
                                >
                                    {t('settings')}
                                </span>
                                {settingsSubview && (
                                    <>
                                        <ChevronLeft
                                            size={20}
                                            strokeWidth={2}
                                            className="mx-1 rotate-180"
                                            style={{ color: 'var(--text-tertiary)' }}
                                        />
                                        <span
                                            className="font-semibold"
                                            style={{
                                                fontFamily: 'var(--font-family)',
                                                color: 'var(--text-primary)',
                                                fontWeight: 700,
                                                fontSize: '20px',
                                            }}
                                        >
                                            {settingsSubview}
                                        </span>
                                    </>
                                )}
                            </div>
                            {/* Show version subtitle on all settings screens */}
                            <span
                                className="text-xs"
                                style={{
                                    color: 'var(--text-tertiary)',
                                    fontFamily: 'var(--font-family)',
                                    fontWeight: 400,
                                    letterSpacing: '0.02em',
                                    lineHeight: 1,
                                }}
                            >
                                v{__APP_VERSION__}
                            </span>
                        </div>
                    </div>
                ) : (
                    /* Other variants: Logo or back button in left column */
                    <div className="flex items-center min-w-[48px] relative">
                        {showBackButton && onBack && (
                            <button
                                onClick={onBack}
                                className="min-w-12 min-h-12 flex items-center justify-center -ml-2"
                                aria-label="Go back"
                                style={{ color: 'var(--text-secondary, #475569)' }}
                            >
                                <ArrowLeft size={28} strokeWidth={2} />
                            </button>
                        )}

                        {showLogo && (
                            onLogoClick ? (
                                <button
                                    data-testid="app-logo-button"
                                    onClick={onLogoClick}
                                    className="flex items-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
                                    aria-label="Switch view mode"
                                    aria-haspopup="true"
                                >
                                    <AppLogo theme={theme} />
                                </button>
                            ) : (
                                <AppLogo theme={theme} />
                            )
                        )}
                    </div>
                )}

                {/* Center: Title/Wordmark (not for settings - title is in left section) */}
                {variant !== 'settings' && (
                    <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center">
                        <span
                            className="font-semibold"
                            style={{
                                fontFamily: isWordmark ? "var(--font-family-wordmark, 'Baloo 2', cursive)" : 'var(--font-family)',
                                color: 'var(--text-primary, #0f172a)',
                                fontWeight: 700,
                                fontSize: isWordmark ? '28px' : '20px',
                            }}
                        >
                            {getDisplayTitle()}
                        </span>
                    </div>
                )}

                {/* Right side: Profile Avatar OR empty placeholder */}
                <div className="flex items-center justify-end min-w-[48px] relative">
                    {showProfileAvatar && (
                        <>
                            <ProfileAvatar
                                ref={profileButtonRef}
                                initials={initials}
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                            />
                            <ProfileDropdown
                                isOpen={isProfileOpen}
                                onClose={() => setIsProfileOpen(false)}
                                userName={userName}
                                userEmail={userEmail}
                                onNavigate={handleProfileNavigate}
                                theme={theme}
                                t={t}
                                triggerRef={profileButtonRef}
                            />
                        </>
                    )}

                    {/* Empty placeholder for detail/settings to maintain layout */}
                    {!showProfileAvatar && <div className="w-10" />}
                </div>
            </div>
        </header>
    );
};

export default TopHeader;
