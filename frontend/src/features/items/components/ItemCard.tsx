/**
 * ItemCard Component
 *
 * Story 14.31: Items History View
 * Epic 14: Core Implementation
 *
 * Displays an individual item from a transaction with:
 * - Item name and category emoji
 * - Price with currency formatting
 * - Parent transaction info (merchant, date)
 * - Category-colored text based on item category
 * - Click to navigate to parent transaction
 *
 * @see docs/sprint-artifacts/epic14/stories/story-14.31-items-history-view.md
 */

import React from 'react';
import { Store } from 'lucide-react';
import type { FlattenedItem } from '@/types/item';
import { getItemCategoryColors, type ThemeName, type ModeName } from '@/config/categoryColors';
import { DEFAULT_CURRENCY } from '@/utils/currency';
import { getItemCategoryEmoji } from '@/utils/categoryTranslations';
import { normalizeItemCategory } from '@/utils/categoryNormalizer';
import { useIsForeignLocation } from '@/hooks/useIsForeignLocation';
import { useLocationDisplay } from '@/hooks/useLocations';
import type { Language } from '@/types/settings';

// ============================================================================
// Types
// ============================================================================

/**
 * Formatting functions required by the ItemCard.
 * These are passed from the parent view which has access to user settings.
 */
export interface ItemCardFormatters {
    /** Format currency amount (e.g., "$10.000" or "€15,50") */
    formatCurrency: (amount: number, currency: string) => string;
    /** Format date string (e.g., "02/01/2026" or "Jan 2") */
    formatDate: (date: string, format: string) => string;
    /** Translation function for UI strings */
    t: (key: string) => string;
}

/**
 * Theme settings for the ItemCard.
 */
export interface ItemCardTheme {
    /** Light or dark mode */
    mode: 'light' | 'dark';
    /** Color theme variant (normal/professional/mono) */
    colorTheme?: ThemeName;
    /** Date format preference */
    dateFormat?: string;
}

/**
 * Props for the ItemCard component.
 */
export interface ItemCardProps {
    /** The flattened item data to display */
    item: FlattenedItem;
    /** Formatting functions */
    formatters: ItemCardFormatters;
    /** Theme settings */
    theme: ItemCardTheme;
    /** Default currency if not specified in item */
    defaultCurrency?: string;
    /** Story 14.35b: User's default country for foreign location detection */
    userDefaultCountry?: string;
    /** Story 14.35b: Language for localized city names */
    lang?: Language;
    /** Click handler to navigate to parent transaction */
    onClick?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const ItemCard: React.FC<ItemCardProps> = ({
    item,
    formatters,
    theme,
    defaultCurrency = DEFAULT_CURRENCY,
    userDefaultCountry,
    lang = 'es',
    onClick,
}) => {
    // Destructure formatters
    const { formatCurrency, formatDate, t } = formatters;

    // Theme values
    const isDark = theme.mode === 'dark';
    const colorTheme = theme.colorTheme || 'normal';
    const dateFormat = theme.dateFormat || 'short';
    const mode: ModeName = isDark ? 'dark' : 'light';

    // Story 14.35b: Detect foreign location for flag display
    const { isForeign, flagEmoji } = useIsForeignLocation(item.country, userDefaultCountry);

    // Story 14.35b: Get localized city names
    const { getCityName } = useLocationDisplay(lang);

    // Normalize category and get colors
    const normalizedCategory = normalizeItemCategory(item.category || 'Other');
    const categoryColors = getItemCategoryColors(normalizedCategory, colorTheme, mode);
    const categoryEmoji = getItemCategoryEmoji(normalizedCategory);

    // Format display values
    const displayPrice = formatCurrency(item.totalPrice, item.currency || defaultCurrency);
    const displayMerchant = item.merchantAlias || item.merchantName;

    // Format date display (short format for cards)
    const getDateDisplay = (): string => {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        if (item.transactionDate === today) {
            return t('today');
        } else if (item.transactionDate === yesterday) {
            return t('yesterday');
        } else {
            return formatDate(item.transactionDate, dateFormat);
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
            className="rounded-lg overflow-hidden border transition-colors cursor-pointer hover:border-[var(--primary)]"
            style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border-light)',
            }}
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            aria-label={`${item.name}, ${displayPrice}`}
            data-testid="item-card"
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
                        {/* Row 1: Item name + Price */}
                        <div className="flex justify-between items-start mb-1">
                            <span
                                className="font-semibold text-sm truncate pr-2"
                                style={{ color: categoryColors.fg }}
                                title={item.name}
                            >
                                {item.name}
                            </span>
                            <span
                                className="font-semibold text-sm whitespace-nowrap flex-shrink-0"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                {displayPrice}
                            </span>
                        </div>

                        {/* Row 2: Merchant + Date pills */}
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
                                <span className="truncate max-w-[120px]">{displayMerchant}</span>
                            </span>

                            {/* Date pill */}
                            <span
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs"
                                style={{
                                    backgroundColor: 'var(--bg-tertiary)',
                                    color: 'var(--text-secondary)',
                                }}
                            >
                                {getDateDisplay()}
                            </span>

                            {/* Quantity indicator (if qty > 1) */}
                            {item.qty > 1 && (
                                <span
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                                    style={{
                                        backgroundColor: categoryColors.bg,
                                        color: categoryColors.fg,
                                    }}
                                >
                                    x{item.qty}
                                </span>
                            )}

                            {/* City pill (if available) - Story 14.35b: Show flag for foreign locations */}
                            {item.city && (
                                <span
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs"
                                    style={{
                                        backgroundColor: 'var(--bg-tertiary)',
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    {isForeign && <span className="mr-0.5">{flagEmoji}</span>}
                                    {/* Story 14.35b: Display city in user's language */}
                                    {getCityName(item.city)}
                                </span>
                            )}
                        </div>

                        {/* Row 3: Subcategory (if available) */}
                        {item.subcategory && (
                            <div className="mt-1">
                                <span
                                    className="text-xs italic"
                                    style={{ color: 'var(--text-tertiary)' }}
                                >
                                    {item.subcategory}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ItemCard;
