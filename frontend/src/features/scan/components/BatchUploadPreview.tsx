/**
 * Story 11.1: One Image = One Transaction - Batch Upload Preview Component
 * Story 14.15: Updated to match scan-overlay.html State 0.5b mockup design
 * Story 14e-34a: Migrated from props to useScanStore for images (AC2)
 *
 * Shows preview when user selects multiple images, confirming that each image
 * will create a separate transaction. Displays thumbnails, credit usage info,
 * and allows user to proceed with batch processing or cancel.
 *
 * @see docs/sprint-artifacts/epic11/story-11.1-one-image-one-transaction.md
 * @see docs/uxui/mockups/01_views/scan-overlay.html State 0.5b
 */
import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp, Image, AlertTriangle, Minus, Clock, ArrowRight, ScanLine } from 'lucide-react';
import { useScanImages } from '@/features/scan/store';

/** Maximum images allowed per batch (AC #7) */
export const MAX_BATCH_IMAGES = 10;

export interface BatchUploadPreviewProps {
  /**
   * Story 14e-34a: images prop removed - now reads from useScanStore.images directly.
   * This eliminates prop drilling and ensures single source of truth.
   */
  /** Theme for styling */
  theme: 'light' | 'dark';
  /** Translation function */
  t: (key: string) => string;
  /** Called when user confirms to process all images */
  onConfirm: () => void;
  /** Called when user cancels the batch upload */
  onCancel: () => void;
  /** Optional: Remove a specific image from the batch */
  onRemoveImage?: (index: number) => void;
  /** Current user credits (optional - shows credit usage section if provided) */
  credits?: { remaining: number; superRemaining?: number };
  /** Whether this batch uses super credits (default: false for normal credits) */
  usesSuperCredits?: boolean;
}

/**
 * BatchUploadPreview Component
 *
 * Displays when user selects 2+ images, showing:
 * - "X boletas detectadas" header with icon
 * - Explanation that each image = 1 transaction
 * - Collapsible thumbnail preview
 * - Credit usage section (if credits prop provided)
 * - Cancel and Process buttons with icons
 */
export const BatchUploadPreview: React.FC<BatchUploadPreviewProps> = ({
  theme,
  t,
  onConfirm,
  onCancel,
  onRemoveImage,
  credits,
  usesSuperCredits = false,
}) => {
  const [showThumbnails, setShowThumbnails] = useState(false);

  // Story 14e-34a: Read images from scan store (single source of truth)
  const images = useScanImages();

  const isDark = theme === 'dark';
  const count = images.length;

  // Check if over limit (AC #7)
  const isOverLimit = count > MAX_BATCH_IMAGES;

  // Calculate credit values
  const creditsNeeded = count;
  const creditsAvailable = usesSuperCredits
    ? (credits?.superRemaining ?? 0)
    : (credits?.remaining ?? 0);
  const creditsAfter = creditsAvailable - creditsNeeded;
  const hasEnoughCredits = creditsAfter >= 0;

  // Dynamic styling based on theme
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const textTertiary = isDark ? 'text-slate-500' : 'text-slate-500';
  const bgTertiary = isDark ? 'bg-slate-700' : 'bg-slate-100';
  const borderLight = isDark ? 'border-slate-600' : 'border-slate-200';

  return (
    <div
      className={`rounded-2xl ${cardBg} shadow-xl overflow-hidden max-w-xs w-full`}
      role="dialog"
      aria-labelledby="batch-preview-title"
      aria-describedby="batch-preview-description"
    >
      {/* Header with Icon */}
      <div className="p-5 pb-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          isDark ? 'bg-blue-900/50' : 'bg-blue-100'
        }`}>
          <Image className={isDark ? 'text-blue-400' : 'text-blue-600'} size={22} />
        </div>
        <div>
          <h2 id="batch-preview-title" className={`text-lg font-bold ${textPrimary}`}>
            {count} {t('batchReceiptsDetected')}
          </h2>
          <p id="batch-preview-description" className={`text-sm ${textSecondary}`}>
            {t('batchExplanation')}
          </p>
        </div>
      </div>

      {/* Collapsible Image Preview */}
      <div className="px-5">
        <div className={`border ${borderLight} rounded-lg overflow-hidden`}>
          {/* Toggle Header */}
          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`w-full px-3 py-2.5 ${bgTertiary} flex justify-between items-center`}
            aria-expanded={showThumbnails}
            aria-controls="thumbnail-grid"
          >
            <span className={`text-sm ${textSecondary}`}>
              {showThumbnails ? t('hideImages') : t('viewImages')}
            </span>
            {showThumbnails ? (
              <ChevronUp className={textTertiary} size={16} />
            ) : (
              <ChevronDown className={textTertiary} size={16} />
            )}
          </button>

          {/* Thumbnails Row */}
          {showThumbnails && (
            <div
              id="thumbnail-grid"
              className={`p-3 flex gap-2 overflow-x-auto ${cardBg}`}
              role="list"
              aria-label={t('batchImageList')}
            >
              {images.map((img, index) => (
                <div
                  key={index}
                  className={`relative shrink-0 w-14 h-[72px] rounded-md overflow-hidden border ${borderLight} group`}
                  role="listitem"
                >
                  <img
                    src={img}
                    alt={`${t('receipt')} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {/* Image number badge */}
                  <div className="absolute bottom-0.5 left-0.5 w-4 h-4 bg-[var(--primary)] text-white rounded flex items-center justify-center text-xs font-semibold">
                    {index + 1}
                  </div>
                  {/* Remove button - always visible for mobile/touch (Story 14e-33 AC1) */}
                  {onRemoveImage && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveImage(index);
                      }}
                      className={`absolute -top-2 -right-2 min-w-[44px] min-h-[44px] w-7 h-7 flex items-center justify-center rounded-full shadow-sm border ${
                        isDark
                          ? 'bg-slate-800/90 text-white border-slate-600 hover:bg-slate-700'
                          : 'bg-white/95 text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                      aria-label={`${t('removeImage')} ${index + 1}`}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Credit Usage Section */}
      {credits && (
        <div className="p-5 pt-4">
          {/* Section Header */}
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="text-amber-500" size={18} />
            <span className={`text-sm font-semibold ${textPrimary}`}>
              {t('creditUsage')}
            </span>
          </div>

          {/* Credit Details */}
          <div className={`${bgTertiary} rounded-lg p-3`}>
            {/* Credits needed */}
            <div className={`flex justify-between items-center py-2 border-b ${borderLight}`}>
              <div className="flex items-center gap-2">
                <Minus className={textTertiary} size={16} />
                <span className={`text-sm ${textSecondary}`}>{t('creditsNeeded')}</span>
              </div>
              <span className={`text-sm font-semibold ${textPrimary}`}>{creditsNeeded}</span>
            </div>

            {/* Credits available */}
            <div className={`flex justify-between items-center py-2 border-b ${borderLight}`}>
              <div className="flex items-center gap-2">
                <Clock className={textTertiary} size={16} />
                <span className={`text-sm ${textSecondary}`}>{t('creditsAvailable')}</span>
              </div>
              <span className={`text-sm font-semibold ${textPrimary}`}>{creditsAvailable}</span>
            </div>

            {/* Credits after batch */}
            <div className="flex justify-between items-center py-2">
              <div className="flex items-center gap-2">
                <ArrowRight className={textTertiary} size={16} />
                <span className={`text-sm ${textSecondary}`}>{t('afterBatch')}</span>
              </div>
              <span className={`text-sm font-semibold ${hasEnoughCredits ? 'text-green-500' : 'text-red-500'}`}>
                {creditsAfter}
              </span>
            </div>
          </div>

          {/* Insufficient credits warning */}
          {!hasEnoughCredits && (
            <div className={`mt-3 p-3 rounded-lg ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}>
              <p className={`text-sm ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                {t('insufficientCredits')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Over limit warning (AC #7) */}
      {isOverLimit && (
        <div className="px-5 pb-4">
          <div
            className={`flex items-center gap-2 p-3 rounded-lg ${
              isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700'
            }`}
            role="alert"
          >
            <AlertTriangle size={18} />
            <span className="text-sm font-medium">
              {t('batchMaxLimitError')}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-5 pt-4 flex gap-3">
        <button
          onClick={onCancel}
          className={`flex-1 py-3 px-4 rounded-xl font-semibold border-2 transition-colors flex items-center justify-center gap-2 ${
            isDark
              ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
              : 'border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <X size={16} />
          {t('cancel')}
        </button>
        <button
          onClick={onConfirm}
          disabled={isOverLimit || (credits && !hasEnoughCredits)}
          className={`flex-[1.2] py-3 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
            isOverLimit || (credits && !hasEnoughCredits)
              ? 'bg-slate-400 text-slate-200 cursor-not-allowed'
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          <ScanLine size={16} />
          {t('processAll')}
        </button>
      </div>
    </div>
  );
};

export default BatchUploadPreview;
