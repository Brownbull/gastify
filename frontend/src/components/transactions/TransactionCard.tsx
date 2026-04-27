/**
 * TransactionCard Component
 *
 * Consolidated transaction display component for use across multiple screens.
 * Moved from history/ to transactions/ for shared usage (Story 14.15b).
 *
 * Features:
 * - Receipt thumbnail on left with category badge overlay
 * - Merchant name (with category-colored text) and amount on first row
 * - Meta pills (time, location, item count) on second row
 * - Expandable items section (chevron to expand/collapse)
 * - Selection mode with checkbox for batch operations
 * - Group border color when assigned to a group
 *
 * @see docs/uxui/mockups/01_views/transaction-list.html
 */

import React, { useState } from 'react';
import { ChevronDown, AlertTriangle, Receipt, Package, Check } from 'lucide-react';
import type { Transaction, TransactionItem as TransactionItemType } from '../../types/transaction';
import { getCategoryEmoji } from '../../utils/categoryEmoji';
import { getCategoryColors, getCategoryColorsAuto, type ThemeName, type ModeName } from '../../config/categoryColors';
import { useIsForeignLocation } from '../../hooks/useIsForeignLocation';
import { useLocationDisplay } from '../../hooks/useLocations';
import type { ForeignLocationDisplayFormat } from '@/types/preferences';
import { DEFAULT_CURRENCY } from '../../utils/currency';
import { DEFAULT_TIME } from '../../entities/transaction/utils';
import { formatQty, shouldShowQty } from '@entities/transaction/utils/qtyUtils';
import type { Language } from '../../types/settings';


// ============================================================================
// Types
// ============================================================================

/**
 * Formatting functions required by the TransactionCard.
 * These are passed from the parent view which has access to user settings.
 */
export interface TransactionCardFormatters {
  /** Format currency amount (e.g., "$10.000" or "€15,50") */
  formatCurrency: (amount: number, currency: string) => string;
  /** Format date string (e.g., "02/01/2026" or "Jan 2") */
  formatDate: (date: string, format: string) => string;
  /** Translation function for UI strings */
  t: (key: string) => string;
}

/**
 * Theme settings for the TransactionCard.
 */
export interface TransactionCardTheme {
  /** Light or dark mode */
  mode: 'light' | 'dark';
  /** Color theme variant (normal/professional/mono) */
  colorTheme?: ThemeName;
  /** Date format preference */
  dateFormat?: string;
}

/**
 * Selection mode props for batch operations.
 */
export interface TransactionCardSelection {
  /** Whether selection mode is active */
  isSelectionMode: boolean;
  /** Whether this transaction is selected */
  isSelected: boolean;
  /** Toggle selection callback */
  onToggleSelect: () => void;
}

/**
 * Simplified props interface for TransactionCard.
 * Accepts a Transaction object directly instead of individual fields.
 */
export interface TransactionCardProps {
  /** The transaction data to display */
  transaction: Transaction;
  /** Formatting functions */
  formatters: TransactionCardFormatters;
  /** Theme settings */
  theme: TransactionCardTheme;
  /** Default currency if not specified in transaction */
  defaultCurrency?: string;
  /** Story 14.35b: User's default country for foreign location detection */
  userDefaultCountry?: string;
  /** Story 14.35b: How to display foreign location (code or flag emoji) */
  foreignLocationFormat?: ForeignLocationDisplayFormat;
  /** Story 14.35b: Language for localized city/country names */
  lang?: Language;
  /** Whether this transaction is a potential duplicate */
  isDuplicate?: boolean;
  /** Click handler for editing the transaction */
  onClick?: () => void;
  /** Click handler for viewing the receipt image */
  onThumbnailClick?: () => void;
  /** Selection mode props (optional - for batch operations) */
  selection?: TransactionCardSelection;
}

// Re-export the TransactionItem type for convenience
export type { TransactionItemType as TransactionItem };

// ============================================================================
// Constants
// ============================================================================

/** Maximum items to show before "more" link */
const MAX_VISIBLE_ITEMS = 5;

// ============================================================================
// Helper Components
// ============================================================================

interface ReceiptThumbnailProps {
  thumbnailUrl?: string;
  merchant: string;
  alias?: string;
  category: string;
  colorTheme: ThemeName;
  mode: ModeName;
  onThumbnailClick?: (e: React.MouseEvent) => void;
}

const ReceiptThumbnail: React.FC<ReceiptThumbnailProps> = ({
  thumbnailUrl,
  merchant,
  alias,
  category,
  colorTheme,
  mode,
  onThumbnailClick,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Use unified category colors from categoryColors.ts
  const categoryColors = getCategoryColors(category, colorTheme, mode);

  // Category badge component - rendered on bottom-right of thumbnail
  const CategoryBadge = () => {
    const emoji = getCategoryEmoji(category);

    return (
      <div
        className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full flex items-center justify-center text-sm shadow-sm"
        style={{ backgroundColor: categoryColors.bg }}
        aria-hidden="true"
      >
        {emoji}
      </div>
    );
  };

  if (!thumbnailUrl) {
    // Show receipt icon placeholder with category badge
    return (
      <div className="relative flex-shrink-0 w-10 h-[46px]">
        <div
          className="w-full h-full rounded-md flex items-center justify-center border"
          style={{
            background: 'linear-gradient(135deg, var(--bg-tertiary) 0%, var(--border-light) 100%)',
            borderColor: 'var(--border-light)',
          }}
        >
          <Receipt size={18} strokeWidth={1.2} style={{ color: 'var(--text-tertiary)', opacity: 0.7 }} />
        </div>
        <CategoryBadge />
      </div>
    );
  }

  return (
    <div
      className="relative flex-shrink-0 w-10 h-[46px] cursor-pointer"
      onClick={onThumbnailClick}
      role="button"
      aria-label={`View receipt from ${alias || merchant}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onThumbnailClick) {
          e.preventDefault();
          onThumbnailClick(e as unknown as React.MouseEvent);
        }
      }}
      data-testid="transaction-thumbnail"
    >
      {isLoading && !hasError && (
        <div
          className="absolute inset-0 rounded-md animate-pulse"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        />
      )}
      {hasError ? (
        <div
          className="w-full h-full flex items-center justify-center rounded-md border"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            borderColor: 'var(--border-light)',
          }}
        >
          <Receipt size={16} style={{ color: 'var(--text-tertiary)' }} />
        </div>
      ) : (
        <img
          src={thumbnailUrl}
          alt={`Receipt from ${alias || merchant}`}
          className={`w-10 h-[46px] object-cover rounded-md border transition-opacity ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          style={{ borderColor: 'var(--border-light)' }}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      )}
      {/* Category badge overlay */}
      <CategoryBadge />
    </div>
  );
};

interface MetaPillProps {
  children: React.ReactNode;
}

const MetaPill: React.FC<MetaPillProps> = ({ children }) => (
  <span
    className="inline-flex items-center gap-[3px] px-[6px] py-[3px] rounded-full text-xs"
    style={{
      backgroundColor: 'var(--bg-tertiary)',
      color: 'var(--text-secondary)',
    }}
  >
    {children}
  </span>
);

// ============================================================================
// Main Component
// ============================================================================

export const TransactionCard: React.FC<TransactionCardProps> = ({
  transaction,
  formatters,
  theme,
  defaultCurrency = DEFAULT_CURRENCY,
  userDefaultCountry,
  foreignLocationFormat = 'code',
  lang = 'es',
  isDuplicate = false,
  onClick,
  onThumbnailClick,
  selection,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Destructure transaction fields
  const {
    id,
    merchant,
    alias,
    date,
    time,
    total,
    category,
    city,
    country,
    currency,
    thumbnailUrl,
    imageUrls,
    items = [],
  } = transaction;

  // Story 14.35b: Detect foreign location for flag/code display
  const { isForeign, countryCode } = useIsForeignLocation(country, userDefaultCountry);

  // Story 14.35b: Get localized city/country names
  const { getCityName } = useLocationDisplay(lang);

  // Story 14.35b: Render the foreign location indicator based on user preference
  const renderForeignLocationIndicator = (): React.ReactNode => {
    if (!isForeign || !countryCode) return null;
    if (foreignLocationFormat === 'flag') {
      // Use flag-icons library: fi fi-{lowercase-country-code}
      return (
        <span
          className={`fi fi-${countryCode.toLowerCase()}`}
          style={{ fontSize: '12px', marginRight: '2px' }}
          aria-label={countryCode}
        />
      );
    }
    // Default: show two-letter country code
    return <span className="mr-0.5">{countryCode}</span>;
  };

  // Destructure formatters
  const { formatCurrency, formatDate, t } = formatters;

  // Theme values
  const isDark = theme.mode === 'dark';
  const colorTheme = theme.colorTheme || 'normal';
  const dateFormat = theme.dateFormat || 'short';
  const mode: ModeName = isDark ? 'dark' : 'light';

  // Selection mode values
  const isSelectionMode = selection?.isSelectionMode ?? false;
  const isSelected = selection?.isSelected ?? false;
  const onToggleSelect = selection?.onToggleSelect;

  // Format display values
  const displayName = alias || merchant;
  const displayAmount = formatCurrency(total, currency || defaultCurrency);

  // Format time display — hide DEFAULT_TIME sentinel (TD-18-7)
  const getTimeDisplay = (): string => {
    const displayTime = time && time !== DEFAULT_TIME ? time : undefined;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (date === today) {
      return displayTime ? `${t('today')}, ${displayTime}` : t('today');
    } else if (date === yesterday) {
      return displayTime ? `${t('yesterday')}, ${displayTime}` : t('yesterday');
    } else {
      const formatted = formatDate(date, dateFormat);
      return displayTime ? `${formatted}, ${displayTime}` : formatted;
    }
  };

  const hasItems = items.length > 0;
  const visibleItems = items.slice(0, MAX_VISIBLE_ITEMS);
  const remainingCount = items.length - MAX_VISIBLE_ITEMS;

  const handleCardClick = (e: React.MouseEvent) => {
    // If clicking the chevron area or expandable section, toggle expansion
    const target = e.target as HTMLElement;
    if (target.closest('[data-expand-toggle]')) {
      e.stopPropagation();
      setIsExpanded(!isExpanded);
      return;
    }

    // In selection mode, toggle selection instead of editing
    if (isSelectionMode) {
      onToggleSelect?.();
      return;
    }

    // Otherwise, trigger the onClick handler (edit transaction)
    onClick?.();
  };

  const handleThumbnailClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (imageUrls && imageUrls.length > 0 && onThumbnailClick) {
      onThumbnailClick();
    }
  };

  // Determine border color - duplicate warning takes precedence
  const getBorderColor = () => {
    if (isDuplicate) {
      return isDark ? '#fbbf24' : '#f59e0b';
    }
    return 'var(--border-light)';
  };

  // Use thicker border when duplicate
  const hasBorderEmphasis = isDuplicate;

  return (
    <div
      className={`rounded-lg overflow-hidden transition-colors ${hasBorderEmphasis ? 'border-2' : 'border'}`}
      style={{
        backgroundColor: 'var(--surface)',
        borderColor: getBorderColor(),
      }}
      data-testid="transaction-card"
      data-id={id}
    >
      {/* Main Card Content */}
      <div
        className="p-3 cursor-pointer"
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        aria-label={`${displayName}, ${displayAmount}${isDuplicate ? ', potential duplicate' : ''}${isSelected ? ', selected' : ''}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isSelectionMode) {
              onToggleSelect?.();
            } else {
              onClick?.();
            }
          }
        }}
      >
        <div className="flex gap-[10px] items-start">
          {/* Selection Checkbox - centered vertically with card content */}
          {isSelectionMode && (
            <div className="flex items-center justify-center self-center">
              <div
                className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
                  isSelected ? 'border-transparent' : ''
                }`}
                style={{
                  borderColor: isSelected ? 'transparent' : 'var(--border-medium)',
                  backgroundColor: isSelected ? 'var(--primary)' : 'transparent',
                }}
                data-testid="selection-checkbox"
                role="checkbox"
                aria-checked={isSelected}
              >
                {isSelected && (
                  <Check
                    size={14}
                    strokeWidth={3}
                    style={{ color: 'white' }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Receipt Thumbnail with Category Badge */}
          <ReceiptThumbnail
            thumbnailUrl={thumbnailUrl}
            merchant={merchant}
            alias={alias}
            category={category}
            colorTheme={colorTheme}
            mode={mode}
            onThumbnailClick={handleThumbnailClick}
          />

          {/* Info Section */}
          <div className="flex-1 min-w-0">
            {/* Row 1: Merchant + Amount */}
            <div className="flex justify-between items-start mb-1">
              <span
                className="font-semibold text-sm truncate"
                style={{ color: getCategoryColorsAuto(category).fg }}
              >
                {displayName}
              </span>
              <span
                className="font-semibold text-sm whitespace-nowrap flex-shrink-0 ml-2"
                style={{ color: 'var(--text-primary)' }}
              >
                {displayAmount}
              </span>
            </div>

            {/* Row 2: Meta pills + Item count + Chevron */}
            <div className="flex justify-between items-center">
              <div className="flex flex-wrap gap-1 items-center">
                <MetaPill>{getTimeDisplay()}</MetaPill>
                {city && (
                  <MetaPill>
                    {/* Story 14.35b: Show country indicator (flag or code) before city for foreign locations */}
                    {isForeign && renderForeignLocationIndicator()}
                    {/* Story 14.35b: Display city in user's language */}
                    {getCityName(city)}
                  </MetaPill>
                )}
                {hasItems && (
                  <MetaPill>
                    <Package size={12} strokeWidth={2} />
                    {items.length}
                  </MetaPill>
                )}
              </div>

              {/* Expand/Collapse chevron (only if has items) */}
              {hasItems && (
                <button
                  data-expand-toggle
                  className="p-1 -m-1 transition-transform duration-150"
                  style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? t('collapse') : t('expand')}
                >
                  <ChevronDown
                    size={16}
                    strokeWidth={2}
                    style={{ color: 'var(--text-tertiary)' }}
                  />
                </button>
              )}
            </div>

            {/* Duplicate Warning */}
            {isDuplicate && (
              <div
                className="flex items-center gap-1 text-xs mt-1.5"
                style={{ color: isDark ? '#fcd34d' : '#d97706' }}
                role="alert"
              >
                <AlertTriangle size={12} className="flex-shrink-0" />
                <span className="font-medium">{t('potentialDuplicate')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Items Section */}
      {hasItems && (
        <div
          className="overflow-hidden transition-all duration-200"
          style={{
            maxHeight: isExpanded ? '500px' : '0px',
          }}
        >
          <div
            className="px-3 py-2.5 border-t"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderColor: 'var(--border-light)',
            }}
          >
            {visibleItems.map((item, index) => (
              <div
                key={index}
                className="flex justify-between items-center py-1 text-xs"
              >
                <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                {/* TD-18-14: Show quantity when != 1 (including decimals) */}
                <div className="flex items-center gap-1">
                  {shouldShowQty(item.qty) && (
                    <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                      x{formatQty(item.qty)}
                    </span>
                  )}
                  <span
                    className="font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {formatCurrency(item.totalPrice, currency || defaultCurrency)}
                  </span>
                </div>
              </div>
            ))}

            {remainingCount > 0 && (
              <div className="mt-2 pt-2 border-t border-dashed" style={{ borderColor: 'var(--border-light)' }}>
                <button
                  className="flex items-center justify-center gap-1 w-full text-xs font-medium"
                  style={{ color: '#059669' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick?.();
                  }}
                >
                  <span>+{remainingCount} más</span>
                  <ChevronDown size={12} style={{ transform: 'rotate(-90deg)' }} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionCard;
