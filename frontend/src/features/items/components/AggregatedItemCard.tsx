/**
 * AggregatedItemCard Component
 *
 * Story 14.31: Items History View - Session 2
 * Epic 14: Core Implementation
 *
 * Displays an aggregated item (grouped by product name + merchant) with:
 * - Item name and category emoji
 * - Total price across all purchases
 * - Transaction count badge (clickable to view transactions)
 * - Purchase count and average price
 *
 * @see docs/sprint-artifacts/epic14/stories/story-14.31-items-history-view.md
 */

import React from 'react';
import { Store, Receipt } from 'lucide-react';
import type { AggregatedItem } from '@/types/item';
import { getItemCategoryColors, type ThemeName, type ModeName } from '@/config/categoryColors';
import { getItemCategoryEmoji } from '@/utils/categoryTranslations';
import { DEFAULT_CURRENCY } from '@/utils/currency';
import { normalizeItemCategory } from '@/utils/categoryNormalizer';

// ============================================================================
// Types
// ============================================================================

/**
 * Formatting functions required by the AggregatedItemCard.
 */
export interface AggregatedItemCardFormatters {
    /** Format currency amount (e.g., "$10.000" or "€15,50") */
    formatCurrency: (amount: number, currency: string) => string;
    /** Format date string (e.g., "02/01/2026" or "Jan 2") */
    formatDate: (date: string, format: string) => string;
    /** Translation function for UI strings */
    t: (key: string) => string;
}

/**
 * Theme settings for the AggregatedItemCard.
 */
export interface AggregatedItemCardTheme {
    /** Light or dark mode */
    mode: 'light' | 'dark';
    /** Color theme variant (normal/professional/mono) */
    colorTheme?: ThemeName;
    /** Date format preference */
    dateFormat?: string;
}

/**
 * Props for the AggregatedItemCard component.
 */
export interface AggregatedItemCardProps {
    /** The aggregated item data to display */
    item: AggregatedItem;
    /** Formatting functions */
    formatters: AggregatedItemCardFormatters;
    /** Theme settings */
    theme: AggregatedItemCardTheme;
    /** Default currency if not specified */
    defaultCurrency?: string;
    /** Language for translations */
    lang?: 'en' | 'es';
    /** Click handler for the transaction count badge */
    onTransactionCountClick?: (transactionIds: string[]) => void;
    /** Click handler for the card (optional) */
    onClick?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const AggregatedItemCard: React.FC<AggregatedItemCardProps> = ({
    item,
    formatters,
    theme,
    defaultCurrency = DEFAULT_CURRENCY,
    lang = 'es',
    onTransactionCountClick,
    onClick,
}) => {
    // Destructure formatters
    const { formatCurrency, formatDate, t } = formatters;

    // Theme values
    const isDark = theme.mode === 'dark';
    const colorTheme = theme.colorTheme || 'normal';
    const dateFormat = theme.dateFormat || 'short';
    const mode: ModeName = isDark ? 'dark' : 'light';

    // Normalize category and get colors
    const normalizedCategory = normalizeItemCategory(item.category || 'Other');
    const categoryColors = getItemCategoryColors(normalizedCategory, colorTheme, mode);
    const categoryEmoji = getItemCategoryEmoji(normalizedCategory);

    // Format display values
    const displayPrice = formatCurrency(item.totalAmount, defaultCurrency);
    const displayAvgPrice = formatCurrency(item.averagePrice, defaultCurrency);
    const displayMerchant = item.merchantAlias || item.merchantName;

    // Format last purchase date
    const getDateDisplay = (): string => {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        if (item.lastPurchaseDate === today) {
            return t('today');
        } else if (item.lastPurchaseDate === yesterday) {
            return t('yesterday');
        } else {
            return formatDate(item.lastPurchaseDate, dateFormat);
        }
    };

    // Handle transaction count click
    const handleTransactionCountClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click
        if (onTransactionCountClick) {
            onTransactionCountClick(item.transactionIds);
        }
    };

    // Handle card click
    const handleClick = () => {
        if (onClick) {
            onClick();
        }
    };

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
        }
    };

    return (
        <div
            className={`rounded-lg overflow-hidden border transition-colors ${onClick ? 'cursor-pointer hover:border-[var(--primary)]' : ''}`}
            style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border-light)',
            }}
            onClick={onClick ? handleClick : undefined}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? handleKeyDown : undefined}
            aria-label={`${item.displayName}, ${displayPrice}, ${item.transactionCount} ${lang === 'es' ? 'transacciones' : 'transactions'}`}
            data-testid="aggregated-item-card"
            data-item-id={item.id}
        >
            <div className="p-3">
                <div className="flex gap-3 items-start">
                    {/* Category Badge with Emoji */}
                    <div
                        className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                        style={{ backgroundColor: categoryColors.bg }}
                        aria-hidden="true"
                    >
                        {categoryEmoji}
                    </div>

                    {/* Item Info */}
                    <div className="flex-1 min-w-0">
                        {/* Row 1: Item name + Total Price */}
                        <div className="flex justify-between items-start mb-1">
                            <span
                                className="font-semibold text-sm truncate pr-2"
                                style={{ color: categoryColors.fg }}
                                title={item.displayName}
                            >
                                {item.displayName}
                            </span>
                            <span
                                className="font-semibold text-sm whitespace-nowrap flex-shrink-0"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                {displayPrice}
                            </span>
                        </div>

                        {/* Row 2: Merchant + Transaction Count + Purchase Count */}
                        <div className="flex flex-wrap gap-1.5 items-center">
                            {/* Merchant pill */}
                            <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                                style={{
                                    backgroundColor: 'var(--bg-tertiary)',
                                    color: 'var(--text-secondary)',
                                }}
                            >
                                <Store size={10} strokeWidth={2} />
                                <span className="truncate max-w-[100px]">{displayMerchant}</span>
                            </span>

                            {/* Last purchase date */}
                            <span
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs"
                                style={{
                                    backgroundColor: 'var(--bg-tertiary)',
                                    color: 'var(--text-secondary)',
                                }}
                            >
                                {getDateDisplay()}
                            </span>

                            {/* Transaction count badge - CLICKABLE */}
                            <button
                                onClick={handleTransactionCountClick}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors hover:opacity-80"
                                style={{
                                    backgroundColor: 'var(--primary-light, #e8f5e9)',
                                    color: 'var(--primary)',
                                }}
                                title={lang === 'es'
                                    ? `Ver ${item.transactionCount} transacciones`
                                    : `View ${item.transactionCount} transactions`
                                }
                                aria-label={lang === 'es'
                                    ? `${item.transactionCount} transacciones - click para ver`
                                    : `${item.transactionCount} transactions - click to view`
                                }
                            >
                                <Receipt size={10} strokeWidth={2} />
                                {item.transactionCount}
                            </button>

                            {/* Purchase count (if more than transaction count, shows multiplicity) */}
                            {item.purchaseCount > item.transactionCount && (
                                <span
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                                    style={{
                                        backgroundColor: categoryColors.bg,
                                        color: categoryColors.fg,
                                    }}
                                    title={lang === 'es'
                                        ? `${item.purchaseCount} unidades compradas`
                                        : `${item.purchaseCount} units purchased`
                                    }
                                >
                                    x{item.purchaseCount}
                                </span>
                            )}
                        </div>

                        {/* Row 3: Average price + Subcategory */}
                        <div className="mt-1 flex items-center gap-2">
                            <span
                                className="text-xs"
                                style={{ color: 'var(--text-tertiary)' }}
                            >
                                {lang === 'es' ? 'Promedio' : 'Avg'}: {displayAvgPrice}
                            </span>

                            {item.subcategory && (
                                <>
                                    <span style={{ color: 'var(--text-tertiary)' }}>•</span>
                                    <span
                                        className="text-xs italic"
                                        style={{ color: 'var(--text-tertiary)' }}
                                    >
                                        {item.subcategory}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AggregatedItemCard;
