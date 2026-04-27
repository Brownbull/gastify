/**
 * InsightDetailModal - Modal showing insight details
 *
 * Story 10a.4 Enhancement: Insight detail view on click
 * Story 14.33a.1: Theme-aware insight type colors
 *
 * Shows full insight information with option to navigate to transaction.
 * Simplified design: X close only, centered View Transaction button.
 */

import React, { useState } from 'react';
import { X, ExternalLink, Trash2 } from 'lucide-react';
import { InsightRecord } from '@/types/insight';
import {
  getInsightConfig,
  getIconByName,
  getInsightFallbackInfo,
  getVisualType,
  getVisualConfig,
} from '../utils/insightTypeConfig';
import { toDateSafe, type TimestampLike } from '@/utils/timestamp';

interface InsightDetailModalProps {
  insight: InsightRecord;
  onClose: () => void;
  onNavigateToTransaction: () => void;
  onDelete: () => Promise<void>;
  theme: string;
  t: (key: string) => string;
}

export const InsightDetailModal: React.FC<InsightDetailModalProps> = ({
  insight,
  onClose,
  onNavigateToTransaction,
  onDelete,
  theme,
  t,
}) => {
  const isDark = theme === 'dark';
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch {
      setIsDeleting(false);
    }
  };

  // Get config based on insight type
  const config = getInsightConfig(insight.insightId, insight.category, isDark);
  const IconComponent = getIconByName(insight.icon || config.icon);

  // Story 14.33a.1: Get theme-aware visual config for consistent styling
  const visualType = getVisualType(insight.category, insight.insightId);
  const visualConfig = getVisualConfig(visualType);

  // Format date
  const formatDate = (timestamp: unknown) => {
    const date = toDateSafe(timestamp as TimestampLike);
    if (!date) return '';
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Fallback for old records - generate a meaningful message based on insight type
  const title = insight.title || insight.insightId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  // Get fallback info for this insight type
  const fallbackInfo = getInsightFallbackInfo(insight.insightId);
  const fallbackMessage = fallbackInfo.message || t('noMessageAvailable') || 'No additional details available';

  // Use stored message if available, otherwise use fallback
  const message = insight.message || fallbackMessage;

  // Determine if this insight needs transaction context to be meaningful
  const needsContext = fallbackInfo.needsContext;

  // Check if we have a real transaction ID (not 'temp' placeholder)
  const hasRealTransactionId = !!insight.transactionId && insight.transactionId !== 'temp';

  // Show View Transaction button if:
  // 1. We have a real transaction ID, OR
  // 2. The insight needs context (so user knows they should see the transaction, even if unavailable)
  const showTransactionButton = hasRealTransactionId || (needsContext && !!insight.transactionId);

  // If we have a temp ID but need context, show that transaction is unavailable
  const transactionUnavailable = needsContext && insight.transactionId === 'temp';

  // Story 11.6: Modal with safe area padding (AC #3, #6)
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        padding: 'calc(1rem + var(--safe-top, 0px)) calc(1rem + var(--safe-right, 0px)) calc(1rem + var(--safe-bottom, 0px)) calc(1rem + var(--safe-left, 0px))',
      }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden="true"
      />

      {/* Modal - wider and centered */}
      <div
        className="relative w-full max-w-sm rounded-2xl shadow-xl overflow-hidden"
        style={{ backgroundColor: 'var(--surface)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="insight-modal-title"
      >
        {/* Close X button - top right */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-full transition-colors min-w-10 min-h-10 flex items-center justify-center z-10"
          style={{
            color: 'var(--secondary)',
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          }}
          aria-label={t('close') || 'Close'}
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="p-6 pt-12 text-center">
          {/* Story 14.33a.1: Icon with theme-aware type-specific color */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: visualConfig.bgColor }}
            aria-hidden="true"
          >
            <IconComponent size={32} style={{ color: visualConfig.iconColor }} />
          </div>

          {/* Title */}
          <h2
            id="insight-modal-title"
            className="text-xl font-bold mb-2 capitalize"
            style={{ color: 'var(--primary)' }}
          >
            {title}
          </h2>

          {/* Message */}
          <p
            className="text-base leading-relaxed mb-4"
            style={{ color: 'var(--secondary)' }}
          >
            {message}
          </p>

          {/* Date */}
          <p
            className="text-sm mb-6"
            style={{ color: 'var(--secondary)', opacity: 0.7 }}
          >
            {formatDate(insight.shownAt)}
          </p>

          {/* View Transaction button - shows for contextual insights */}
          {showTransactionButton && (
            transactionUnavailable ? (
              // Show disabled state when transaction is from old data
              <div className="w-full py-3 px-4 rounded-xl font-medium text-center min-h-12 flex flex-col items-center justify-center gap-1 mb-3"
                style={{
                  backgroundColor: isDark ? '#374151' : '#f3f4f6',
                  color: isDark ? '#9ca3af' : '#6b7280',
                }}
              >
                <span className="text-sm">{t('transactionUnavailable') || 'Transaction details unavailable'}</span>
                <span className="text-xs opacity-70">{t('oldInsightData') || 'This insight was recorded before detailed tracking'}</span>
              </div>
            ) : (
              // Story 14.33a.1: Button uses theme-aware insight type color
              <button
                onClick={onNavigateToTransaction}
                className="w-full py-3 px-4 rounded-xl font-medium transition-colors min-h-12 flex items-center justify-center gap-2 mb-3"
                style={{
                  backgroundColor: visualConfig.iconColor,
                  color: 'white',
                }}
              >
                <ExternalLink size={18} />
                {t('viewTransaction') || 'View Transaction'}
              </button>
            )
          )}

          {/* Delete button - Story 14.16b: Using semantic negative colors for destructive action */}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full py-3 px-4 rounded-xl font-medium transition-colors min-h-12 flex items-center justify-center gap-2"
            style={{
              backgroundColor: 'var(--negative-bg)',
              color: 'var(--error)',
              opacity: isDeleting ? 0.6 : 1,
            }}
          >
            <Trash2 size={18} />
            {isDeleting ? (t('deleting') || 'Deleting...') : (t('deleteInsight') || 'Delete Insight')}
          </button>
        </div>
      </div>
    </div>
  );
};
