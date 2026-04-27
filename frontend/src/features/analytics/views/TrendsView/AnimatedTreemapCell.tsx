// Story 15-5b: Extracted from TrendsView.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { Receipt, Package } from 'lucide-react';
import { getCategoryColorsAuto } from '@/config/categoryColors';
import { getCategoryEmoji } from '@/utils/categoryEmoji';
import { translateCategory, translateStoreCategoryGroup, translateItemCategoryGroup, getStoreCategoryGroupEmoji, getItemCategoryGroupEmoji, getItemCategoryEmoji } from '@/utils/categoryTranslations';
import { useCountUp } from '@/hooks/useCountUp';
import { CircularProgress } from './animationComponents';
import type { CategoryData, DonutViewMode } from './types';
import type { StoreCategoryGroup, ItemCategoryGroup } from '@/config/categoryColors';

/** Animated treemap cell component with count-up effect (matches Dashboard design) */
export const AnimatedTreemapCell: React.FC<{
    data: CategoryData;
    isMainCell: boolean;
    onClick: () => void;
    currency: string;
    gridRow?: string;
    gridColumn?: string;
    animationKey: number;
    locale?: string;
    t?: (key: string) => string;
    viewMode?: DonutViewMode; // Story 14.14b Session 5: View mode for correct translation
    onTransactionCountClick?: (categoryName: string) => void; // Story 14.22: Navigate to transactions
    onIconClick?: (categoryName: string, emoji: string, color: string) => void; // Story 14.40: Open statistics popup
    style?: React.CSSProperties; // Story 14.13: Support squarified treemap absolute positioning
    cellWidthPercent?: number; // Story 14.13: Cell width % for compact layout detection
    cellHeightPercent?: number; // Story 14.13: Cell height % for compact layout detection
    iconType?: 'receipt' | 'package'; // Story 14.13 Session 5: Receipt for transactions, Package for items
    index?: number; // Story 14.13.3: Cell index for staggered entrance animation
}> = ({ data, isMainCell, onClick, gridRow, gridColumn, animationKey, locale = 'es', t, viewMode = 'store-categories', onTransactionCountClick, onIconClick, style, cellWidthPercent = 100, cellHeightPercent = 100, iconType = 'receipt', index = 0 }) => {
    // Story 14.13.3: Entrance animation state - cells animate from top-left to final position
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Staggered entrance: each cell delays based on its index (50ms per cell)
        const timer = setTimeout(() => setIsVisible(true), index * 50);
        return () => clearTimeout(timer);
    }, [index, animationKey]);

    // Animated values using useCountUp hook
    const animatedAmount = useCountUp(Math.round(data.value / 1000), { duration: 1200, startValue: 0, key: animationKey });
    const animatedPercent = useCountUp(Math.round(data.percent), { duration: 1200, startValue: 0, key: animationKey });
    // Story 14.13 Session 5: Use itemCount when in item mode, otherwise use transaction count
    const displayCount = iconType === 'package' ? (data.itemCount || 0) : data.count;
    const animatedCount = useCountUp(displayCount, { duration: 800, startValue: 0, key: animationKey });

    // Story 14.13: Get text color respecting fontColorMode setting (plain vs colorful)
    // getCategoryColorsAuto returns plain text (black/white) when fontColorMode is 'plain'
    // and category-specific colors when fontColorMode is 'colorful'
    const textColors = getCategoryColorsAuto(data.name);
    const textColor = textColors.fg;

    // Story 14.13: Detect compact layout needed for small cells
    // Compact layout stacks all info vertically - works well for narrow cells
    // Tiny layout shows only emoji + count badge for the very smallest cells
    const cellArea = cellWidthPercent * cellHeightPercent;
    // Only use tiny layout for very small cells (area < 100 or width < 10%)
    // This ensures cells like "Comida" and the pet icon get the compact layout with all info
    const isTinyCell = cellArea < 100 || cellWidthPercent < 10 || cellHeightPercent < 8;
    // Use compact (vertical stack) for any non-main cell that isn't tiny
    // This ensures consistent layout for medium-sized cells like "Hogar", "Productos para Mascotas"
    const isCompactCell = !isTinyCell && !isMainCell && (cellArea < 2000 || cellWidthPercent < 45);

    // Circle sizes - responsive: smaller on narrow screens
    // Main cell: 36px, Small cells: 28px (increased from 24px for better readability)
    const circleSize = isMainCell ? 36 : 28;
    const strokeWidth = isMainCell ? 3 : 2;
    // Override font size for small cells to improve readability (default 0.38 multiplier is too small)
    const circleFontSize = isMainCell ? undefined : 11;

    // Story 14.14b Session 5: Get emoji based on view mode
    // Story 14.13: Use getItemCategoryEmoji for item-categories view mode
    const emoji = useMemo(() => {
        // "Más" = aggregated small categories group (expandable)
        if (data.name === 'Más' || data.name === 'More') {
            return '📁'; // Folder emoji for aggregated "Más" group
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
        // "Más" = aggregated small categories group (expandable)
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
    }, [data.name, viewMode, locale, t]);

    // Story 14.13.3: Entrance animation styles - cells slide from top-left to final position
    const entranceAnimationStyle: React.CSSProperties = {
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translate(0, 0) scale(1)' : 'translate(-20px, -20px) scale(0.8)',
        transition: 'opacity 300ms ease-out, transform 300ms ease-out',
    };

    // Story 14.13: Tiny cells show only emoji + transaction count in a centered layout
    if (isTinyCell) {
        return (
            <div
                key={`${data.name}-${animationKey}`}
                onClick={onClick}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onClick();
                    }
                }}
                role="button"
                tabIndex={0}
                className="rounded-md flex items-center justify-center gap-0.5 overflow-hidden transition-transform hover:scale-[0.98] active:scale-95 cursor-pointer"
                style={{
                    backgroundColor: data.color,
                    padding: '2px',
                    ...style,
                    ...entranceAnimationStyle,
                }}
                aria-label={`${displayName}: $${animatedAmount}k, ${data.count} ${locale === 'es' ? 'transacciones' : 'transactions'}`}
                data-testid={`treemap-cell-${data.name.toLowerCase()}`}
            >
                {/* Story 14.40: Emoji is clickable to show statistics popup */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onIconClick?.(data.name, emoji, data.fgColor || data.color);
                    }}
                    className="cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                    style={{ fontSize: '12px', lineHeight: 1, background: 'none', border: 'none', padding: 0 }}
                    aria-label={`${displayName} ${locale === 'es' ? 'estadísticas' : 'statistics'}`}
                >
                    {emoji}
                </button>
                {/* Show count badge only if there's enough width */}
                {cellWidthPercent >= 12 && (
                    <span
                        className="inline-flex items-center justify-center rounded-full"
                        style={{
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            color: textColor,
                            fontSize: '8px',
                            fontWeight: 600,
                            minWidth: '14px',
                            height: '14px',
                            padding: '0 2px',
                        }}
                    >
                        {animatedCount}
                    </span>
                )}
            </div>
        );
    }

    // Story 14.13: Compact cells show all info stacked vertically in a single column
    // Layout: Emoji+Name (top), Percentage circle, Transaction count, Amount (bottom)
    if (isCompactCell) {
        return (
            <div
                key={`${data.name}-${animationKey}`}
                onClick={onClick}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onClick();
                    }
                }}
                role="button"
                tabIndex={0}
                className="rounded-lg flex flex-col justify-between overflow-hidden text-left transition-transform hover:scale-[0.98] active:scale-95 cursor-pointer"
                style={{
                    backgroundColor: data.color,
                    padding: '6px',
                    ...style,
                    ...entranceAnimationStyle,
                }}
                aria-label={`${displayName}: $${animatedAmount}k`}
                data-testid={`treemap-cell-${data.name.toLowerCase()}`}
            >
                {/* Top: Emoji + truncated name - Story 14.37: category name scales with font size setting */}
                <div className="flex items-center gap-1.5 min-w-0">
                    {/* Story 14.40: Emoji is clickable to show statistics popup */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onIconClick?.(data.name, emoji, data.fgColor || data.color);
                        }}
                        className="cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                        style={{ fontSize: '14px', lineHeight: 1, background: 'none', border: 'none', padding: 0 }}
                        aria-label={`${displayName} ${locale === 'es' ? 'estadísticas' : 'statistics'}`}
                    >
                        {emoji}
                    </button>
                    <span
                        className="font-bold truncate"
                        style={{
                            fontSize: 'var(--font-size-sm)',
                            color: textColor,
                            textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        }}
                    >
                        {displayName}
                    </span>
                </div>
                {/* Bottom section: Percentage, Count, Amount stacked vertically */}
                <div className="flex flex-col gap-0.5 items-start">
                    {/* Percentage circle - smaller for compact */}
                    <CircularProgress
                        animatedPercent={animatedPercent}
                        size={24}
                        strokeWidth={2}
                        fgColor={textColor}
                        fontSize={10}
                    />
                    {/* Count pill - Receipt for transactions, Package for items */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onTransactionCountClick?.(data.name);
                        }}
                        className="inline-flex items-center gap-[2px] px-[5px] py-[1px] rounded-full transition-opacity hover:opacity-80 active:opacity-60"
                        style={{
                            backgroundColor: 'rgba(255,255,255,0.85)',
                            color: textColor,
                            fontSize: '10px',
                        }}
                        aria-label={`${locale === 'es' ? 'Ver' : 'View'} ${data.count} ${iconType === 'package' ? (locale === 'es' ? 'productos' : 'items') : (locale === 'es' ? 'transacciones' : 'transactions')}`}
                    >
                        {iconType === 'package' ? <Package size={10} strokeWidth={2} /> : <Receipt size={10} strokeWidth={2} />}
                        {animatedCount}
                    </button>
                    {/* Amount */}
                    <div
                        className="font-bold"
                        style={{
                            fontSize: '14px',
                            color: textColor,
                            textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        }}
                    >
                        ${animatedAmount}k
                    </div>
                </div>
            </div>
        );
    }

    // Standard cell layout (full content)
    return (
        <div
            key={`${data.name}-${animationKey}`}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
            role="button"
            tabIndex={0}
            className="rounded-lg flex flex-col justify-between overflow-hidden text-left transition-transform hover:scale-[0.98] active:scale-95 cursor-pointer"
            style={{
                backgroundColor: data.color,
                gridRow: gridRow,
                gridColumn: gridColumn,
                padding: isMainCell ? '8px 8px' : '6px 6px',
                // Ensure minimum height when in flex container (scrollable mode)
                minHeight: isMainCell ? undefined : '60px',
                flexShrink: 0,
                // Story 14.13: Merge with passed style for squarified treemap positioning
                ...style,
                // Story 14.13.3: Entrance animation
                ...entranceAnimationStyle,
            }}
            aria-label={`${displayName}: $${animatedAmount}k`}
            data-testid={`treemap-cell-${data.name.toLowerCase()}`}
        >
            {/* Top row: Emoji + Category name */}
            <div className="flex items-center gap-1.5 min-w-0">
                {/* Story 14.40: Emoji is clickable to show statistics popup */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onIconClick?.(data.name, emoji, data.fgColor || data.color);
                    }}
                    className="cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                    style={{ fontSize: '16px', lineHeight: 1, background: 'none', border: 'none', padding: 0 }}
                    aria-label={`${displayName} ${locale === 'es' ? 'estadísticas' : 'statistics'}`}
                >
                    {emoji}
                </button>
                {/* Category name - Story 14.37: scales with font size setting */}
                <div
                    className="font-bold truncate flex items-center gap-1"
                    style={{
                        fontSize: 'var(--font-size-sm)',
                        color: textColor,
                        textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    }}
                >
                    {displayName}
                    {/* Badge showing count of categories inside "Más" group */}
                    {data.categoryCount && (
                        <span
                            className="inline-flex items-center justify-center rounded-full"
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
            </div>

            {/* Bottom section: Count + Amount (left), Percentage circle (bottom right) */}
            {/* Story 14.13: Unified layout for squarified treemap cells */}
            {/* Story 14.13 Session 5: Receipt icon for transactions, Package icon for items */}
            <div className="flex items-end justify-between">
                {/* Left side: count above amount */}
                <div className="flex flex-col gap-0.5">
                    {/* Count pill - Story 14.22: Clickable to navigate to transactions/items */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onTransactionCountClick?.(data.name);
                        }}
                        className="inline-flex items-center gap-[2px] px-[5px] py-[1px] rounded-full transition-opacity hover:opacity-80 active:opacity-60 self-start"
                        style={{
                            backgroundColor: 'rgba(255,255,255,0.85)',
                            color: textColor,
                            fontSize: isMainCell ? '11px' : '10px',
                        }}
                        aria-label={`${locale === 'es' ? 'Ver' : 'View'} ${data.count} ${iconType === 'package' ? (locale === 'es' ? 'productos' : 'items') : (locale === 'es' ? 'transacciones' : 'transactions')}`}
                    >
                        {iconType === 'package' ? <Package size={isMainCell ? 11 : 10} strokeWidth={2} /> : <Receipt size={isMainCell ? 11 : 10} strokeWidth={2} />}
                        {animatedCount}
                    </button>
                    {/* Amount - left aligned below count */}
                    <div
                        className="font-bold"
                        style={{
                            fontSize: isMainCell ? '22px' : '16px',
                            color: textColor,
                            textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        }}
                    >
                        ${animatedAmount}k
                    </div>
                </div>
                {/* Right side: Percentage circle - bottom right */}
                <CircularProgress
                    animatedPercent={animatedPercent}
                    size={circleSize}
                    strokeWidth={strokeWidth}
                    fgColor={textColor}
                    fontSize={circleFontSize}
                />
            </div>
        </div>
    );
};
