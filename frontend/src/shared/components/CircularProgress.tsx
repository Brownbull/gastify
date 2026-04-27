/**
 * Shared CircularProgress component
 *
 * Story 15-TD-6: Unified from TrendsView/animationComponents.tsx
 * and DashboardView/AnimatedTreemapCard.tsx versions.
 *
 * Circular progress ring with animated percentage text.
 * Used by treemap cells across TrendsView and DashboardView.
 */

import React from 'react';

export interface CircularProgressProps {
    animatedPercent: number;
    size: number;
    strokeWidth: number;
    /** Foreground color for stroke and text (defaults to white) */
    fgColor?: string;
    /** Override for percentage text size (defaults to proportional: size * 0.38) */
    fontSize?: number;
    /** Opacity of the background ring (defaults to 0.3) */
    bgRingOpacity?: number;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
    animatedPercent,
    size,
    strokeWidth,
    fgColor = 'white',
    fontSize,
    bgRingOpacity = 0.3,
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (animatedPercent / 100) * circumference;
    const textSize = fontSize ?? Math.round(size * 0.38);

    return (
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={fgColor}
                    strokeOpacity={bgRingOpacity}
                    strokeWidth={strokeWidth}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={fgColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    style={{ transition: 'stroke-dashoffset 0.05s ease-out' }}
                />
            </svg>
            <span
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: `${textSize}px`,
                    fontWeight: 600,
                    color: fgColor,
                    lineHeight: 1,
                }}
            >
                {animatedPercent}%
            </span>
        </div>
    );
};
