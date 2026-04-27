/**
 * BatchCaptureUI Component
 *
 * Story 12.1: Batch Capture UI
 * Multi-image capture interface with preview strip and mode toggle.
 * Entry point for batch mode scanning.
 *
 * Features:
 * - Mode toggle: Individual vs Batch mode
 * - Horizontal thumbnail strip showing captured images
 * - "Capturar otra" / "Procesar lote" action buttons
 * - Image count indicator (X de 10)
 * - Cancel batch returns to normal scan mode
 *
 * @see docs/sprint-artifacts/epic12/story-12.1-batch-capture-ui.md
 */

import React, { useRef, useCallback, useState } from 'react';
import { Camera, Images, ArrowLeft, Loader2 } from 'lucide-react';
import { BatchThumbnailStrip } from './BatchThumbnailStrip';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { useBatchCapture, MAX_BATCH_CAPTURE_IMAGES } from '../hooks/useBatchCapture';
import type { CapturedImage } from '../hooks/useBatchCapture';

export interface BatchCaptureUIProps {
  /** Whether batch mode is active */
  isBatchMode: boolean;
  /** Callback to toggle batch mode */
  onToggleMode: (isBatch: boolean) => void;
  /** Callback when batch is ready to process */
  onProcessBatch: (images: CapturedImage[]) => void;
  /** Callback to cancel batch mode */
  onCancel: () => void;
  /** Whether batch is currently being processed */
  isProcessing?: boolean;
  /** Theme for styling */
  theme: 'light' | 'dark';
  /** Translation function */
  t: (key: string) => string;
}

/**
 * BatchCaptureUI Component
 *
 * Main component for batch image capture with:
 * - Mode toggle at the top
 * - Camera viewfinder area
 * - Thumbnail strip showing captured images
 * - Action buttons based on state
 */
export const BatchCaptureUI: React.FC<BatchCaptureUIProps> = ({
  isBatchMode,
  onToggleMode,
  onProcessBatch,
  onCancel,
  isProcessing = false,
  theme,
  t,
}) => {
  const isDark = theme === 'dark';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Use the batch capture hook for state management
  const {
    images,
    addImages,
    removeImage,
    clearBatch,
    canAddMore,
    count,
    maxImages,
    hasImages,
  } = useBatchCapture(MAX_BATCH_CAPTURE_IMAGES);

  // Theme-based styling
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const cardBorder = isDark ? 'border-slate-700' : 'border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const toggleBg = isDark ? 'bg-slate-700' : 'bg-slate-100';
  const toggleActive = 'bg-blue-600 text-white';
  const toggleInactive = isDark ? 'text-slate-300' : 'text-slate-600';
  const captureAreaBg = isDark ? 'bg-slate-900' : 'bg-slate-50';
  const captureAreaBorder = isDark ? 'border-slate-700' : 'border-slate-200';

  /**
   * Handle file selection from input.
   */
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.length) return;

      const files = Array.from(e.target.files);
      try {
        await addImages(files);
      } catch (error) {
        console.error('Failed to add images:', error);
      }

      // Reset input to allow selecting same files again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [addImages]
  );

  /**
   * Open file picker for adding photos.
   */
  const handleAddPhoto = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * Handle process batch action.
   */
  const handleProcessBatch = useCallback(() => {
    if (images.length > 0) {
      onProcessBatch(images);
    }
  }, [images, onProcessBatch]);

  /**
   * Handle cancel with confirmation if images exist.
   */
  const handleCancel = useCallback(() => {
    if (count >= 2) {
      // Show styled confirmation for 2+ images (AC #8)
      setShowCancelConfirm(true);
    } else {
      clearBatch();
      onCancel();
    }
  }, [count, clearBatch, onCancel]);

  /**
   * Confirm cancel action from dialog.
   */
  const handleConfirmCancel = useCallback(() => {
    setShowCancelConfirm(false);
    clearBatch();
    onCancel();
  }, [clearBatch, onCancel]);

  /**
   * Dismiss cancel confirmation dialog.
   */
  const handleDismissCancel = useCallback(() => {
    setShowCancelConfirm(false);
  }, []);

  return (
    <>
    <div className={`rounded-2xl border ${cardBorder} ${cardBg} overflow-hidden`}>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        disabled={isProcessing}
      />

      {/* Header with back button and mode toggle */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          {/* Back button */}
          <button
            onClick={handleCancel}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
            }`}
            aria-label={t('back')}
            type="button"
          >
            <ArrowLeft size={20} className={textPrimary} />
          </button>

          {/* Mode toggle (AC #1) */}
          <div
            className={`flex rounded-lg p-1 ${toggleBg}`}
            role="tablist"
            aria-label={t('batchModeSelector')}
          >
            <button
              onClick={() => onToggleMode(false)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                !isBatchMode ? toggleActive : toggleInactive
              }`}
              role="tab"
              aria-selected={!isBatchMode}
              type="button"
            >
              {t('batchModeIndividual')}
            </button>
            <button
              onClick={() => onToggleMode(true)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isBatchMode ? toggleActive : toggleInactive
              }`}
              role="tab"
              aria-selected={isBatchMode}
              type="button"
            >
              {t('batchModeBatch')}
            </button>
          </div>

          {/* Spacer for alignment */}
          <div className="w-10" />
        </div>

        {/* Batch mode indicator text */}
        {isBatchMode && (
          <p className={`text-sm ${textSecondary} text-center`}>
            {t('batchModeHint')}
          </p>
        )}
      </div>

      {/* Main capture area */}
      <div className="p-4">
        {/* Capture area placeholder - shows camera icon when no images */}
        {!hasImages && (
          <div
            className={`aspect-[4/3] rounded-xl border-2 border-dashed ${captureAreaBorder} ${captureAreaBg} flex flex-col items-center justify-center gap-3 mb-4`}
          >
            <div className={`p-4 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
              {isBatchMode ? (
                <Images size={32} className={textSecondary} />
              ) : (
                <Camera size={32} className={textSecondary} />
              )}
            </div>
            <p className={`text-sm ${textSecondary}`}>
              {t('batchTapToCapture')}
            </p>
          </div>
        )}

        {/* Thumbnail strip when images exist (AC #3) */}
        {hasImages && (
          <div className="mb-4">
            <BatchThumbnailStrip
              images={images}
              onRemoveImage={removeImage}
              onAddMore={handleAddPhoto}
              canAddMore={canAddMore}
              maxImages={maxImages}
              theme={theme}
              t={t}
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          {/* Primary action: Add photo or Process batch */}
          {!hasImages ? (
            <button
              onClick={handleAddPhoto}
              disabled={isProcessing}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
              type="button"
            >
              <Camera size={20} />
              {t('batchCapturePhoto')}
            </button>
          ) : (
            <>
              {/* "Capturar otra" button (AC #4) */}
              {canAddMore && (
                <button
                  onClick={handleAddPhoto}
                  disabled={isProcessing}
                  className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 border-2 transition-colors ${
                    isDark
                      ? 'border-blue-500 text-blue-400 hover:bg-blue-500/10'
                      : 'border-blue-600 text-blue-600 hover:bg-blue-50'
                  } disabled:opacity-50`}
                  type="button"
                >
                  <Camera size={20} />
                  {t('batchCaptureAnother')}
                </button>
              )}

              {/* "Procesar lote" button (AC #5) */}
              <button
                onClick={handleProcessBatch}
                disabled={isProcessing || count === 0}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
                type="button"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    {t('batchProcessing')}
                  </>
                ) : (
                  <>
                    <Images size={20} />
                    {t('batchProcessBatch')} ({count})
                  </>
                )}
              </button>
            </>
          )}

          {/* Cancel button (AC #8) */}
          {hasImages && !isProcessing && (
            <button
              onClick={handleCancel}
              className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                isDark
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              type="button"
            >
              {t('batchCancel')}
            </button>
          )}
        </div>
      </div>
    </div>

    {/* Cancel confirmation dialog (AC #8) */}
    <ConfirmationDialog
      isOpen={showCancelConfirm}
      title={t('batchCancelConfirmTitle')}
      message={t('batchCancelConfirmMessage').replace('{count}', String(count))}
      confirmText={t('batchCancelConfirmYes')}
      cancelText={t('batchCancelConfirmNo')}
      theme={theme}
      onConfirm={handleConfirmCancel}
      onCancel={handleDismissCancel}
      isDestructive
    />
    </>
  );
};

export default BatchCaptureUI;
