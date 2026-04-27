/**
 * SettingsBackHeader Component
 * Story 14.22: Back navigation header for settings sub-views
 *
 * Displays a back arrow and title for consistent sub-view navigation
 * Matches the design from settings.html mockup (.back-header class)
 */

import React from 'react';
import { ArrowLeft } from 'lucide-react';

export interface SettingsBackHeaderProps {
    /** Title displayed next to the back arrow */
    title: string;
    /** Click handler for back navigation */
    onBack: () => void;
    /** Optional test ID */
    testId?: string;
}

export const SettingsBackHeader: React.FC<SettingsBackHeaderProps> = ({
    title,
    onBack,
    testId,
}) => {
    return (
        <div className="flex items-center gap-2 mb-4">
            <button
                onClick={onBack}
                data-testid={testId || 'settings-back-button'}
                className="p-1 rounded-md transition-colors flex items-center justify-center flex-shrink-0"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                }}
                aria-label="Back to settings menu"
            >
                <ArrowLeft size={24} strokeWidth={2} />
            </button>
            <h2
                className="text-xl font-bold leading-none"
                style={{ color: 'var(--text-primary)' }}
            >
                {title}
            </h2>
        </div>
    );
};
