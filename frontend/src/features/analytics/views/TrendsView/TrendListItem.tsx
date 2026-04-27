// Story 15-5b: Extracted from TrendsView.tsx
import React, { useMemo } from 'react';
import { ChevronRight, Receipt, Package } from 'lucide-react';
import { getCategoryColorsAuto, getCategoryPillColors, type StoreCategoryGroup, type ItemCategoryGroup } from '@/config/categoryColors';
import { getCategoryEmoji } from '@/utils/categoryEmoji';
import { translateCategory, translateStoreCategoryGroup, translateItemCategoryGroup, getStoreCategoryGroupEmoji, getItemCategoryGroupEmoji, getItemCategoryEmoji } from '@/utils/categoryTranslations';
import type { TrendData, DonutViewMode } from './types';
import { formatShortCurrency } from './helpers';

/**
 * Story 14.13.2: Trend list item component - redesigned layout
 *
 * Card-based layout matching mockup (analytics-polygon.html):
 * [Icon] Name + count | [~~~sparkline~~~] | Amount + Change % (stacked) | Chevron
 *
 * Features:
 * - Card container with background, shadow, rounded corners
 * - Vibrant icon background using getCategoryPillColors (like donut chart)
 * - Sparkline color matches change direction (green=down/good, red=up/bad)
 * - Amount and change percentage stacked vertically
 * - Drill-down chevron icon on the right
 *
 * Change indicator colors (AC #3):
 * - up (spent more): Red with ↑ arrow (spending increase = bad)
 * - down (spent less): Green with ↓ arrow (spending decrease = good)
 * - same (no change): Gray with "= 0%"
 * - new (no previous data): Blue "nuevo" badge
 */
export const TrendListItem: React.FC<{
    data: TrendData;
    onClick: () => void;
    onCountClick?: () => void; // Story 14.13.2: Clickable count pill like donut chart
    onIconClick?: (categoryName: string, emoji: string, color: string) => void; // Story 14.40: Open statistics popup
    currency: string;
    theme: 'light' | 'dark';
    locale: string;
    viewMode?: DonutViewMode; // Story 14.14b Session 5: View mode for correct translation
    countMode?: 'transactions' | 'items'; // Story 14.13.2: Count mode for pill icon
    animationIndex?: number; // Story 14.13.3: Index for staggered animation (used by parent for key)
    isVisible?: boolean; // Story 14.13.3: Whether item should be visible (animated in)
    showDrillDown?: boolean; // Story 14.13.3: Whether to show drill-down chevron
}> = ({ data, onClick, onCountClick, onIconClick, currency, theme, locale, viewMode = 'store-categories', countMode = 'transactions', animationIndex: _animationIndex, isVisible = true, showDrillDown = true }) => {
    const isDark = theme === 'dark';

    // Story 14.13.2: Determine change direction and style
    const changeDirection = data.changeDirection ?? (data.change >= 0 ? 'up' : 'down');

    // Story 14.13.2: Get semantic color for sparkline based on change direction
    const sparklineColor = useMemo(() => {
        switch (changeDirection) {
            case 'up':
                return 'var(--negative-primary, #ef4444)'; // Red for spending increase (bad)
            case 'down':
                return 'var(--positive-primary, #22c55e)'; // Green for spending decrease (good)
            case 'same':
            case 'new':
            default:
                return 'var(--text-tertiary, #6b7280)'; // Gray for neutral/new
        }
    }, [changeDirection]);

    // Story 14.13.2: Get vibrant icon background colors using getCategoryPillColors
    const iconColors = useMemo(() => {
        // "Más" = aggregated small categories group - use neutral colors
        if (data.name === 'Más' || data.name === 'More') {
            return {
                bg: isDark ? 'var(--bg-tertiary, #334155)' : 'var(--bg-tertiary, #f1f5f9)',
                fg: 'var(--text-secondary)',
            };
        }
        // Use the same color system as donut chart for vibrant backgrounds
        return getCategoryPillColors(data.name);
    }, [data.name, isDark]);

    // Story 14.14b Session 5: Get emoji based on view mode
    const emoji = useMemo(() => {
        // "Más" = aggregated small categories group
        if (data.name === 'Más' || data.name === 'More') {
            return '📁';
        }
        switch (viewMode) {
            case 'store-groups':
                return getStoreCategoryGroupEmoji(data.name as StoreCategoryGroup);
            case 'item-groups':
                return getItemCategoryGroupEmoji(data.name as ItemCategoryGroup);
            case 'item-categories':
                return getItemCategoryEmoji(data.name);
            case 'store-categories':
            default:
                return getCategoryEmoji(data.name);
        }
    }, [data.name, viewMode]);

    // Story 14.14b Session 5: Translate name based on view mode
    const displayName = useMemo(() => {
        // "Más" = aggregated small categories group
        if (data.name === 'Más' || data.name === 'More') {
            return locale === 'es' ? 'Más' : 'More';
        }
        switch (viewMode) {
            case 'store-groups':
                return translateStoreCategoryGroup(data.name as StoreCategoryGroup, locale as 'en' | 'es');
            case 'item-groups':
                return translateItemCategoryGroup(data.name as ItemCategoryGroup, locale as 'en' | 'es');
            case 'store-categories':
            case 'item-categories':
            default:
                return translateCategory(data.name, locale as 'en' | 'es');
        }
    }, [data.name, viewMode, locale]);

    // Story 14.13.2: Get text color respecting fontColorMode setting (like donut chart legend)
    const textColor = useMemo(() => {
        // "Más" = aggregated small categories group - use default text color
        if (data.name === 'Más' || data.name === 'More') {
            return 'var(--text-primary)';
        }
        return getCategoryColorsAuto(data.name).fg;
    }, [data.name]);

    // Story 14.13.2: Render change indicator based on direction (AC #3)
    const renderChangeIndicator = () => {
        const changeValue = Math.abs(data.change);

        switch (changeDirection) {
            case 'new':
                // New category: blue "nuevo" badge
                return (
                    <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{
                            backgroundColor: 'var(--info-bg, #eff6ff)',
                            color: 'var(--info-primary, #3b82f6)',
                        }}
                        data-testid="change-badge-new"
                    >
                        {locale === 'es' ? 'nuevo' : 'new'}
                    </span>
                );
            case 'same':
                // No change: gray "= 0%"
                return (
                    <span
                        className="text-xs font-semibold flex items-center gap-0.5"
                        style={{ color: 'var(--text-tertiary, #6b7280)' }}
                        data-testid="change-badge-same"
                    >
                        <span>=</span>
                        <span>0%</span>
                    </span>
                );
            case 'up':
                // Spent more: red with ↑ (bad)
                return (
                    <span
                        className="text-xs font-semibold flex items-center gap-0.5"
                        style={{ color: 'var(--negative-primary, #ef4444)' }}
                        data-testid="change-badge-up"
                    >
                        <span>↑</span>
                        <span>{changeValue}%</span>
                    </span>
                );
            case 'down':
                // Spent less: green with ↓ (good)
                return (
                    <span
                        className="text-xs font-semibold flex items-center gap-0.5"
                        style={{ color: 'var(--positive-primary, #22c55e)' }}
                        data-testid="change-badge-down"
                    >
                        <span>↓</span>
                        <span>{changeValue}%</span>
                    </span>
                );
            default:
                return null;
        }
    };

    // Story 14.13.2: Safe sparkline rendering with semantic colors
    // Shows cumulative daily spending with optional previous period reference line
    const renderSparkline = () => {
        const previousValue = data.previousValue || 0;

        if (!data.sparkline || data.sparkline.length < 2 || data.value === 0) {
            // Flat line when no data or zero value
            return (
                <>
                    <path
                        d="M0 12 L64 12"
                        fill="none"
                        stroke={sparklineColor}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.6"
                    />
                    {/* Show previous period reference line if available */}
                    {previousValue > 0 && (
                        <path
                            d="M0 6 L64 6"
                            fill="none"
                            stroke="var(--text-tertiary, #6b7280)"
                            strokeWidth="1"
                            strokeDasharray="3 2"
                            opacity="0.5"
                        />
                    )}
                </>
            );
        }

        // Calculate max value for scaling - include previous period value for reference
        const currentMax = Math.max(...data.sparkline);
        const maxVal = Math.max(currentMax, previousValue);
        const scale = maxVal > 0 ? 20 / maxVal : 0;

        // Generate path for cumulative sparkline
        // SVG viewBox is 64x24, so we map points across the width
        const points = data.sparkline;
        const xStep = 64 / (points.length - 1);

        const pathParts = points.map((val, i) => {
            const x = i * xStep;
            const y = 22 - val * scale; // Leave 2px margin at top/bottom
            return i === 0 ? `M${x} ${y}` : `L${x} ${y}`;
        });

        // Calculate Y position for previous period reference line
        const prevY = previousValue > 0 ? 22 - previousValue * scale : 12;

        return (
            <>
                {/* Previous period reference line (dashed) - shown when there's previous data */}
                {previousValue > 0 && (
                    <path
                        d={`M0 ${prevY} L64 ${prevY}`}
                        fill="none"
                        stroke="var(--text-tertiary, #6b7280)"
                        strokeWidth="1"
                        strokeDasharray="3 2"
                        opacity="0.5"
                    />
                )}
                {/* Current period cumulative sparkline */}
                <path
                    d={pathParts.join(' ')}
                    fill="none"
                    stroke={sparklineColor}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </>
        );
    };

    // Story 14.13.2: Get the count to display based on countMode
    const displayCount = countMode === 'items' ? (data.itemCount || 0) : data.count;

    // Story 14.13.2: Truncate long category names with ellipsis (max ~16 chars)
    const truncatedName = useMemo(() => {
        const maxChars = 16;
        if (displayName.length > maxChars) {
            return displayName.slice(0, maxChars - 1).trim() + '…';
        }
        return displayName;
    }, [displayName]);

    // Story 14.13.3: Animation styles for slide-in effect from left
    const animationStyle: React.CSSProperties = {
        minHeight: '64px',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateX(0)' : 'translateX(-20px)',
        transition: `opacity 300ms ease-out, transform 300ms ease-out`,
    };

    return (
        <div
            className="w-full flex items-stretch group"
            style={animationStyle}
            data-testid={`trend-item-${data.name.toLowerCase().replace(/\s+/g, '-')}`}
        >
            {/* Main card content - ends before chevron zone, with full rounded corners */}
            <div
                className="flex-1 flex items-center gap-2 pl-2.5 pr-2 py-2.5 rounded-xl transition-all"
                style={{
                    backgroundColor: isDark ? 'var(--bg-secondary, #1e293b)' : 'var(--bg-secondary, #ffffff)',
                    boxShadow: isDark
                        ? '0 2px 8px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)'
                        : '0 2px 8px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.08)',
                    marginRight: '-8px', // Overlap with button so button appears to emerge from behind
                    zIndex: 1,
                }}
            >
                {/* Story 14.40: Category icon with vibrant background - clickable for statistics popup */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        // Don't show popup for "Más" aggregated group
                        if (data.name !== 'Más' && data.name !== 'More') {
                            onIconClick?.(data.name, emoji, iconColors.bg);
                        } else {
                            onClick();
                        }
                    }}
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 hover:scale-105 active:scale-95 transition-transform"
                    style={{ backgroundColor: iconColors.bg }}
                    aria-label={`${displayName} ${locale === 'es' ? 'estadísticas' : 'statistics'}`}
                >
                    {emoji}
                </button>

                {/* Name and clickable count pill below - flex-1 takes remaining space */}
                <div className="flex-1 text-left min-w-0 overflow-hidden">
                    <button
                        onClick={onClick}
                        className="w-full text-left"
                    >
                        <div
                            className="font-semibold text-base flex items-center gap-1"
                            style={{ color: textColor }}
                        >
                            <span title={displayName}>{truncatedName}</span>
                            {/* Badge showing count of categories inside "Más" group */}
                            {data.categoryCount && (
                                <span
                                    className="inline-flex items-center justify-center rounded-full flex-shrink-0"
                                    style={{
                                        backgroundColor: 'transparent',
                                        border: `1.5px solid ${textColor}`,
                                        color: textColor,
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        minWidth: '18px',
                                        height: '18px',
                                        padding: '0 4px',
                                    }}
                                >
                                    {data.categoryCount}
                                </span>
                            )}
                        </div>
                    </button>
                    {/* Story 14.13.2: Clickable count pill below category name */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onCountClick?.();
                        }}
                        className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors mt-1 ${
                            isDark
                                ? 'bg-slate-600 hover:bg-slate-500 text-slate-200'
                                : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                        }`}
                        aria-label={`${locale === 'es' ? 'Ver' : 'View'} ${displayCount} ${
                            countMode === 'items'
                                ? (locale === 'es' ? 'productos' : 'items')
                                : (locale === 'es' ? 'transacciones' : 'transactions')
                        }`}
                        data-testid={`trend-count-pill-${data.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                        {countMode === 'items' ? <Package size={11} /> : <Receipt size={11} />}
                        <span>{displayCount}</span>
                    </button>
                </div>

                {/* Sparkline + Stats - compact, close together on right */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Sparkline - minimal gap from numbers */}
                    <div className="w-14 h-6">
                        <svg viewBox="0 0 64 24" className="w-full h-full">
                            {renderSparkline()}
                        </svg>
                    </div>

                    {/* Stats: Amount + Change stacked vertically - right-aligned */}
                    <div className="text-right min-w-[52px]">
                        <div
                            className="font-semibold text-sm"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            {formatShortCurrency(data.value, currency)}
                        </div>
                        {/* Story 14.13.2: Change indicator right-aligned below amount */}
                        <div className="mt-0.5 flex justify-end">
                            {renderChangeIndicator()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Drill-down chevron zone - emerges from behind card with rounded corners */}
            {/* Story 14.13.3: Only show when showDrillDown is true (hidden on item-categories) */}
            {showDrillDown && (
                <button
                    onClick={onClick}
                    className="flex-shrink-0 w-6 flex items-center justify-center rounded-r-xl transition-all pl-2"
                    style={{
                        backgroundColor: isDark
                            ? 'var(--bg-tertiary, #334155)'
                            : 'var(--bg-tertiary, #f1f5f9)',
                        color: 'var(--text-tertiary)',
                        zIndex: 0,
                    }}
                    aria-label={`Drill down into ${displayName}`}
                >
                    <ChevronRight
                        size={16}
                        className="transition-colors group-hover:text-[var(--text-secondary)]"
                    />
                </button>
            )}
        </div>
    );
};
