/**
 * Shared types for batch-review views.
 *
 * Story TD-16-3: Extracted to eliminate duplicate DisplayImage interface.
 */

/**
 * Local image representation for thumbnail display.
 * Maps context images (data URLs) to display-friendly format with thumbnails.
 */
export interface DisplayImage {
  id: string;
  dataUrl: string;
  thumbnailUrl: string;
}
