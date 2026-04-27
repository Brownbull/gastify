/**
 * Image Utilities
 *
 * Story 14d.5a: Extracted from useBatchCapture.ts
 * Pure utility functions for image processing, used by batch capture flow.
 *
 * These functions are used when adding images to the ScanContext,
 * allowing thumbnail generation without requiring the useBatchCapture hook.
 */

/**
 * Maximum dimension (width or height) for generated thumbnails.
 * Balances quality with memory/performance.
 */
export const DEFAULT_THUMBNAIL_SIZE = 160;

/**
 * Generates a thumbnail for an image file.
 * Uses Canvas API to create a compressed JPEG preview.
 *
 * @param file - The image file to generate thumbnail for
 * @param maxSize - Maximum dimension (width or height) for thumbnail
 * @returns Promise resolving to thumbnail data URL (base64 JPEG)
 *
 * @example
 * ```ts
 * const thumbDataUrl = await generateThumbnail(imageFile);
 * // Returns: "data:image/jpeg;base64,..."
 * ```
 */
export async function generateThumbnail(
  file: File,
  maxSize = DEFAULT_THUMBNAIL_SIZE
): Promise<string> {
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

    // Read file as data URL to load into image
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
 * @returns Promise resolving to data URL string (base64)
 *
 * @example
 * ```ts
 * const dataUrl = await readFileAsDataUrl(imageFile);
 * // Returns: "data:image/jpeg;base64,..."
 * ```
 */
export async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Represents a processed image ready for batch capture.
 * Contains both the full data URL (for API/storage) and thumbnail (for display).
 */
export interface ProcessedImage {
  /** Unique identifier */
  id: string;
  /** Full-resolution base64 data URL */
  dataUrl: string;
  /** Compressed thumbnail data URL for display */
  thumbnailUrl: string;
}

/**
 * Process multiple files for batch capture.
 * Generates both full data URLs and thumbnails in parallel.
 *
 * @param files - Array of image files to process
 * @param maxCount - Maximum number of images to process (default: 10)
 * @returns Promise resolving to array of processed images
 *
 * @example
 * ```ts
 * const processed = await processFilesForCapture(files, 10);
 * // Each item has { id, dataUrl, thumbnailUrl }
 * scanContext.setImages(processed.map(p => p.dataUrl));
 * ```
 */
export async function processFilesForCapture(
  files: File[],
  maxCount = 10
): Promise<ProcessedImage[]> {
  // Limit to maxCount files
  const filesToProcess = files.slice(0, maxCount);

  const processed = await Promise.all(
    filesToProcess.map(async (file) => {
      const [thumbnailUrl, dataUrl] = await Promise.all([
        generateThumbnail(file),
        readFileAsDataUrl(file),
      ]);

      return {
        id: crypto.randomUUID(),
        dataUrl,
        thumbnailUrl,
      };
    })
  );

  return processed;
}

/**
 * Process a single file for batch capture.
 *
 * @param file - Image file to process
 * @returns Promise resolving to processed image
 */
export async function processFileForCapture(file: File): Promise<ProcessedImage> {
  const [thumbnailUrl, dataUrl] = await Promise.all([
    generateThumbnail(file),
    readFileAsDataUrl(file),
  ]);

  return {
    id: crypto.randomUUID(),
    dataUrl,
    thumbnailUrl,
  };
}
