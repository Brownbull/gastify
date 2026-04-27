/**
 * SankeyIconNode Component
 * Story 14.13.3 Phase 5: Icon node with progress-ring border for Sankey diagram
 *
 * Displays a category icon inside a circular node with a progress-ring border
 * that represents the percentage of total spending.
 *
 * The border is drawn as a conic gradient starting from 12 o'clock position:
 * - 100% = full circle
 * - 50% = half circle (12:00 to 6:00)
 * - 25% = quarter circle (12:00 to 3:00)
 */

import { memo, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface SankeyIconNodeProps {
    /** Category emoji to display */
    emoji: string;
    /** Percentage of total (0-100) for progress ring */
    percent: number;
    /** Background color for the node */
    color: string;
    /** Node size in pixels */
    size?: number;
    /** Click handler */
    onClick?: () => void;
    /** Whether the node is currently selected */
    isSelected?: boolean;
    /** Label to display below the node (optional) */
    label?: string;
    /** Test ID for testing */
    testId?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Darkens a hex color by a given factor.
 * @param hex - Hex color (with or without #)
 * @param factor - Darkening factor (0-1, where 1 = completely black)
 * @returns Darkened hex color
 */
function darkenColor(hex: string, factor: number): string {
    // Remove # if present
    const color = hex.replace('#', '');

    // Parse RGB components
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);

    // Darken each component
    const darkenedR = Math.round(r * (1 - factor));
    const darkenedG = Math.round(g * (1 - factor));
    const darkenedB = Math.round(b * (1 - factor));

    // Convert back to hex
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(darkenedR)}${toHex(darkenedG)}${toHex(darkenedB)}`;
}

/**
 * Lightens a hex color by a given factor.
 * @param hex - Hex color (with or without #)
 * @param factor - Lightening factor (0-1, where 1 = completely white)
 * @returns Lightened hex color
 */
function lightenColor(hex: string, factor: number): string {
    // Remove # if present
    const color = hex.replace('#', '');

    // Parse RGB components
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);

    // Lighten each component (blend towards white)
    const lightenedR = Math.round(r + (255 - r) * factor);
    const lightenedG = Math.round(g + (255 - g) * factor);
    const lightenedB = Math.round(b + (255 - b) * factor);

    // Convert back to hex
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(lightenedR)}${toHex(lightenedG)}${toHex(lightenedB)}`;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * SankeyIconNode - A circular icon node with progress-ring border.
 *
 * The progress ring uses a conic-gradient to show the percentage,
 * starting from the top (12 o'clock position) and going clockwise.
 *
 * Visual structure:
 * - Outer ring: Progress indicator (conic-gradient)
 * - Inner circle: Category color background with emoji
 */
export const SankeyIconNode = memo(function SankeyIconNode({
    emoji,
    percent,
    color,
    size = 32,
    onClick,
    isSelected = false,
    label,
    testId,
}: SankeyIconNodeProps) {
    // Calculate degrees for progress (0-360)
    // Clamp percent between 0 and 100
    const clampedPercent = Math.max(0, Math.min(100, percent));
    const degrees = (clampedPercent / 100) * 360;

    // Border width as percentage of size
    const borderWidth = Math.max(2, Math.round(size * 0.1));
    const innerSize = size - (borderWidth * 2);

    // Colors for the progress ring
    // Use darker version of category color for filled portion
    // Use lighter/transparent for unfilled portion
    const filledColor = darkenColor(color, 0.2);
    const unfilledColor = lightenColor(color, 0.6);

    // Selection ring
    const selectionRingSize = size + 6;

    const handleClick = useCallback(() => {
        onClick?.();
    }, [onClick]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
        }
    }, [onClick]);

    return (
        <div
            className="flex flex-col items-center gap-1"
            data-testid={testId}
        >
            {/* Selection ring (shown when selected) */}
            <div
                className="relative flex items-center justify-center"
                style={{
                    width: selectionRingSize,
                    height: selectionRingSize,
                }}
            >
                {/* Selection highlight */}
                {isSelected && (
                    <div
                        className="absolute rounded-full animate-pulse"
                        style={{
                            width: selectionRingSize,
                            height: selectionRingSize,
                            backgroundColor: `${color}33`, // 20% opacity
                            border: `2px solid ${color}`,
                        }}
                    />
                )}

                {/* Main node button */}
                <button
                    type="button"
                    onClick={handleClick}
                    onKeyDown={handleKeyDown}
                    className="relative rounded-full flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
                    style={{
                        width: size,
                        height: size,
                        // Progress ring using conic-gradient
                        // Starts from top (negative 90deg offset) and goes clockwise
                        background: `conic-gradient(
                            from -90deg,
                            ${filledColor} ${degrees}deg,
                            ${unfilledColor} ${degrees}deg
                        )`,
                    }}
                    aria-label={`${emoji} - ${clampedPercent.toFixed(1)}%`}
                    aria-pressed={isSelected}
                >
                    {/* Inner circle with category color */}
                    <div
                        className="rounded-full flex items-center justify-center"
                        style={{
                            width: innerSize,
                            height: innerSize,
                            backgroundColor: color,
                        }}
                    >
                        {/* Emoji */}
                        <span
                            className="leading-none select-none"
                            style={{
                                fontSize: Math.max(12, Math.round(innerSize * 0.55)),
                            }}
                            role="img"
                            aria-hidden="true"
                        >
                            {emoji}
                        </span>
                    </div>
                </button>
            </div>

            {/* Optional label below node */}
            {label && (
                <span
                    className="text-xs font-medium text-center truncate max-w-[60px]"
                    style={{ color: 'var(--text-secondary)' }}
                    title={label}
                >
                    {label}
                </span>
            )}
        </div>
    );
});

export default SankeyIconNode;
