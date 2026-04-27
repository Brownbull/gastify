/**
 * useBatchCapture Hook
 *
 * Story 12.1: Batch Capture UI
 * Manages state for multi-image capture in batch mode.
 *
 * Features:
 * - Tracks captured images with thumbnails
 * - Enforces 10 image maximum per batch
 * - Generates thumbnails client-side
 * - Handles add/remove operations with memory cleanup
 *
 * @see docs/sprint-artifacts/epic12/story-12.1-batch-capture-ui.md
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/** Maximum images allowed per batch (AC #7) */
export const MAX_BATCH_CAPTURE_IMAGES = 10;

/**
 * Represents a captured image in the batch.
 */
export interface CapturedImage {
  /** Unique identifier for this image */
  id: string;
  /** Original file object */
  file: File;
  /** Base64 data URL for the image */
  dataUrl: string;
  /** Thumbnail URL (object URL for preview) */
  thumbnailUrl: string;
  /** When the image was added */
  addedAt: Date;
}

/**
 * Return type for the useBatchCapture hook.
 */
export interface UseBatchCaptureReturn {
  /** Array of captured images */
  images: CapturedImage[];
  /** Add a new image to the batch */
  addImage: (file: File) => Promise<void>;
  /** Add multiple images to the batch */
  addImages: (files: File[]) => Promise<void>;
  /** Remove an image by its ID */
  removeImage: (id: string) => void;
  /** Clear all captured images and revoke URLs */
  clearBatch: () => void;
  /** Whether more images can be added (under limit) */
  canAddMore: boolean;
  /** Current number of images */
  count: number;
  /** Maximum allowed images */
  maxImages: number;
  /** Whether the batch has at least one image */
  hasImages: boolean;
}

/**
 * Generates a thumbnail for an image file.
 * Uses Canvas to create a compressed preview.
 *
 * @param file - The image file to generate thumbnail for
 * @param maxSize - Maximum dimension (width or height) for thumbnail
 * @returns Promise resolving to thumbnail data URL
 */
async function generateThumbnail(file: File, maxSize = 160): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      // Calculate thumbnail dimensions maintaining aspect ratio
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // Export as JPEG with 80% quality for good compression
      const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      resolve(thumbnailDataUrl);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Read file as data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Reads a file as a base64 data URL.
 *
 * @param file - The file to read
 * @returns Promise resolving to data URL string
 */
async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Hook for managing batch image capture state.
 *
 * @param maxImages - Maximum allowed images (default: 10)
 * @param initialDataUrls - Optional initial images as data URLs (for restoring state)
 * @param onImagesChange - Optional callback when images change (for syncing to parent)
 * @returns Batch capture state and handlers
 */
export function useBatchCapture(
  maxImages = MAX_BATCH_CAPTURE_IMAGES,
  initialDataUrls?: string[],
  onImagesChange?: (dataUrls: string[]) => void
): UseBatchCaptureReturn {
  // Initialize with any provided data URLs
  const [images, setImages] = useState<CapturedImage[]>(() => {
    if (initialDataUrls && initialDataUrls.length > 0) {
      return initialDataUrls.map((dataUrl, index) => ({
        id: `restored_${index}_${Date.now()}`,
        file: new File([], `restored_${index}.jpg`), // Placeholder file
        dataUrl,
        thumbnailUrl: dataUrl, // Use same URL for thumbnail
        addedAt: new Date(),
      }));
    }
    return [];
  });
  // Keep track of object URLs to revoke on cleanup
  const objectUrlsRef = useRef<Set<string>>(new Set());
  // Story 12.1 v9.7.0: Store callback in ref to avoid re-triggering effect
  const onImagesChangeRef = useRef(onImagesChange);
  onImagesChangeRef.current = onImagesChange;
  // Track if this is initial mount with restored images (skip first callback)
  const isInitialMountRef = useRef(initialDataUrls && initialDataUrls.length > 0);

  /**
   * Cleanup: Revoke all object URLs when component unmounts.
   */
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      objectUrlsRef.current.clear();
    };
  }, []);

  /**
   * Story 12.1 v9.7.0: Notify parent when images change for persistence
   * Uses ref for callback to avoid infinite loops when parent passes inline function
   * Skips initial mount if images were restored from props (to avoid circular updates)
   */
  useEffect(() => {
    // Skip the first effect run if we initialized with images from props
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    if (onImagesChangeRef.current) {
      const dataUrls = images.map(img => img.dataUrl);
      onImagesChangeRef.current(dataUrls);
    }
  }, [images]); // Only depend on images, not the callback

  /**
   * Add a single image to the batch.
   */
  const addImage = useCallback(async (file: File): Promise<void> => {
    // Check if we can add more images
    if (images.length >= maxImages) {
      console.warn('Batch capture limit reached');
      return;
    }

    try {
      // Generate thumbnail and read full image in parallel
      const [thumbnailUrl, dataUrl] = await Promise.all([
        generateThumbnail(file),
        readFileAsDataUrl(file),
      ]);

      const capturedImage: CapturedImage = {
        id: crypto.randomUUID(),
        file,
        dataUrl,
        thumbnailUrl,
        addedAt: new Date(),
      };

      setImages((prev) => {
        // Double-check limit in case of race condition
        if (prev.length >= maxImages) {
          return prev;
        }
        return [...prev, capturedImage];
      });
    } catch (error) {
      console.error('Failed to add image to batch:', error);
      throw error;
    }
  }, [images.length, maxImages]);

  /**
   * Add multiple images to the batch.
   * Stops adding if limit is reached.
   */
  const addImages = useCallback(async (files: File[]): Promise<void> => {
    const availableSlots = maxImages - images.length;
    if (availableSlots <= 0) {
      console.warn('Batch capture limit reached');
      return;
    }

    // Only process up to available slots
    const filesToAdd = files.slice(0, availableSlots);

    try {
      const newImages: CapturedImage[] = await Promise.all(
        filesToAdd.map(async (file) => {
          const [thumbnailUrl, dataUrl] = await Promise.all([
            generateThumbnail(file),
            readFileAsDataUrl(file),
          ]);

          return {
            id: crypto.randomUUID(),
            file,
            dataUrl,
            thumbnailUrl,
            addedAt: new Date(),
          };
        })
      );

      setImages((prev) => {
        const remainingSlots = maxImages - prev.length;
        const imagesToAdd = newImages.slice(0, remainingSlots);
        return [...prev, ...imagesToAdd];
      });
    } catch (error) {
      console.error('Failed to add images to batch:', error);
      throw error;
    }
  }, [images.length, maxImages]);

  /**
   * Remove an image by its ID.
   */
  const removeImage = useCallback((id: string): void => {
    setImages((prev) => {
      const imageToRemove = prev.find((img) => img.id === id);
      if (imageToRemove) {
        // Revoke thumbnail URL if it's an object URL
        if (imageToRemove.thumbnailUrl.startsWith('blob:')) {
          URL.revokeObjectURL(imageToRemove.thumbnailUrl);
          objectUrlsRef.current.delete(imageToRemove.thumbnailUrl);
        }
      }
      return prev.filter((img) => img.id !== id);
    });
  }, []);

  /**
   * Clear all captured images and revoke URLs.
   */
  const clearBatch = useCallback((): void => {
    setImages((prev) => {
      // Revoke all thumbnail URLs
      prev.forEach((img) => {
        if (img.thumbnailUrl.startsWith('blob:')) {
          URL.revokeObjectURL(img.thumbnailUrl);
        }
      });
      return [];
    });
    objectUrlsRef.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    objectUrlsRef.current.clear();
  }, []);

  return {
    images,
    addImage,
    addImages,
    removeImage,
    clearBatch,
    canAddMore: images.length < maxImages,
    count: images.length,
    maxImages,
    hasImages: images.length > 0,
  };
}

export default useBatchCapture;
