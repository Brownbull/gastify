/**
 * BatchReviewCard Component
 *
 * Story 14e-15: Migrated from src/components/batch/BatchSummaryCard.tsx
 * Story 12.3: Batch Review Queue (AC #2, #3, #4, #7)
 * Story 12.1 v9.7.0: Redesigned to match transaction list card style
 *
 * Displays a transaction card for batch review that matches the HistoryView style:
 * - Receipt thumbnail on left with category badge
 * - Merchant name (colored) and amount on first row
 * - Meta pills (date, time, location, item count) on second row
 * - Expandable items section (first 5 items)
 * - Edit and Discard buttons
 *
 * Store Integration (Story 14e-15 - AC5):
 * - discardItem action is consumed directly from useBatchReviewStore
 * - onDiscard prop is optional for backwards compatibility during migration
 *
 * @see docs/sprint-artifacts/epic12/story-12.3-batch-review-queue.md
 */

import React, { useState } from 'react';
import { useBatchReviewStore } from '../store';
import {
  ChevronDown,
  Edit2,
  Trash2,
  RefreshCw,
  Check,
  AlertTriangle,
  Receipt,
  Package,
  Clock,
  MapPin,
  Save,
  Loader2,
} from 'lucide-react';
import { getCategoryEmoji } from '@/utils/categoryEmoji';
import { getCategoryColorsAuto } from '@/config/categoryColors';
import { formatCurrency } from '@/utils/currency';
import type { Currency } from '@/types/settings';
import type { BatchReceipt, BatchReceiptStatus } from '@/types/batchReceipt';
import { formatQty, shouldShowQty } from '@entities/transaction/utils/qtyUtils';

export interface BatchReviewCardProps {
  /** The receipt to display */
  receipt: BatchReceipt;
  /** Current theme */
  theme: 'light' | 'dark';
  /** Display currency */
  currency: Currency;
  /** Translation function */
  t: (key: string) => string;
  /** Called when Save button is clicked - Story 12.1 v9.7.0 */
  onSave?: () => Promise<void>;
  /** Called when Edit button is clicked */
  onEdit: () => void;
  /**
   * Called when Discard button is clicked.
   * Optional - if not provided, uses store's discardItem action directly (Story 14e-15 AC5).
   * @deprecated Prefer omitting this prop to use the store action directly.
   */
  onDiscard?: () => void;
  /** Called when Retry button is clicked (error state only) */
  onRetry?: () => void;
}

/** Maximum items to show in expanded section */
const MAX_VISIBLE_ITEMS = 5;

/**
 * Get status badge configuration
 */
function getStatusConfig(
  status: BatchReceiptStatus,
  isDark: boolean
): {
  icon: React.ReactNode;
  label: string;
  bgColor: string;
  textColor: string;
} {
  switch (status) {
    case 'ready':
      // Story 12.1 v9.7.0: Use primary (blue) colors for ready status
      return {
        icon: <Check size={12} />,
        label: 'batchItemReady',
        bgColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#dbeafe', // primary-light
        textColor: isDark ? '#93c5fd' : '#2563eb', // primary
      };
    case 'edited':
      return {
        icon: <Edit2 size={12} />,
        label: 'batchReviewEdited',
        bgColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe',
        textColor: isDark ? '#93c5fd' : '#1d4ed8',
      };
    case 'review':
      return {
        icon: <AlertTriangle size={12} />,
        label: 'batchReviewNeeded',
        bgColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7',
        textColor: isDark ? '#fcd34d' : '#b45309',
      };
    case 'error':
      return {
        icon: <AlertTriangle size={12} />,
        label: 'batchReviewError',
        bgColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
        textColor: isDark ? '#fca5a5' : '#dc2626',
      };
  }
}

/**
 * Meta pill component - small rounded badge for metadata
 */
const MetaPill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
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

/**
 * BatchReviewCard Component
 *
 * Redesigned to match the TransactionCard style from HistoryView
 */
export const BatchReviewCard: React.FC<BatchReviewCardProps> = ({
  receipt,
  theme,
  currency,
  t,
  onSave,
  onEdit,
  onDiscard,
  onRetry,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isDark = theme === 'dark';

  // Story 14e-15 AC5: Get discardItem action directly from store
  const discardItemFromStore = useBatchReviewStore((state) => state.discardItem);

  /**
   * Handle discard button click.
   * Uses store action directly (AC5), with fallback to prop for backwards compatibility.
   */
  const handleDiscard = () => {
    if (onDiscard) {
      // Backwards compatibility: use prop if provided
      onDiscard();
    } else {
      // AC5: Use store action directly with receipt.id
      discardItemFromStore(receipt.id);
    }
  };
  const { transaction, status, error, imageUrl } = receipt;

  // Get status configuration
  const statusConfig = getStatusConfig(status, isDark);

  // Get category info
  const categoryEmoji = getCategoryEmoji(transaction.category);
  const categoryColors = getCategoryColorsAuto(transaction.category);

  // Display values - use transaction's currency if available (for multi-currency receipts like GBP)
  const displayName = transaction.alias || transaction.merchant || t('unknown');
  const displayCurrency = transaction.currency || currency;
  const formattedTotal = formatCurrency(transaction.total || 0, displayCurrency);
  const items = transaction.items || [];
  const hasItems = items.length > 0;
  const visibleItems = items.slice(0, MAX_VISIBLE_ITEMS);
  const remainingCount = items.length - MAX_VISIBLE_ITEMS;

  // Format date/time
  const formatDateTime = () => {
    if (!transaction.date) return null;
    const dateStr = transaction.date;
    const timeStr = transaction.time;

    try {
      const date = new Date(dateStr);
      const formatted = date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
      return timeStr ? `${formatted}, ${timeStr}` : formatted;
    } catch {
      return dateStr;
    }
  };

  const dateTimeDisplay = formatDateTime();

  // Toggle expand
  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  // Story 12.1 v9.7.0: Handle individual save
  const handleSave = async () => {
    if (!onSave || isSaving) return;
    setIsSaving(true);
    try {
      await onSave();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="rounded-xl overflow-hidden border"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor:
          status === 'error'
            ? isDark
              ? '#fca5a5'
              : '#dc2626'
            : status === 'review'
              ? isDark
                ? '#fcd34d'
                : '#f59e0b'
              : 'var(--border-light)',
        borderWidth: status === 'error' || status === 'review' ? '2px' : '1px',
      }}
      role="article"
      aria-label={`${t('receipt')}: ${displayName}`}
    >
      {/* Main Card Content */}
      <div className="p-3">
        <div className="flex gap-[10px] items-start">
          {/* Receipt Thumbnail with Category Badge */}
          <div className="relative flex-shrink-0 w-10 h-[46px]">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={`Receipt from ${displayName}`}
                className="w-10 h-[46px] object-cover rounded-md border"
                style={{ borderColor: 'var(--border-light)' }}
              />
            ) : (
              <div
                className="w-full h-full rounded-md flex items-center justify-center border"
                style={{
                  background: 'linear-gradient(135deg, var(--bg-tertiary) 0%, var(--border-light) 100%)',
                  borderColor: 'var(--border-light)',
                }}
              >
                <Receipt size={18} strokeWidth={1.2} style={{ color: 'var(--text-tertiary)', opacity: 0.7 }} />
              </div>
            )}
            {/* Category badge */}
            <div
              className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full flex items-center justify-center text-sm shadow-sm"
              style={{ backgroundColor: categoryColors.bg }}
              aria-hidden="true"
            >
              {categoryEmoji}
            </div>
          </div>

          {/* Info Section */}
          <div className="flex-1 min-w-0">
            {/* Row 1: Merchant + Amount */}
            <div className="flex justify-between items-start mb-1">
              <span className="font-semibold text-sm truncate" style={{ color: categoryColors.fg }}>
                {displayName}
              </span>
              <span
                className="font-semibold text-sm whitespace-nowrap flex-shrink-0 ml-2"
                style={{ color: 'var(--text-primary)' }}
              >
                {formattedTotal}
              </span>
            </div>

            {/* Row 2: Meta pills + Chevron */}
            <div className="flex justify-between items-center">
              <div className="flex flex-wrap gap-1 items-center">
                {dateTimeDisplay && (
                  <MetaPill>
                    <Clock size={10} strokeWidth={2} />
                    {dateTimeDisplay}
                  </MetaPill>
                )}
                {transaction.city && (
                  <MetaPill>
                    <MapPin size={10} strokeWidth={2} />
                    {transaction.city}
                  </MetaPill>
                )}
                {hasItems && (
                  <MetaPill>
                    <Package size={12} strokeWidth={2} />
                    {items.length}
                  </MetaPill>
                )}
                {/* Status badge */}
                <span
                  className="inline-flex items-center gap-1 px-[6px] py-[3px] rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: statusConfig.bgColor,
                    color: statusConfig.textColor,
                  }}
                >
                  {statusConfig.icon}
                  {t(statusConfig.label)}
                </span>
              </div>

              {/* Expand/Collapse chevron (only if has items) */}
              {hasItems && (
                <button
                  onClick={handleToggleExpand}
                  className="p-1 -m-1 transition-transform duration-150"
                  style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? t('collapse') : t('expand')}
                >
                  <ChevronDown size={16} strokeWidth={2} style={{ color: 'var(--text-tertiary)' }} />
                </button>
              )}
            </div>

            {/* Error message */}
            {status === 'error' && error && (
              <p className="text-xs mt-1.5" style={{ color: isDark ? '#fca5a5' : '#dc2626' }}>
                {error}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Items Section */}
      {hasItems && (
        <div
          className="overflow-hidden transition-all duration-200"
          style={{
            maxHeight: isExpanded ? '300px' : '0px',
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
              <div key={index} className="flex justify-between items-center py-1 text-xs">
                <span className="truncate" style={{ color: 'var(--text-secondary)' }}>
                  {item.name}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  {shouldShowQty(item.qty) && (
                    <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                      x{formatQty(item.qty)}
                    </span>
                  )}
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {formatCurrency(item.totalPrice || 0, displayCurrency)}
                  </span>
                </div>
              </div>
            ))}
            {remainingCount > 0 && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                +{remainingCount} {t('more')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons - Always visible */}
      <div
        className="flex items-center justify-end gap-2 px-3 py-2.5 border-t"
        style={{ borderColor: 'var(--border-light)' }}
      >
        {/* Retry button (only for error state) */}
        {status === 'error' && onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7',
              color: isDark ? '#fcd34d' : '#b45309',
            }}
            aria-label={t('batchRetry')}
          >
            <RefreshCw size={14} />
            {t('batchRetry')}
          </button>
        )}

        {/* Story 12.1 v9.7.0: Save button - save individual receipt */}
        {/* Uses primary (blue) colors - same as what Edit used to have */}
        {onSave && status !== 'error' && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: isSaving ? 'var(--primary-light)' : 'var(--primary-light)',
              color: 'var(--primary)',
              opacity: isSaving ? 0.7 : 1,
            }}
            aria-label={t('save')}
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {t('save')}
          </button>
        )}

        {/* Edit button - Story 12.1 v9.7.0: Uses neutral colors */}
        <button
          onClick={onEdit}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: isDark ? '#2a2824' : '#f4f2f0',
            color: isDark ? '#b8b0a8' : '#7a7268',
            opacity: isSaving ? 0.5 : 1,
          }}
          aria-label={t('batchReviewEdit')}
        >
          <Edit2 size={14} />
          {t('batchReviewEdit')}
        </button>

        {/* Discard button - Story 14e-15 AC5: Uses handleDiscard with store action */}
        <button
          onClick={handleDiscard}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
            color: isDark ? '#fca5a5' : '#dc2626',
            opacity: isSaving ? 0.5 : 1,
          }}
          aria-label={t('batchReviewDiscard')}
        >
          <Trash2 size={14} />
          {t('batchReviewDiscard')}
        </button>
      </div>
    </div>
  );
};

export default BatchReviewCard;
