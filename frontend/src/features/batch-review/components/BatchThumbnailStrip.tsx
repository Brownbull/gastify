/**
 * BatchThumbnailStrip Component
 *
 * Story 12.1: Batch Capture UI
 * Displays a horizontal scrollable strip of captured image thumbnails
 * with remove buttons and an "Add more" placeholder.
 *
 * @see docs/sprint-artifacts/epic12/story-12.1-batch-capture-ui.md
 */

import React from 'react';
import { X, Plus } from 'lucide-react';
import type { CapturedImage } from '../hooks/useBatchCapture';

export interface BatchThumbnailStripProps {
  /** Array of captured images to display */
  images: CapturedImage[];
  /** Callback when remove button is clicked */
  onRemoveImage: (id: string) => void;
  /** Callback when "Add more" button is clicked */
  onAddMore: () => void;
  /** Whether more images can be added */
  canAddMore: boolean;
  /** Maximum images allowed */
  maxImages: number;
  /** Theme for styling */
  theme: 'light' | 'dark';
  /** Translation function */
  t: (key: string) => string;
}

/**
 * BatchThumbnailStrip Component
 *
 * Displays:
 * - Horizontal scrollable strip of thumbnail images
 * - X button on each thumbnail for removal
 * - "+ Agregar" placeholder button at the end (if under limit)
 * - Image count indicator below the strip
 */
export const BatchThumbnailStrip: React.FC<BatchThumbnailStripProps> = ({
  images,
  onRemoveImage,
  onAddMore,
  canAddMore,
  maxImages,
  theme,
  t,
}) => {
  const isDark = theme === 'dark';
  const count = images.length;

  // Dynamic styling based on theme
  const thumbnailBorder = isDark ? 'border-slate-600' : 'border-slate-200';
  const addMoreBg = isDark ? 'bg-slate-700/50' : 'bg-slate-100';
  const addMoreBorder = isDark ? 'border-slate-600' : 'border-slate-300';
  const addMoreText = isDark ? 'text-slate-400' : 'text-slate-500';
  const countText = isDark ? 'text-slate-400' : 'text-slate-600';
  const removeBtnBg = isDark ? 'bg-slate-900/80' : 'bg-white/90';
  const removeBtnText = isDark ? 'text-white' : 'text-slate-900';

  // Count indicator color: amber when near limit
  const isNearLimit = count >= maxImages - 2;
  const countColor = isNearLimit
    ? 'text-amber-500'
    : countText;

  return (
    <div className="w-full">
      {/* Horizontal scrollable thumbnail strip */}
      <div
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin"
        role="list"
        aria-label={t('batchImageList')}
      >
        {/* Thumbnails */}
        {images.map((image, index) => (
          <div
            key={image.id}
            className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border ${thumbnailBorder} group`}
            role="listitem"
          >
            <img
              src={image.thumbnailUrl}
              alt={`${t('receipt')} ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {/* Image number badge */}
            <div
              className={`absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                isDark ? 'bg-slate-900/80 text-white' : 'bg-white/90 text-slate-900'
              }`}
            >
              {index + 1}
            </div>
            {/* Remove button - visible on hover/touch */}
            <button
              onClick={() => onRemoveImage(image.id)}
              className={`absolute top-1 right-1 p-1 rounded-full transition-opacity ${removeBtnBg} ${removeBtnText} opacity-0 group-hover:opacity-100 focus:opacity-100 active:opacity-100`}
              aria-label={`${t('removeImage')} ${index + 1}`}
              type="button"
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {/* "Add more" placeholder button */}
        {canAddMore && (
          <button
            onClick={onAddMore}
            className={`flex-shrink-0 w-20 h-20 rounded-lg border-2 border-dashed ${addMoreBorder} ${addMoreBg} flex flex-col items-center justify-center gap-1 transition-colors hover:border-blue-500 focus:border-blue-500 focus:outline-none`}
            aria-label={t('batchAddMore')}
            type="button"
          >
            <Plus size={24} className={addMoreText} />
            <span className={`text-xs ${addMoreText}`}>
              {t('batchAddMore')}
            </span>
          </button>
        )}
      </div>

      {/* Image count indicator */}
      <div className={`mt-2 text-center text-sm ${countColor}`}>
        {count} {t('batchOfMax')} {maxImages} {t('batchImages')}
      </div>
    </div>
  );
};

export default BatchThumbnailStrip;
