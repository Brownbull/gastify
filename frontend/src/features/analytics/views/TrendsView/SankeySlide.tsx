/**
 * SankeySlide - Sankey flow visualization slide for TrendsView carousel
 *
 * Story 15b-2m: Extracted from TrendsView.tsx
 *
 * Contains: selection title area (pill + amount), scrollable diagram container
 * with entrance animation, SankeyChart component.
 */

import React from 'react';
import { SankeyChart, type SankeySelectionData } from '@features/analytics/components/SankeyChart';
import type { SankeyMode } from '@features/analytics/utils/sankeyDataBuilder';
import type { ThemeName, ModeName } from '@/config/categoryColors';
import type { Transaction } from '@/types/transaction';
import { safeCSSColor, sanitizeLocale } from '@/utils/validation';

export interface SankeySlideProps {
    sankeySelectionData: SankeySelectionData | null;
    locale: string;
    sankeyAnimationKey: number;
    sankeyContentWidth: number;
    sankeyVisible: boolean;
    sankeyScrollableRef: React.RefObject<HTMLDivElement>;
    prefersReducedMotion: boolean;
    filteredTransactions: Transaction[];
    currency: string;
    sankeyMode: SankeyMode;
    theme: ThemeName;
    colorMode: ModeName;
    sankeySelectedNode: string | null;
    handleSankeySelectionChange: (
        nodeName: string | null,
        title: string | null,
        data?: SankeySelectionData | null,
    ) => void;
}

export const SankeySlide: React.FC<SankeySlideProps> = ({
    sankeySelectionData,
    locale,
    sankeyAnimationKey,
    sankeyContentWidth,
    sankeyVisible,
    sankeyScrollableRef,
    prefersReducedMotion,
    filteredTransactions,
    currency,
    sankeyMode,
    theme,
    colorMode,
    sankeySelectedNode,
    handleSankeySelectionChange,
}) => {
    const safeLocale = sanitizeLocale(locale);

    return (
        <div
            className="flex flex-col"
            data-testid="sankey-view"
        >
            {/* Story 14.13.3: Reserved title space - OUTSIDE scrollable area */}
            {/* FIXED HEIGHT (60px) prevents diagram from shifting when selection changes */}
            {/* Two-line layout: Line 1 = category pill with name (truncated), Line 2 = amount and percentage */}
            <div
                className="flex flex-col items-center justify-center px-2"
                style={{ height: '60px' }} // Fixed height for title area
                data-testid="sankey-title-area"
            >
                {sankeySelectionData ? (
                    <div className="flex flex-col items-center gap-0.5 transition-opacity duration-200 w-full max-w-full">
                        {/* Line 1: Category pill with emoji and name - truncate long names */}
                        <span
                            className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-sm font-semibold max-w-full"
                            style={{
                                backgroundColor: safeCSSColor(sankeySelectionData.color) + '20', // 20% opacity background
                                color: safeCSSColor(sankeySelectionData.color),
                            }}
                        >
                            {sankeySelectionData.isLink ? (
                                // For links: show source > target (parent > child hierarchy)
                                <>
                                    <span className="flex-shrink-0">{sankeySelectionData.sourceEmoji}</span>
                                    <span className="truncate max-w-[80px]">{sankeySelectionData.sourceName}</span>
                                    <span className="flex-shrink-0 mx-0.5">&gt;</span>
                                    <span className="flex-shrink-0">{sankeySelectionData.targetEmoji}</span>
                                    <span className="truncate max-w-[80px]">{sankeySelectionData.targetName}</span>
                                </>
                            ) : (
                                // For nodes: emoji + full name
                                <>
                                    <span className="flex-shrink-0">{sankeySelectionData.emoji}</span>
                                    <span className="truncate max-w-[180px]">{sankeySelectionData.displayName}</span>
                                </>
                            )}
                        </span>
                        {/* Line 2: Amount and percentage in category color - LARGER font */}
                        <span
                            className="text-sm font-semibold"
                            style={{ color: safeCSSColor(sankeySelectionData.color) }}
                        >
                            {sankeySelectionData.amountK} ({sankeySelectionData.percent})
                        </span>
                    </div>
                ) : (
                    <span
                        className="text-xs text-center opacity-50"
                        style={{ color: 'var(--text-tertiary)' }}
                    >
                        {safeLocale === 'es' ? 'Toca una categoría para ver detalles' : 'Tap a category to see details'}
                    </span>
                )}
            </div>

            {/* Story 14.13.3: Scrollable diagram container (clipped) with entrance animation */}
            {/* Navigation is via left/right buttons in top-right corner */}
            {/* Carousel swipe works normally on this area */}
            <div
                className="overflow-hidden"
                style={{ height: '340px' }} // Adjusted for two-line title (48px)
            >
                <div
                    ref={sankeyScrollableRef}
                    className="overflow-x-hidden overflow-y-hidden h-full"
                    style={{
                        scrollbarWidth: 'none', // Hide native scrollbar
                        msOverflowStyle: 'none', // IE/Edge
                    }}
                >
                    {/* Story 14.13.3: Animated container - fade in + scale up on view/mode change */}
                    <div
                        key={sankeyAnimationKey}
                        data-testid="sankey-animation-container"
                        style={{
                            minWidth: `${sankeyContentWidth}px`,
                            height: '100%',
                            opacity: sankeyVisible ? 1 : 0,
                            transform: sankeyVisible ? 'scale(1)' : 'scale(0.95)',
                            transition: prefersReducedMotion
                                ? 'none'
                                : 'opacity 400ms ease-out, transform 400ms ease-out',
                        }}
                    >
                        <SankeyChart
                            transactions={filteredTransactions}
                            currency={currency}
                            locale={safeLocale}
                            mode={sankeyMode}
                            theme={theme}
                            colorMode={colorMode}
                            height={340}
                            prefersReducedMotion={prefersReducedMotion}
                            // Story 14.13.3: Simplified view - native ECharts labels with emoji inside bars
                            useIconNodes={false}
                            // Story 14.13.3: Title managed externally (above chart, no layout shift)
                            showTitle={false}
                            // Story 14.13.3: Disable auto-reset, parent manages selection
                            titleResetTimeout={0}
                            // Story 14.13.3: Controlled selection for toggle behavior
                            selectedNode={sankeySelectedNode}
                            onSelectionChange={handleSankeySelectionChange}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
