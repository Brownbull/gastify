/**
 * TrendsView Animation Sub-Components
 *
 * Story 15-5b: Extracted from TrendsView.tsx
 *
 * Small, reusable animation components used by DonutChart
 * and AnimatedTreemapCell for count-up effects.
 */

import React from 'react';
import { Receipt, Package } from 'lucide-react';
import { useCountUp } from '@/hooks/useCountUp';
import { formatCurrency } from '@/utils/currency';

// ============================================================================
// CircularProgress — re-exported from shared component (Story 15-TD-6)
// ============================================================================
export { CircularProgress } from '@shared/components/CircularProgress';
export type { CircularProgressProps } from '@shared/components/CircularProgress';

// ============================================================================
// AnimatedAmountBar
// ============================================================================

/**
 * Story 14.13.3: Animated amount with percentage bar component
 * Provides count-up animation for amount value with inline percentage bar
 */
export const AnimatedAmountBar: React.FC<{
    value: number;
    percent: number;
    animationKey: number;
    currency: string;
    legendTextColor: string;
    isDark: boolean;
    maxPercent: number;
    fgColor: string;
}> = ({ value, percent, animationKey, currency, legendTextColor, isDark, maxPercent, fgColor }) => {
    const animatedValue = useCountUp(value, { duration: 800, startValue: 0, key: animationKey });
    const animatedPercent = useCountUp(percent, { duration: 600, startValue: 0, key: animationKey });

    return (
        <span
            className="text-xs flex items-center gap-2"
            style={{ color: legendTextColor, opacity: 0.7 }}
        >
            {formatCurrency(animatedValue, currency)}
            <span
                className="rounded-full overflow-hidden inline-block"
                style={{
                    width: '70px',
                    height: '3px',
                    backgroundColor: isDark ? 'rgba(100, 116, 139, 0.3)' : 'rgba(226, 232, 240, 0.8)',
                }}
                aria-label={`${animatedPercent}% of spending`}
            >
                <span
                    className="block h-full rounded-full transition-all duration-300"
                    style={{
                        width: `${(animatedPercent / maxPercent) * 100}%`,
                        backgroundColor: fgColor,
                    }}
                />
            </span>
        </span>
    );
};

// ============================================================================
// AnimatedCountPill
// ============================================================================

/**
 * Story 14.13.3: Animated count pill component
 */
export const AnimatedCountPill: React.FC<{
    count: number;
    itemCount: number;
    animationKey: number;
    countMode: 'transactions' | 'items';
    isDark: boolean;
    locale: string;
    onCountClick: () => void;
    categoryName: string;
}> = ({ count, itemCount, animationKey, countMode, isDark, locale, onCountClick, categoryName }) => {
    const animatedCount = useCountUp(countMode === 'items' ? itemCount : count, { duration: 600, startValue: 0, key: animationKey });

    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onCountClick();
            }}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                isDark
                    ? 'bg-slate-600 hover:bg-slate-500 text-slate-200'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            }`}
            aria-label={`${locale === 'es' ? 'Ver' : 'View'} ${animatedCount} ${
                countMode === 'items'
                    ? (locale === 'es' ? 'productos' : 'items')
                    : (locale === 'es' ? 'transacciones' : 'transactions')
            }`}
            data-testid={`transaction-count-pill-${categoryName.toLowerCase().replace(/\s+/g, '-')}`}
        >
            {countMode === 'items' ? <Package size={12} /> : <Receipt size={12} />}
            <span>{animatedCount}</span>
        </button>
    );
};

// ============================================================================
// AnimatedPercent
// ============================================================================

/**
 * Story 14.13.3: Animated percentage component
 */
export const AnimatedPercent: React.FC<{
    percent: number;
    animationKey: number;
    legendTextColor: string;
}> = ({ percent, animationKey, legendTextColor }) => {
    const animatedPercent = useCountUp(percent, { duration: 600, startValue: 0, key: animationKey });

    return (
        <span
            className="text-sm font-semibold"
            style={{ color: legendTextColor }}
        >
            {animatedPercent}%
        </span>
    );
};
