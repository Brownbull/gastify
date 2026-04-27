/**
 * PersonalRecordBanner Component
 *
 * Story 14.19: Personal Records Detection
 * Story 14.37: Toast Notification Theme Integration
 * Epic 14: Core Implementation
 *
 * AC#3: PersonalRecordBanner component for displaying record achievements.
 *
 * Shows a celebratory banner when the user achieves a personal record
 * (e.g., "Lowest restaurant spending this week in 3 months!").
 *
 * Story 14.37 Updates:
 * - Uses CSS theme variables (--insight-celebration-bg, --insight-celebration-icon)
 * - Fixed trophy icon alignment
 * - Theme-aware text colors with proper contrast
 */

import React, { useEffect, useState } from 'react';
import { Trophy, X } from 'lucide-react';
import type { PersonalRecord } from '../../types/personalRecord';

/**
 * Props for PersonalRecordBanner component
 */
export interface PersonalRecordBannerProps {
    /** The record to display */
    record: PersonalRecord;
    /** Callback when banner is dismissed */
    onDismiss: () => void;
    /** Optional auto-dismiss delay in milliseconds (0 = no auto-dismiss) */
    autoDismissMs?: number;
    /** Whether to show entry animation */
    animate?: boolean;
    /** Theme for styling - follows app theme */
    theme?: 'light' | 'dark';
}

/**
 * PersonalRecordBanner displays a celebratory banner for record achievements.
 *
 * Features:
 * - Trophy icon with optional animation
 * - Record description text
 * - Dismiss button
 * - Auto-dismiss after configurable delay
 *
 * @example
 * ```tsx
 * <PersonalRecordBanner
 *   record={{
 *     id: '123',
 *     type: 'lowest_category_week',
 *     category: 'Restaurante',
 *     value: 5000,
 *     previousBest: 8000,
 *     achievedAt: new Date(),
 *     message: '¡Tu semana más baja en Restaurante en 3 meses!',
 *   }}
 *   onDismiss={() => setShowBanner(false)}
 *   autoDismissMs={8000}
 * />
 * ```
 */
export const PersonalRecordBanner: React.FC<PersonalRecordBannerProps> = ({
    record,
    onDismiss,
    autoDismissMs = 8000,
    animate = true,
    theme = 'light',
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const isDark = theme === 'dark';

    // Entry animation
    useEffect(() => {
        if (animate) {
            // Small delay for mount animation
            const timer = setTimeout(() => setIsVisible(true), 50);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(true);
        }
    }, [animate]);

    // Auto-dismiss
    useEffect(() => {
        if (autoDismissMs > 0) {
            const timer = setTimeout(() => {
                handleDismiss();
            }, autoDismissMs);
            return () => clearTimeout(timer);
        }
        // handleDismiss is intentionally omitted - we want stable dismiss behavior
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoDismissMs]);

    const handleDismiss = () => {
        setIsExiting(true);
        // Wait for exit animation
        setTimeout(() => {
            onDismiss();
        }, 300);
    };

    return (
        <div
            className={`
                fixed left-4 right-4 z-[60]
                rounded-2xl shadow-lg
                p-4
                flex items-center gap-3
                transform transition-all duration-300 ease-out
                border
                ${isVisible && !isExiting ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
            `}
            style={{
                // Position below the 72px header + safe area + small gap
                top: 'calc(72px + env(safe-area-inset-top, 0px) + 8px)',
                backgroundColor: 'var(--insight-celebration-bg)',
                borderColor: 'var(--border-light)',
            }}
            role="status"
            aria-live="polite"
        >
            {/* Trophy Icon - Story 14.37: Fixed alignment with explicit centering */}
            <div
                className="flex-shrink-0 rounded-full w-12 h-12 flex items-center justify-center"
                style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                }}
            >
                <Trophy
                    className="w-7 h-7 animate-bounce"
                    style={{ color: 'var(--insight-celebration-icon)' }}
                    strokeWidth={2.5}
                    aria-hidden="true"
                />
            </div>

            {/* Content - Story 14.37: Theme-aware text colors + font size scaling */}
            <div className="flex-1 min-w-0">
                <h3
                    className="font-bold"
                    style={{
                        color: 'var(--insight-celebration-icon)',
                        fontSize: 'var(--font-size-sm)',
                    }}
                >
                    ¡Récord Personal!
                </h3>
                <p
                    className="truncate"
                    style={{
                        color: 'var(--text-secondary)',
                        fontSize: 'var(--font-size-sm)',
                    }}
                >
                    {record.message}
                </p>
            </div>

            {/* Dismiss Button - Story 14.37: Theme-aware styling */}
            <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-2 rounded-full transition-colors hover:opacity-70"
                style={{ color: 'var(--insight-celebration-icon)' }}
                aria-label="Cerrar"
            >
                <X className="w-5 h-5" />
            </button>
        </div>
    );
};

/**
 * Compact variant of PersonalRecordBanner for inline display
 * (e.g., within a card or modal)
 *
 * Note: Uses CSS variables for theming, so no theme prop needed.
 * The parent container's CSS variable values determine the colors.
 */
export interface CompactRecordBannerProps {
    /** The record to display */
    record: PersonalRecord;
    /** Optional click handler */
    onClick?: () => void;
}

export const CompactRecordBanner: React.FC<CompactRecordBannerProps> = ({
    record,
    onClick,
}) => {
    return (
        <div
            className={`
                flex items-center gap-2 p-3
                rounded-lg
                ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
            `}
            style={{
                backgroundColor: 'var(--insight-celebration-bg)',
            }}
            onClick={onClick}
            role={onClick ? 'button' : 'status'}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={(e) => {
                if (onClick && (e.key === 'Enter' || e.key === ' ')) {
                    onClick();
                }
            }}
        >
            <Trophy
                className="w-5 h-5"
                style={{ color: 'var(--insight-celebration-icon)' }}
                aria-hidden="true"
            />
            <span
                className="font-medium"
                style={{
                    color: 'var(--insight-celebration-icon)',
                    fontSize: 'var(--font-size-sm)',
                }}
            >
                {record.message}
            </span>
        </div>
    );
};

export default PersonalRecordBanner;
