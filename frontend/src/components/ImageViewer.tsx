import React, { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight, Image } from 'lucide-react'

interface ImageViewerProps {
  images: string[]
  initialIndex?: number
  merchantName: string
  onClose: () => void
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  images,
  initialIndex = 0,
  merchantName,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const hasMultipleImages = images.length > 1

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
    setIsLoading(true)
    setHasError(false)
  }, [images.length])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
    setIsLoading(true)
    setHasError(false)
  }, [images.length])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft' && hasMultipleImages) {
        handlePrevious()
      } else if (e.key === 'ArrowRight' && hasMultipleImages) {
        handleNext()
      }
    },
    [onClose, handlePrevious, handleNext, hasMultipleImages]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    // Focus trap - prevent tabbing outside modal
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [handleKeyDown])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleImageLoad = () => {
    setIsLoading(false)
  }

  const handleImageError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  // Use portal to render at document body level (escapes any overflow containers)
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{
        // Cover content area but leave nav bar visible
        // Nav bar is ~70px + safe area bottom
        bottom: 'calc(70px + env(safe-area-inset-bottom, 0px))',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
      }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Receipt image viewer for ${merchantName}`}
    >
      {/* Close button - top right corner with safe area */}
      <button
        onClick={onClose}
        className="absolute right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
        aria-label="Close image viewer"
        data-testid="image-viewer-close"
      >
        <X size={24} />
      </button>

      {/* Navigation arrows */}
      {hasMultipleImages && (
        <>
          <button
            onClick={handlePrevious}
            className="absolute left-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            aria-label="Previous image"
            data-testid="image-viewer-prev"
          >
            <ChevronLeft size={32} />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-16 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            aria-label="Next image"
            data-testid="image-viewer-next"
          >
            <ChevronRight size={32} />
          </button>
        </>
      )}

      {/* Image container - centered and sized to fit available space */}
      <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
        {/* Loading spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Error state */}
        {hasError ? (
          <div className="flex flex-col items-center justify-center text-white/70 p-8">
            <Image size={64} />
            <p className="mt-4">Failed to load image</p>
          </div>
        ) : (
          <img
            src={images[currentIndex]}
            alt={`Receipt from ${merchantName} - Image ${currentIndex + 1} of ${images.length}`}
            className={`max-w-full max-h-full object-contain ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            data-testid="image-viewer-image"
          />
        )}

        {/* Image counter - positioned at bottom of image area */}
        {hasMultipleImages && (
          <div
            className="absolute bottom-6 px-4 py-2 rounded-full bg-black/50 text-white text-sm"
            aria-live="polite"
            data-testid="image-viewer-counter"
          >
            {currentIndex + 1} of {images.length}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
