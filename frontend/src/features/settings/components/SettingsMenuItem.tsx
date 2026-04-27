/**
 * SettingsMenuItem Component
 * Story 14.22: Reusable menu item for the hierarchical settings view
 * Story 14.37: Font size scaling support
 *
 * Displays an icon, title, subtitle, and chevron for navigation
 * Matches the design from settings.html mockup
 */

import React from 'react';
import {
    ChevronRight,
    CircleAlert,
    User,
    Users,
    Settings,
    Camera,
    CreditCard,
    BookOpen,
    Smartphone,
    Database,
    LogOut,
} from 'lucide-react';

export interface SettingsMenuItemProps {
    /** Translation key for the title */
    title: string;
    /** Translation key for the subtitle */
    subtitle: string;
    /** Lucide icon name - matches mockup settings.html */
    icon: 'circle-alert' | 'user' | 'users' | 'settings' | 'camera' | 'credit-card' | 'book-open' | 'smartphone' | 'database' | 'log-out';
    /** Background color for the icon container */
    iconBgColor: string;
    /** Icon stroke color */
    iconColor?: string;
    /** Click handler for navigation */
    onClick: () => void;
    /** Optional test ID */
    testId?: string;
}

// Map icon names to Lucide components (matching mockup settings.html)
const iconMap = {
    'circle-alert': CircleAlert,
    'user': User,
    'users': Users,
    'settings': Settings,
    'camera': Camera,
    'credit-card': CreditCard,
    'book-open': BookOpen,
    'smartphone': Smartphone,
    'database': Database,
    'log-out': LogOut,
};

export const SettingsMenuItem: React.FC<SettingsMenuItemProps> = ({
    title,
    subtitle,
    icon,
    iconBgColor,
    iconColor = '#ffffff',
    onClick,
    testId,
}) => {
    const IconComponent = iconMap[icon];

    return (
        <button
            onClick={onClick}
            data-testid={testId}
            className="w-full flex items-center gap-3 p-4 rounded-xl border transition-colors cursor-pointer"
            style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-light)',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
            }}
        >
            {/* Icon container */}
            <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: iconBgColor }}
            >
                <IconComponent size={20} color={iconColor} strokeWidth={2} />
            </div>

            {/* Title and subtitle - Story 14.37: Font size scaling */}
            <div className="flex-1 text-left">
                <div
                    className="font-semibold"
                    style={{
                        color: 'var(--text-primary)',
                        fontSize: 'var(--font-size-sm)',
                    }}
                >
                    {title}
                </div>
                <div
                    className="mt-0.5"
                    style={{
                        color: 'var(--text-secondary)',
                        fontSize: 'var(--font-size-xs)',
                    }}
                >
                    {subtitle}
                </div>
            </div>

            {/* Chevron */}
            <ChevronRight
                size={20}
                className="flex-shrink-0"
                style={{ color: 'var(--text-tertiary)' }}
            />
        </button>
    );
};
