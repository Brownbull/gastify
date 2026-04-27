import React from 'react';
import { Receipt, Package } from 'lucide-react';
import { useCountUp } from '@/hooks/useCountUp';
import { getCategoryColorsAuto } from '@/config/categoryColors';
import { getCategoryEmoji } from '@/utils/categoryEmoji';
import { CircularProgress } from '@shared/components/CircularProgress';

// Story 14.12: Animated treemap card with count-up effect and circular progress
// Story 14.21: Updated to use both bg and fg colors for proper contrast
// Story 14.14: Category emoji in top row, transaction count moved to bottom right
// Story 14.13 Session 13: Added categoryCount for "Más" aggregated group badge
interface AnimatedTreemapCardProps {
    cat: { name: string; amount: number; percent: number; count: number; itemCount: number; bgColor: string; fgColor: string; categoryCount?: number };
    displayName: string; // Translated category name
    isMainCell: boolean;
    gridRow?: string;
    gridColumn?: string;
    animationKey: number;
    getValueFontSize: (percent: number, isMainCell: boolean) => string;
    style?: React.CSSProperties; // Story 14.13: Support squarified treemap absolute positioning
    emoji?: string; // Story 14.13 Session 4: Optional emoji override for view mode
    onClick?: () => void; // Story 14.13 Session 4: Click handler for category navigation
    iconType?: 'receipt' | 'package'; // Story 14.13 Session 10: Receipt for transactions, Package for items
    countMode?: 'transactions' | 'items'; // Story 14.13 Session 10: Which count to display
}

const AnimatedTreemapCard: React.FC<AnimatedTreemapCardProps> = ({
    cat,
    displayName,
    isMainCell,
    gridRow,
    gridColumn,
    animationKey,
    getValueFontSize,
    style,
    emoji: emojiProp,
    onClick,
    iconType = 'receipt', // Story 14.13 Session 10: Default to receipt icon
    countMode = 'transactions', // Story 14.13 Session 10: Default to transactions
}) => {
    // Pass animationKey to useCountUp to re-trigger animation when carousel slides
    const animatedAmount = useCountUp(Math.round(cat.amount / 1000), { duration: 1200, startValue: 0, key: animationKey });
    const animatedPercent = useCountUp(Math.round(cat.percent), { duration: 1200, startValue: 0, key: animationKey });
    // Story 14.13 Session 10: Display itemCount when in items mode, otherwise transaction count
    const displayCount = countMode === 'items' ? (cat.itemCount || 0) : cat.count;
    const animatedCount = useCountUp(displayCount, { duration: 800, startValue: 0, key: animationKey });

    // Story 14.13 Session 8: Get text color at render time respecting fontColorMode setting
    // getCategoryColorsAuto returns plain text (black/white) when fontColorMode is 'plain'
    // and category-specific colors when fontColorMode is 'colorful'
    // This matches the TrendsView pattern and ensures reactivity to settings changes
    const textColors = getCategoryColorsAuto(cat.name);
    const textColor = textColors.fg;

    // Circle sizes - responsive: smaller on narrow screens
    // Main cell: 36px, Small cells: 28px (increased from 24px for better readability)
    const circleSize = isMainCell ? 36 : 28;
    const strokeWidth = isMainCell ? 3 : 2;
    // Override font size for small cells to improve readability (default 0.38 multiplier is too small)
    const circleFontSize = isMainCell ? undefined : 11;

    // Story 14.14: Get category emoji for display
    // Story 14.13 Session 4: Use provided emoji prop if available, otherwise fallback to getCategoryEmoji
    const emoji = emojiProp ?? getCategoryEmoji(cat.name);
    const emojiFontSize = isMainCell ? '16px' : '13px';

    return (
        <div
            key={`${cat.name}-${animationKey}`}
            className="rounded-lg flex flex-col justify-between overflow-hidden cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all"
            style={{
                backgroundColor: cat.bgColor,
                gridRow: gridRow,
                gridColumn: gridColumn,
                minHeight: 0,
                // Compact padding for mobile screens
                padding: isMainCell ? '8px 8px' : '6px 6px',
                // Story 14.13: Merge with passed style for squarified treemap positioning
                ...style,
            }}
            // Story 14.13 Session 4: Handle click for category navigation
            onClick={(e) => {
                e.stopPropagation(); // Prevent triggering parent treemap click
                onClick?.();
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick?.();
                }
            }}
        >
            {/* Top row: Emoji + Category name (+ categoryCount badge for "Más") */}
            {/* Story 14.13: Unified layout for squarified treemap cells */}
            {/* Story 14.13 Session 13: Added categoryCount badge for "Más" aggregated group */}
            <div className="flex items-center gap-1.5 min-w-0">
                <span style={{ fontSize: emojiFontSize, lineHeight: 1 }}>{emoji}</span>
                {/* Story 14.37: Category name scales with font size setting */}
                <div className="font-bold truncate flex items-center gap-1" style={{ fontSize: isMainCell ? 'var(--font-size-sm)' : 'var(--font-size-xs)', color: textColor, lineHeight: 1.2 }}>
                    {displayName}
                    {/* Badge showing count of categories inside "Más" group */}
                    {cat.categoryCount && (
                        <span
                            className="inline-flex items-center justify-center rounded-full flex-shrink-0"
                            style={{
                                backgroundColor: 'transparent',
                                border: `1.5px solid ${textColor}`,
                                color: textColor,
                                fontSize: isMainCell ? '10px' : '9px',
                                fontWeight: 600,
                                minWidth: isMainCell ? '18px' : '16px',
                                height: isMainCell ? '18px' : '16px',
                                padding: '0 3px',
                            }}
                        >
                            {cat.categoryCount}
                        </span>
                    )}
                </div>
            </div>

            {/* Bottom section: Count + Amount (left), Percentage circle (bottom right) */}
            {/* Story 14.13 Session 5: Receipt icon for transactions, Package icon for items */}
            <div className="flex items-end justify-between">
                {/* Left side: count above amount */}
                <div className="flex flex-col gap-0.5">
                    {/* Count pill - Receipt for transactions, Package for items */}
                    <span
                        className="inline-flex items-center gap-[2px] px-[5px] py-[1px] rounded-full self-start"
                        style={{
                            backgroundColor: 'var(--bg)',
                            color: textColor,
                            fontSize: isMainCell ? '11px' : '10px',
                        }}
                    >
                        {iconType === 'package' ? (
                            <Package size={isMainCell ? 11 : 10} strokeWidth={2} />
                        ) : (
                            <Receipt size={isMainCell ? 11 : 10} strokeWidth={2} />
                        )}
                        {animatedCount}
                    </span>
                    {/* Amount - left aligned below count */}
                    <div className="font-bold" style={{ fontSize: getValueFontSize(cat.percent, isMainCell), color: textColor, lineHeight: 1 }}>
                        ${animatedAmount}k
                    </div>
                </div>
                {/* Right side: Percentage circle - bottom right */}
                <CircularProgress
                    animatedPercent={animatedPercent}
                    size={circleSize}
                    strokeWidth={strokeWidth}
                    fontSize={circleFontSize}
                    fgColor={textColor}
                    bgRingOpacity={0.2}
                />
            </div>
        </div>
    );
};

export { AnimatedTreemapCard };
export type { AnimatedTreemapCardProps };
