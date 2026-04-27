/**
 * BatchCaptureView
 *
 * Story 12.1: Batch Capture UI
 * Modal-style view for batch mode image capture matching TransactionEditorView layout.
 * Header matches single transaction screen with batch icon indicator.
 *
 * Story 14d.5a: ScanContext is now the source of truth for batch state (Option A).
 * - `state.mode === 'batch'` indicates batch mode
 * - `state.images` contains captured image data URLs
 * - Image operations dispatch directly to context (addImage, removeImage, setImages)
 * - Uses imageUtils for thumbnail generation (extracted from useBatchCapture)
 * - No longer uses useBatchCapture hook - context owns all state
 *
 * @see docs/uxui/mockups/01_views/scan-overlay.html (State 0.5b: Batch Load)
 */

import React, { useRef, useCallback, useState, useMemo } from 'react';
import {
  Camera,
  Loader2,
  X,
  Image,
  ArrowRight,
  Scan,
  Images,
  ChevronLeft,
  Zap,
  Info,
  Layers,
} from 'lucide-react';
// Story TD-16-3: Extracted sub-components
import { BatchCaptureImageGallery } from './BatchCaptureImageGallery';
import { BatchCaptureCreditSection } from './BatchCaptureCreditSection';
import { MAX_BATCH_CAPTURE_IMAGES } from '../hooks/useBatchCapture';
import { formatCreditsDisplay } from '@/utils/creditFormatters';
// Story TD-16-3: DisplayImage shared with BatchCaptureImageGallery
import type { DisplayImage } from './types';
// Story 14e-11: Migrated from useScanOptional (ScanContext) to Zustand store
import { useScanActions } from '@features/scan/store';
// Story 16-6: images + isProcessing from shared workflow store
import { useWorkflowImages, useWorkflowIsProcessing } from '@shared/stores';
import { processFilesForCapture, type ProcessedImage } from '@features/batch-review/utils/imageUtils';
// Story 14e-25c.2: Navigation via Zustand store
import { useNavigation } from '@/shared/stores/useNavigationStore';

/**
 * Story 14e-25c.2: Minimal props interface for BatchCaptureView.
 * Navigation uses useNavigation() hook.
 * Batch state accessed via useScanStore().
 * Scan flow callbacks remain as props to coordinate with parent.
 */
export interface BatchCaptureViewProps {
  /** Callback when batch is ready to process - passes captured images */
  onProcessBatch: (images: string[]) => void;
  /** Callback to switch to individual scan mode */
  onSwitchToIndividual: () => void;
  /** Theme for styling */
  theme: 'light' | 'dark';
  /** Translation function */
  t: (key: string) => string;
  /** Available super credits (tier 2) to show in credit usage summary */
  superCreditsAvailable?: number;
  /** Available normal credits to show in credit usage summary */
  normalCreditsAvailable?: number;
  /** Callback when user taps on credit badges to show credit info */
  onCreditInfoClick?: () => void;
  /** Story 12.1 v9.7.0: Initial images to restore (for persistence across navigation) */
  imageDataUrls?: string[];
  /** Story 12.1 v9.7.0: Callback when images change (for persistence) */
  onImagesChange?: (dataUrls: string[]) => void;
}

/**
 * BatchCaptureView Component
 *
 * Provides the batch mode capture interface matching the TransactionEditorView layout:
 * - Header with back button, title, batch icon, credit badges, and close button
 * - Main content in a bordered card container
 * - Collapsible image preview section
 * - Credit usage breakdown
 * - Side-by-side Cancel/Process buttons with icons
 * - Button to switch back to single scan mode
 */
export const BatchCaptureView: React.FC<BatchCaptureViewProps> = ({
  onProcessBatch,
  onSwitchToIndividual,
  theme,
  t,
  superCreditsAvailable,
  normalCreditsAvailable,
  onCreditInfoClick,
  imageDataUrls,
  onImagesChange,
}) => {
  // Story 14e-25c.2: Get navigation from Zustand store
  const { navigateBack } = useNavigation();

  // Story 16-6: Read images from shared workflow store (source of truth)
  const scanStoreImages = useWorkflowImages();
  const scanStoreIsProcessing = useWorkflowIsProcessing();
  const { setImages: scanStoreSetImages, reset: scanStoreReset } = useScanActions();

  // Story 14e-25c.2: Derive processing state from store only
  const isProcessing = scanStoreIsProcessing;

  const isDark = theme === 'dark';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(true);

  // Story 14d.5a: Track thumbnails separately (context only stores data URLs)
  // This maps data URL -> thumbnail URL for display purposes
  const [thumbnailMap, setThumbnailMap] = useState<Map<string, string>>(() => {
    // Initialize from imageDataUrls prop if provided (for fallback/test mode)
    if (imageDataUrls && imageDataUrls.length > 0) {
      const map = new Map<string, string>();
      imageDataUrls.forEach(url => map.set(url, url)); // Use data URL as thumbnail for restored images
      return map;
    }
    return new Map();
  });

  // Story 14e-11: Get images from Zustand store (source of truth) or fallback to props
  const imageDataUrlsFromStore = scanStoreImages.length > 0 ? scanStoreImages : (imageDataUrls ?? []);

  // Story 14e-11: Convert store images to display format with thumbnails
  const displayImages: DisplayImage[] = useMemo(() => {
    return imageDataUrlsFromStore.map((dataUrl: string, index: number) => ({
      id: `img_${index}_${dataUrl.substring(0, 20)}`,
      dataUrl,
      thumbnailUrl: thumbnailMap.get(dataUrl) ?? dataUrl, // Fallback to full image if no thumbnail
    }));
  }, [imageDataUrlsFromStore, thumbnailMap]);

  // Computed values
  const count = displayImages.length;
  const hasImages = count > 0;
  const canAddMore = count < MAX_BATCH_CAPTURE_IMAGES;
  const maxImages = MAX_BATCH_CAPTURE_IMAGES;

  /**
   * Story 14e-11: Add images to Zustand store and generate thumbnails.
   * Uses imageUtils for thumbnail generation (extracted from useBatchCapture).
   */
  const addImages = useCallback(
    async (files: File[]): Promise<void> => {
      const availableSlots = maxImages - count;
      if (availableSlots <= 0) {
        console.warn('Batch capture limit reached');
        return;
      }

      // Only process up to available slots
      const filesToAdd = files.slice(0, availableSlots);

      try {
        // Process files to get data URLs and thumbnails
        const processed: ProcessedImage[] = await processFilesForCapture(filesToAdd, availableSlots);

        // Get current images from Zustand store
        const currentImages = scanStoreImages.length > 0 ? scanStoreImages : (imageDataUrls ?? []);

        // Add new data URLs to store
        const newDataUrls = processed.map(p => p.dataUrl);
        const allImages = [...currentImages, ...newDataUrls];

        // Update Zustand store (source of truth)
        scanStoreSetImages(allImages);

        // Update thumbnail map
        setThumbnailMap(prev => {
          const newMap = new Map(prev);
          processed.forEach(p => {
            newMap.set(p.dataUrl, p.thumbnailUrl);
          });
          return newMap;
        });

        // Also call prop callback for backwards compatibility during migration
        onImagesChange?.(allImages);
      } catch (error) {
        console.error('Failed to add images to batch:', error);
        throw error;
      }
    },
    [count, maxImages, scanStoreImages, scanStoreSetImages, imageDataUrls, onImagesChange]
  );

  /**
   * Story 14e-11: Remove image by index.
   */
  const removeImageByIndex = useCallback(
    (index: number): void => {
      const currentImages = scanStoreImages.length > 0 ? scanStoreImages : (imageDataUrls ?? []);
      if (index < 0 || index >= currentImages.length) return;

      const imageToRemove = currentImages[index];
      const newImages = currentImages.filter((_: string, i: number) => i !== index);

      // Update Zustand store (source of truth)
      scanStoreSetImages(newImages);

      // Clean up thumbnail
      setThumbnailMap(prev => {
        const newMap = new Map(prev);
        newMap.delete(imageToRemove);
        return newMap;
      });

      // Also call prop callback for backwards compatibility
      onImagesChange?.(newImages);
    },
    [scanStoreImages, scanStoreSetImages, imageDataUrls, onImagesChange]
  );

  /**
   * Story 14e-11: Clear all images and reset Zustand store.
   */
  const handleClearBatch = useCallback(() => {
    // Clear thumbnail map
    setThumbnailMap(new Map());

    // Reset Zustand store state
    scanStoreReset();

    // Notify parent
    onImagesChange?.([]);
  }, [scanStoreReset, onImagesChange]);

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
   * Handle process batch action - pass images from context to callback.
   */
  const handleProcessBatch = useCallback(() => {
    if (displayImages.length > 0) {
      const dataUrls = displayImages.map(img => img.dataUrl);
      onProcessBatch(dataUrls);
    }
  }, [displayImages, onProcessBatch]);

  /**
   * Handle cancel with confirmation if 2+ images exist.
   * Story 14d.5a: Uses handleClearBatch to also reset context
   * Story 14e-25c.2: Uses navigateBack() instead of onBack prop
   */
  const handleCancel = useCallback(() => {
    if (count >= 2 && !confirmingCancel) {
      setConfirmingCancel(true);
      return;
    }
    handleClearBatch();
    navigateBack();
  }, [count, confirmingCancel, handleClearBatch, navigateBack]);

  /**
   * Handle switch to single scan mode.
   * Story 14d.5a: Uses handleClearBatch to also reset context
   */
  const handleSwitchToSingle = useCallback(() => {
    handleClearBatch();
    onSwitchToIndividual();
  }, [handleClearBatch, onSwitchToIndividual]);

  // Check if user has enough credits
  // Batch scanning uses only 1 super credit for the entire batch (up to 10 images)
  const creditsNeeded = hasImages ? 1 : 0;
  const hasEnoughCredits = superCreditsAvailable === undefined || superCreditsAvailable >= creditsNeeded;
  const creditsRemaining = superCreditsAvailable !== undefined ? superCreditsAvailable - creditsNeeded : 0;

  // Check if we have credits to display
  const hasCredits = superCreditsAvailable !== undefined || normalCreditsAvailable !== undefined;

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Animation styles for process button */}
      <style>
        {`
          @keyframes batch-process-pulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
            50% { transform: scale(1.02); box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
          }
          @keyframes batch-icon-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.15); }
          }
        `}
      </style>

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

      {/* Header - matching TransactionEditorView layout exactly */}
      <div
        className="sticky px-4"
        style={{
          top: 0,
          zIndex: 50,
          backgroundColor: 'var(--bg)',
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{
            height: '72px',
            paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)',
          }}
        >
          {/* Left side: Back button + Title + Batch icon */}
          <div className="flex items-center gap-0">
            <button
              onClick={handleCancel}
              className="min-w-10 min-h-10 flex items-center justify-center -ml-1"
              aria-label={t('back')}
              style={{ color: 'var(--text-primary)' }}
            >
              <ChevronLeft size={28} strokeWidth={2.5} />
            </button>
            <h1
              className="font-semibold whitespace-nowrap"
              style={{
                fontFamily: 'var(--font-family)',
                color: 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '20px',
              }}
            >
              {t('scanViewTitle') || 'Escanea'}
            </h1>
            {/* Batch mode indicator icon - same color as title, no background */}
            <Layers
              size={20}
              strokeWidth={2}
              className="ml-2 flex-shrink-0"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>

          {/* Right side: Credit badges + Close button */}
          <div className="flex items-center gap-2">
            {/* Credit badges */}
            {hasCredits && (
              <button
                onClick={onCreditInfoClick}
                className="flex items-center gap-1.5 px-2 py-1 rounded-full transition-all active:scale-95"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-light)',
                }}
                aria-label={t('creditInfo')}
              >
                {superCreditsAvailable !== undefined && (
                  <div
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold"
                    style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
                  >
                    <Zap size={10} strokeWidth={2.5} />
                    <span>{formatCreditsDisplay(superCreditsAvailable)}</span>
                  </div>
                )}
                {normalCreditsAvailable !== undefined && (
                  <div
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold"
                    style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}
                  >
                    <Camera size={10} strokeWidth={2.5} />
                    <span>{formatCreditsDisplay(normalCreditsAvailable)}</span>
                  </div>
                )}
                <Info size={12} style={{ color: 'var(--text-tertiary)' }} />
              </button>
            )}
            {/* Close button */}
            <button
              onClick={handleCancel}
              className="min-w-10 min-h-10 flex items-center justify-center -mr-1"
              aria-label={t('close')}
              style={{ color: 'var(--text-primary)' }}
            >
              <X size={24} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* Main content - matching TransactionEditorView margins */}
      <div className="flex-1 px-3 pb-4 overflow-y-auto">
        {/* Main card - matching TransactionEditorView container */}
        <div
          className="rounded-2xl p-4"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            border: '1px solid var(--border-light)',
          }}
        >
          {/* Header with Icon - shows count or empty state */}
          <div
            className="flex items-center gap-3 pb-4 mb-4"
            style={{ borderBottom: '1px solid var(--border-light)' }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'var(--primary-light)' }}
            >
              <Image size={24} style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {hasImages
                  ? `${count} ${t('batchReceiptsDetected')}`
                  : t('batchEmptyState')
                }
              </div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {hasImages
                  ? t('batchEachImageTransaction')
                  : t('batchSelectImages')
                }
              </div>
            </div>
          </div>

          {/* Collapsible Image Preview */}
          <BatchCaptureImageGallery
            displayImages={displayImages}
            hasImages={hasImages}
            canAddMore={canAddMore}
            showImageGallery={showImageGallery}
            onToggleGallery={() => setShowImageGallery(!showImageGallery)}
            onAddPhoto={handleAddPhoto}
            onRemoveImage={removeImageByIndex}
            t={t}
          />

          {/* Credit Usage Section - always show when superCreditsAvailable is provided */}
          {superCreditsAvailable !== undefined && (
            <BatchCaptureCreditSection
              superCreditsAvailable={superCreditsAvailable}
              creditsNeeded={creditsNeeded}
              creditsRemaining={creditsRemaining}
              hasImages={hasImages}
              t={t}
            />
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Main action buttons - side by side */}
            <div className="flex gap-3">
              {/* Cancel button with icon */}
              <button
                onClick={handleCancel}
                disabled={isProcessing}
                className="flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-light)',
                }}
                type="button"
              >
                <X size={16} />
                {t('batchCancelBtn')}
              </button>

              {/* Process/Attach button with icon and animation */}
              {hasImages ? (
                <button
                  onClick={handleProcessBatch}
                  disabled={isProcessing || count === 0 || !hasEnoughCredits}
                  className="flex-[1.2] py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-white"
                  style={{
                    background: isProcessing || count === 0 || !hasEnoughCredits
                      ? (isDark ? '#475569' : '#9ca3af')
                      : 'linear-gradient(135deg, var(--success), #059669)',
                    animation: !prefersReducedMotion && !isProcessing && hasEnoughCredits && count > 0
                      ? 'batch-process-pulse 1.5s ease-in-out infinite'
                      : 'none',
                  }}
                  type="button"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {t('batchProcessing')}
                    </>
                  ) : (
                    <>
                      <Scan
                        size={16}
                        style={{
                          animation: !prefersReducedMotion && hasEnoughCredits && count > 0
                            ? 'batch-icon-pulse 1.5s ease-in-out infinite'
                            : 'none',
                        }}
                      />
                      {t('batchProcessAll')}
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleAddPhoto}
                  disabled={isProcessing}
                  className="flex-[1.2] py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                    color: '#78350f',
                  }}
                  type="button"
                >
                  <Camera size={16} />
                  {t('batchCapturePhoto')}
                </button>
              )}
            </div>

            {/* Switch to single scan button */}
            <button
              onClick={handleSwitchToSingle}
              disabled={isProcessing}
              className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--primary)',
                border: '1px dashed var(--primary)',
              }}
              type="button"
            >
              <Images size={16} />
              {t('batchSwitchToSingle')}
            </button>
          </div>
        </div>
      </div>

      {/* Cancel confirmation dialog */}
      {confirmingCancel && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setConfirmingCancel(false)}
        >
          <div
            className="rounded-2xl p-6 max-w-sm w-full shadow-xl"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-labelledby="cancel-dialog-title"
          >
            <h3
              id="cancel-dialog-title"
              className="text-lg font-bold mb-3"
              style={{ color: 'var(--text-primary)' }}
            >
              {t('batchCancelConfirmTitle')}
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              {t('batchCancelConfirmMessage').replace('{count}', String(count))}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setConfirmingCancel(false);
                  handleClearBatch();
                  navigateBack();
                }}
                className="flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                <X size={16} />
                {t('batchCancelConfirmYes')}
              </button>
              <button
                onClick={() => setConfirmingCancel(false)}
                className="flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                }}
              >
                <ArrowRight size={16} />
                {t('batchCancelConfirmNo')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchCaptureView;
