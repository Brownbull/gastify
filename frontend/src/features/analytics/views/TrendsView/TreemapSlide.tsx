/**
 * TreemapSlide - Treemap distribution slide for TrendsView carousel
 *
 * Story 15b-2m: Extracted from TrendsView.tsx
 *
 * Contains: view mode title, drill-down back button, squarified treemap layout
 * (IIFE preserved as-is), expand/collapse buttons.
 */

import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { calculateTreemapLayout, categoryDataToTreemapItems } from '@/utils/treemapLayout';
import { translateCategory } from '@/utils/categoryTranslations';
import { AnimatedTreemapCell } from './AnimatedTreemapCell';
import { ExpandCollapseButtons } from './ExpandCollapseButtons';
import { getDonutViewModeAtDrillLevel } from './navigationHelpers';
import type { CategoryData, DonutViewMode } from './types';

export interface TreemapSlideProps {
    isDark: boolean;
    locale: string;
    donutViewMode: DonutViewMode;
    treemapDrillDownLevel: 0 | 1 | 2 | 3;
    treemapDrillDownPath: string[];
    treemapDrillDownCategorized: {
        displayCategories: CategoryData[];
        otroCategories: CategoryData[];
        canExpand: boolean;
        canCollapse: boolean;
    };
    categoryData: CategoryData[];
    canExpand: boolean;
    canCollapse: boolean;
    otroCategories: CategoryData[];
    expandedCategoryCount: number;
    treemapDrillDownExpandedCount: number;
    setTreemapDrillDownExpandedCount: React.Dispatch<React.SetStateAction<number>>;
    setExpandedCategoryCount: React.Dispatch<React.SetStateAction<number>>;
    handleTreemapBack: () => void;
    handleTreemapCellDrillDown: (name: string) => void;
    handleTreemapTransactionCountClick: (name: string) => void;
    handleOpenStatsPopup: (categoryName: string, emoji: string, color: string) => void;
    currency: string;
    t: (key: string) => string;
    countMode: 'transactions' | 'items';
    animationKey: number;
}

export const TreemapSlide: React.FC<TreemapSlideProps> = ({
    isDark,
    locale,
    donutViewMode,
    treemapDrillDownLevel,
    treemapDrillDownPath,
    treemapDrillDownCategorized,
    categoryData,
    canExpand,
    canCollapse,
    otroCategories,
    expandedCategoryCount,
    treemapDrillDownExpandedCount,
    setTreemapDrillDownExpandedCount,
    setExpandedCategoryCount,
    handleTreemapBack,
    handleTreemapCellDrillDown,
    handleTreemapTransactionCountClick,
    handleOpenStatsPopup,
    currency,
    t,
    countMode,
    animationKey,
}) => {
    return (
        <div className="relative flex flex-col">
            {/* Story 14.13 Session 19: View mode title with back button immediately after - min-h-7 ensures button fits */}
            <div className="flex items-center justify-center min-h-7 mb-1 gap-1">
                <span
                    className={`text-xs font-semibold uppercase tracking-wider ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                    data-testid="treemap-viewmode-title"
                >
                    {/* Story 14.13 Session 18: Show drill-down path (translated) or base title */}
                    {treemapDrillDownLevel > 0
                        ? translateCategory(treemapDrillDownPath[treemapDrillDownPath.length - 1], locale as 'en' | 'es')
                        : (locale === 'es'
                            ? (donutViewMode === 'store-groups' ? 'Grupos de Compras'
                                : donutViewMode === 'store-categories' ? 'Categorías de Compras'
                                : donutViewMode === 'item-groups' ? 'Grupos de Productos'
                                : 'Categorías de Productos')
                            : (donutViewMode === 'store-groups' ? 'Purchase Groups'
                                : donutViewMode === 'store-categories' ? 'Purchase Categories'
                                : donutViewMode === 'item-groups' ? 'Product Groups'
                                : 'Product Categories'))
                    }
                </span>
                {/* Story 14.13 Session 19: Back button - immediately after title text */}
                {treemapDrillDownLevel > 0 && (
                    <button
                        onClick={handleTreemapBack}
                        className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                        style={{
                            backgroundColor: 'var(--primary)',
                            color: 'white',
                        }}
                        aria-label={locale === 'es' ? 'Volver' : 'Back'}
                        data-testid="treemap-back-btn"
                    >
                        <ChevronLeft size={16} />
                    </button>
                )}
            </div>
            {/* Story 14.13: Squarified treemap layout - cells sized proportionally */}
            {(() => {
                // Story 14.13 Session 17: Use drill-down data when in drill-down mode
                const displayData = treemapDrillDownLevel > 0
                    ? treemapDrillDownCategorized.displayCategories
                    : categoryData;

                // Convert display data to treemap items and calculate layout
                const treemapItems = categoryDataToTreemapItems(displayData);
                const layout = calculateTreemapLayout(treemapItems);

                // Find the largest cell (by area) to mark as main cell for styling
                const largestArea = Math.max(...layout.map(r => r.width * r.height));

                // Story 14.13: Predictable height based on category count
                // Use a step function that increases height at specific category thresholds
                // This prevents jumpy resizing when adding/removing categories
                const categoryCount = displayData.length;
                let dynamicHeight: number;
                if (categoryCount <= 4) {
                    dynamicHeight = 320; // Base height for up to 4 categories
                } else if (categoryCount <= 6) {
                    dynamicHeight = 400; // Medium height for 5-6 categories
                } else if (categoryCount <= 8) {
                    dynamicHeight = 480; // Taller for 7-8 categories
                } else if (categoryCount <= 10) {
                    dynamicHeight = 560; // Even taller for 9-10 categories
                } else {
                    dynamicHeight = 640; // Max height for 11+ categories
                }

                // Story 15-TD-5b: View mode at drill level extracted to navigationHelpers.ts
                const currentViewMode = getDonutViewModeAtDrillLevel(donutViewMode, treemapDrillDownLevel);

                return (
                    <div
                        className="relative"
                        style={{ height: `${dynamicHeight}px` }}
                        data-testid="treemap-grid"
                    >
                        {layout.map((rect, index) => {
                            // originalItem contains the full CategoryData since we passed it through categoryDataToTreemapItems
                            const cat = rect.originalItem as unknown as CategoryData;
                            const cellArea = rect.width * rect.height;
                            // Main cell = largest area (within 10% of max to handle ties)
                            const isMainCell = cellArea >= largestArea * 0.9;

                            return (
                                <AnimatedTreemapCell
                                    key={`${cat.name}-${animationKey}`}
                                    data={cat}
                                    isMainCell={isMainCell}
                                    onClick={() => handleTreemapCellDrillDown(cat.name)}
                                    currency={currency}
                                    animationKey={animationKey}
                                    locale={locale}
                                    t={t}
                                    viewMode={currentViewMode}
                                    onTransactionCountClick={handleTreemapTransactionCountClick}
                                    // Story 14.40: Open statistics popup on icon click
                                    onIconClick={handleOpenStatsPopup}
                                    // Story 14.13: Pass cell dimensions for compact layout detection
                                    cellWidthPercent={rect.width}
                                    cellHeightPercent={rect.height}
                                    // Story 14.13 Session 5: Icon based on countMode toggle
                                    // 'transactions' = Receipt icon, 'items' = Package icon
                                    iconType={countMode === 'items' ? 'package' : 'receipt'}
                                    // Story 14.13.3: Cell index for staggered entrance animation
                                    index={index}
                                    // Squarified layout uses absolute positioning
                                    style={{
                                        position: 'absolute',
                                        left: `${rect.x}%`,
                                        top: `${rect.y}%`,
                                        width: `calc(${rect.width}% - 4px)`,
                                        height: `calc(${rect.height}% - 4px)`,
                                        margin: '2px',
                                    }}
                                />
                            );
                        })}
                    </div>
                );
            })()}

            {/* Story 15-TD-5b: Extracted to ExpandCollapseButtons */}
            <ExpandCollapseButtons
                canExpand={treemapDrillDownLevel > 0 ? treemapDrillDownCategorized.canExpand : canExpand}
                canCollapse={treemapDrillDownLevel > 0 ? treemapDrillDownCategorized.canCollapse : canCollapse}
                otroCount={(treemapDrillDownLevel > 0 ? treemapDrillDownCategorized.otroCategories : otroCategories).length}
                expandedCount={treemapDrillDownLevel > 0 ? treemapDrillDownExpandedCount : expandedCategoryCount}
                onExpand={treemapDrillDownLevel > 0
                    ? () => setTreemapDrillDownExpandedCount(prev => prev + 1)
                    : () => setExpandedCategoryCount(prev => prev + 1)}
                onCollapse={treemapDrillDownLevel > 0
                    ? () => setTreemapDrillDownExpandedCount(prev => Math.max(0, prev - 1))
                    : () => setExpandedCategoryCount(prev => Math.max(0, prev - 1))}
                locale={locale}
            />
        </div>
    );
};
