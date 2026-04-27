/**
 * DonutLegend — Legend rendering for DonutChart
 *
 * Story 15-TD-5: Extracted from DonutChart.tsx
 *
 * Renders the interactive category legend with drill-down chevrons,
 * count pills, percentage bars, and icon buttons.
 */
import React from 'react';
import { ChevronRight } from 'lucide-react';
import { getCategoryColorsAuto } from '@/config/categoryColors';
import {
    translateCategory,
    translateStoreCategoryGroup,
    translateItemCategoryGroup,
    getStoreCategoryGroupEmoji,
    getItemCategoryGroupEmoji,
    getItemCategoryEmoji,
} from '@/utils/categoryTranslations';
import { getCategoryEmoji } from '@/utils/categoryEmoji';
import type { CategoryData, DonutViewMode } from './types';
import { AnimatedAmountBar, AnimatedCountPill, AnimatedPercent } from './animationComponents';

interface DonutLegendProps {
    displayData: CategoryData[];
    selectedCategory: string | null;
    donutAnimationKey: number;
    viewMode: DonutViewMode;
    drillDownLevel: number;
    currency: string;
    locale: string;
    isDark: boolean;
    countMode: 'transactions' | 'items';
    maxPercent: number;
    maxDrillDownLevel: number;
    hasSubcategories: (name: string) => boolean;
    onSegmentClick: (name: string) => void;
    onDrillDown: (name: string) => void;
    onIconClick?: (categoryName: string, emoji: string, color: string) => void;
    onCountClick: (categoryName: string) => void;
}

export const DonutLegend: React.FC<DonutLegendProps> = ({
    displayData,
    selectedCategory,
    donutAnimationKey,
    viewMode,
    drillDownLevel,
    currency,
    locale,
    isDark,
    countMode,
    maxPercent,
    maxDrillDownLevel,
    hasSubcategories,
    onSegmentClick,
    onDrillDown,
    onIconClick,
    onCountClick,
}) => {
    // Determine what type of data we're showing based on viewMode and level
    const isShowingStoreGroups = viewMode === 'store-groups' && drillDownLevel === 0;
    const isShowingStoreCategories =
        (viewMode === 'store-categories' && drillDownLevel === 0) ||
        (viewMode === 'store-groups' && drillDownLevel === 1);
    const isShowingItemGroups =
        (viewMode === 'item-groups' && drillDownLevel === 0) ||
        (viewMode === 'store-categories' && drillDownLevel === 1) ||
        (viewMode === 'store-groups' && drillDownLevel === 2);
    const isShowingItemCategories =
        (viewMode === 'item-categories' && drillDownLevel === 0) ||
        (viewMode === 'store-categories' && drillDownLevel === 2) ||
        (viewMode === 'store-groups' && drillDownLevel === 3) ||
        (viewMode === 'item-groups' && drillDownLevel === 1);

    return (
        <div className="flex flex-col gap-1 px-1 flex-1 overflow-y-auto min-h-0">
            {displayData.map(cat => {
                const isSelected = selectedCategory === cat.name;
                const isMasGroup = cat.name === 'Más' || cat.name === 'More';

                // Get display name and emoji based on data type
                let displayName: string;
                let emoji: string;

                if (isMasGroup) {
                    displayName = locale === 'es' ? 'Más' : 'More';
                    emoji = '📁';
                } else if (isShowingStoreGroups) {
                    displayName = translateStoreCategoryGroup(cat.name, locale as 'en' | 'es');
                    emoji = getStoreCategoryGroupEmoji(cat.name);
                } else if (isShowingStoreCategories) {
                    displayName = translateCategory(cat.name, locale as 'en' | 'es');
                    emoji = getCategoryEmoji(cat.name);
                } else if (isShowingItemGroups) {
                    displayName = translateItemCategoryGroup(cat.name, locale as 'en' | 'es');
                    emoji = getItemCategoryGroupEmoji(cat.name);
                } else if (isShowingItemCategories) {
                    displayName = translateCategory(cat.name, locale as 'en' | 'es');
                    emoji = getItemCategoryEmoji(cat.name);
                } else {
                    displayName = cat.name;
                    emoji = '📄';
                }

                // Can drill down if not "Más" and not at max level
                let canDrillDownFurther = !isMasGroup && drillDownLevel < maxDrillDownLevel;
                if (canDrillDownFurther && isShowingItemCategories) {
                    canDrillDownFurther = hasSubcategories(cat.name);
                }

                const legendTextColor = getCategoryColorsAuto(cat.name).fg;

                return (
                    <div
                        key={cat.name}
                        className={`flex items-center gap-2 p-2 rounded-xl transition-all ${
                            isSelected
                                ? isDark ? 'bg-slate-600' : 'bg-slate-200'
                                : isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
                        }`}
                        data-testid={`legend-item-${cat.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                        {/* Icon button opens statistics popup */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (cat.name !== 'Más' && cat.name !== 'More') {
                                    onIconClick?.(cat.name, emoji, cat.fgColor);
                                } else {
                                    onSegmentClick(cat.name);
                                }
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 hover:scale-105 active:scale-95 transition-transform"
                            style={{ backgroundColor: cat.fgColor }}
                            aria-label={`${displayName} ${locale === 'es' ? 'estadísticas' : 'statistics'}`}
                        >
                            <span className="text-white drop-shadow-sm">
                                {emoji}
                            </span>
                        </button>

                        {/* Name and amount info */}
                        <div className="flex-1 flex flex-col items-start min-w-0">
                            <button
                                onClick={() => onSegmentClick(cat.name)}
                                className="text-sm font-medium truncate flex items-center gap-1 w-full text-left"
                                style={{ color: legendTextColor }}
                            >
                                {displayName}
                                {cat.categoryCount && (
                                    <span
                                        className="inline-flex items-center justify-center rounded-full text-xs"
                                        style={{
                                            backgroundColor: 'transparent',
                                            border: `1.5px solid ${legendTextColor}`,
                                            color: legendTextColor,
                                            fontSize: '10px',
                                            fontWeight: 600,
                                            minWidth: '18px',
                                            height: '18px',
                                            padding: '0 4px',
                                        }}
                                    >
                                        {cat.categoryCount}
                                    </span>
                                )}
                            </button>
                            <AnimatedAmountBar
                                value={cat.value}
                                percent={cat.percent}
                                animationKey={donutAnimationKey}
                                currency={currency}
                                legendTextColor={legendTextColor}
                                isDark={isDark}
                                maxPercent={maxPercent}
                                fgColor={cat.fgColor}
                            />
                        </div>

                        <AnimatedCountPill
                            count={cat.count}
                            itemCount={cat.itemCount ?? 0}
                            animationKey={donutAnimationKey}
                            countMode={countMode}
                            isDark={isDark}
                            locale={locale}
                            onCountClick={() => onCountClick(cat.name)}
                            categoryName={cat.name}
                        />

                        <AnimatedPercent
                            percent={cat.percent}
                            animationKey={donutAnimationKey}
                            legendTextColor={legendTextColor}
                        />

                        {/* Drill-down chevron */}
                        {canDrillDownFurther && (
                            <button
                                onClick={() => onDrillDown(cat.name)}
                                className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                                    isDark
                                        ? 'bg-slate-600 hover:bg-slate-500 text-slate-300'
                                        : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
                                }`}
                                aria-label={`Drill down into ${displayName}`}
                                data-testid={`drill-down-${cat.name.toLowerCase()}`}
                            >
                                <ChevronRight size={16} />
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
