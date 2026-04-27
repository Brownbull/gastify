/**
 * ExpandCollapseButtons - Floating expand/collapse buttons for treemap and trend views
 *
 * Story 15-TD-5b: Extracted from TrendsView.tsx
 *
 * Shows floating +/- buttons at the bottom center of a slide.
 * Used by both the treemap and tendencia slides for category grouping.
 */

import React from 'react';
import { Plus, Minus } from 'lucide-react';

export interface ExpandCollapseButtonsProps {
    canExpand: boolean;
    canCollapse: boolean;
    otroCount: number;
    expandedCount: number;
    onExpand: () => void;
    onCollapse: () => void;
    locale: string;
    /** Prefix for data-testid attributes (e.g., '' for treemap, 'trend-' for tendencia) */
    testIdPrefix?: string;
}

export const ExpandCollapseButtons: React.FC<ExpandCollapseButtonsProps> = ({
    canExpand,
    canCollapse,
    otroCount,
    expandedCount,
    onExpand,
    onCollapse,
    locale,
    testIdPrefix = '',
}) => {
    // Only show if there's something to expand or collapse
    if (!canExpand && !canCollapse) return null;

    return (
        <div
            className="absolute left-1/2 -translate-x-1/2 bottom-2 z-20 pointer-events-none"
        >
            <div className="flex flex-row gap-4 pointer-events-auto">
                {/* Plus button (expand) - on left */}
                {/* Story 14.13: More transparent buttons to reduce visual clutter */}
                <button
                    onClick={onExpand}
                    disabled={!canExpand}
                    className="relative w-10 h-10 rounded-full flex items-center justify-center transition-all backdrop-blur-md"
                    style={{
                        backgroundColor: 'color-mix(in srgb, var(--primary) 40%, transparent)',
                        color: 'white',
                        opacity: canExpand ? 1 : 0,
                        pointerEvents: canExpand ? 'auto' : 'none',
                    }}
                    aria-label={locale === 'es'
                        ? `Mostrar m\u00e1s (${otroCount} en ${testIdPrefix ? 'M\u00e1s' : 'Otro'})`
                        : `Show more (${otroCount} in ${testIdPrefix ? 'More' : 'Other'})`}
                    data-testid={`${testIdPrefix}expand-categories-btn`}
                >
                    <Plus size={18} strokeWidth={2.5} />
                    {/* Badge with count - bottom right, semi-transparent */}
                    <span
                        className="absolute -bottom-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-xs font-bold backdrop-blur-md"
                        style={{
                            backgroundColor: 'color-mix(in srgb, var(--primary) 30%, transparent)',
                            color: 'white',
                        }}
                    >
                        {otroCount}
                    </span>
                </button>
                {/* Minus button (collapse) - on right */}
                <button
                    onClick={onCollapse}
                    disabled={!canCollapse}
                    className="relative w-10 h-10 rounded-full flex items-center justify-center transition-all backdrop-blur-md"
                    style={{
                        backgroundColor: 'color-mix(in srgb, var(--primary) 40%, transparent)',
                        color: 'white',
                        opacity: canCollapse ? 1 : 0,
                        pointerEvents: canCollapse ? 'auto' : 'none',
                    }}
                    aria-label={locale === 'es' ? 'Mostrar menos categor\u00edas' : 'Show fewer categories'}
                    data-testid={`${testIdPrefix}collapse-categories-btn`}
                >
                    <Minus size={18} strokeWidth={2.5} />
                    {/* Badge with count - bottom right, semi-transparent */}
                    <span
                        className="absolute -bottom-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-xs font-bold backdrop-blur-md"
                        style={{
                            backgroundColor: 'color-mix(in srgb, var(--primary) 30%, transparent)',
                            color: 'white',
                        }}
                    >
                        {expandedCount}
                    </span>
                </button>
            </div>
        </div>
    );
};
