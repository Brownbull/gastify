/**
 * BatchCaptureImageGallery
 *
 * Story TD-16-3: Extracted from BatchCaptureView.tsx to reduce file size.
 * Collapsible image gallery with thumbnails for batch capture mode.
 */

import React from 'react';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { DisplayImage } from './types';

export interface BatchCaptureImageGalleryProps {
  displayImages: DisplayImage[];
  hasImages: boolean;
  canAddMore: boolean;
  showImageGallery: boolean;
  onToggleGallery: () => void;
  onAddPhoto: () => void;
  onRemoveImage: (index: number) => void;
  t: (key: string) => string;
}

export const BatchCaptureImageGallery: React.FC<BatchCaptureImageGalleryProps> = ({
  displayImages,
  hasImages,
  canAddMore,
  showImageGallery,
  onToggleGallery,
  onAddPhoto,
  onRemoveImage,
  t,
}) => {
  return (
    <div
      className="rounded-xl overflow-hidden mb-4"
      style={{ border: '1px solid var(--border-light)' }}
    >
      {/* Toggle Header */}
      <button
        onClick={onToggleGallery}
        className="w-full px-4 py-3 flex items-center justify-between cursor-pointer"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
        type="button"
      >
        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          {t('batchViewImages')}
        </span>
        {showImageGallery ? (
          <ChevronUp size={18} style={{ color: 'var(--text-tertiary)' }} />
        ) : (
          <ChevronDown size={18} style={{ color: 'var(--text-tertiary)' }} />
        )}
      </button>

      {/* Thumbnails Row */}
      {showImageGallery && (
        <div
          className="p-3 flex gap-2 overflow-x-auto"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          {/* Empty state placeholder */}
          {!hasImages && (
            <button
              onClick={onAddPhoto}
              className="flex-shrink-0 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors hover:border-blue-500"
              style={{
                width: '60px',
                height: '76px',
                borderColor: 'var(--border-medium)',
                backgroundColor: 'var(--bg-tertiary)',
              }}
              type="button"
              aria-label={t('batchAddMore')}
            >
              <Plus size={22} style={{ color: 'var(--text-tertiary)' }} />
            </button>
          )}

          {/* Existing thumbnails with always-visible X button */}
          {displayImages.map((image, index) => (
            <div
              key={image.id}
              className="relative flex-shrink-0 rounded-lg overflow-hidden"
              style={{
                width: '60px',
                height: '76px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-light)',
              }}
            >
              <img
                src={image.thumbnailUrl}
                alt={`${t('receipt')} ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {/* Image number badge */}
              <div
                className="absolute bottom-1 left-1 w-5 h-5 rounded flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                {index + 1}
              </div>
              {/* Remove button - always visible */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveImage(index);
                }}
                className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  color: 'white',
                }}
                type="button"
                aria-label={`${t('removeImage')} ${index + 1}`}
              >
                <X size={12} />
              </button>
            </div>
          ))}

          {/* Add more button - only when has images and can add more */}
          {hasImages && canAddMore && (
            <button
              onClick={onAddPhoto}
              className="flex-shrink-0 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-0.5 transition-colors hover:border-blue-500"
              style={{
                width: '60px',
                height: '76px',
                borderColor: 'var(--border-medium)',
                backgroundColor: 'var(--bg-tertiary)',
              }}
              type="button"
              aria-label={t('batchAddMore')}
            >
              <Plus size={18} style={{ color: 'var(--text-tertiary)' }} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
