/**
 * Story 18-13b: Pending scan image upload service
 *
 * Pure async service (no React lifecycle) that uploads images to
 * Firebase Storage at pending_scans/{userId}/{scanId}/image_{n}.jpg.
 * Uses uploadBytesResumable for real progress tracking.
 *
 * AC-ARCH-LOC-2: Lives in src/features/scan/services/ (not hooks/).
 */

import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/config/firebase';

/**
 * Convert a base64 data URL to a Blob.
 * Strips the data URL prefix (e.g., "data:image/jpeg;base64,").
 */
/** Allowed image MIME types for upload */
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Maximum number of images per scan upload */
const MAX_SCAN_IMAGES = 10;

function base64ToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  if (parts.length < 2) {
    throw new Error('Invalid data URL: missing base64 content');
  }
  const mimeMatch = parts[0].match(/:(.*?);/);
  if (!mimeMatch) {
    throw new Error('Invalid data URL: missing MIME type');
  }
  const mime = mimeMatch[1];
  if (!ALLOWED_MIME_TYPES.has(mime)) {
    throw new Error(`Unsupported image type: ${mime}. Allowed: ${[...ALLOWED_MIME_TYPES].join(', ')}`);
  }
  const byteString = atob(parts[1]);
  const bytes = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    bytes[i] = byteString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Upload scan images to Firebase Storage for async processing.
 *
 * @param userId - Firebase Auth UID
 * @param scanId - Unique scan ID (crypto.randomUUID)
 * @param images - Array of base64 data URLs
 * @param onProgress - Optional callback for aggregate upload progress (0-100)
 * @returns Array of download URLs for the uploaded images
 * @throws Error if any upload fails
 */
export async function uploadScanImages(
  userId: string,
  scanId: string,
  images: string[],
  onProgress?: (percent: number) => void
): Promise<string[]> {
  if (images.length === 0) return [];
  if (images.length > MAX_SCAN_IMAGES) {
    throw new Error(`Too many images: ${images.length}. Maximum is ${MAX_SCAN_IMAGES}.`);
  }

  const perImageProgress = new Array<number>(images.length).fill(0);

  const uploadPromises = images.map((image, index) => {
    return new Promise<string>((resolve, reject) => {
      const blob = base64ToBlob(image);
      const storagePath = `users/${userId}/scans/${scanId}/image_${index}.jpg`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, blob);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          perImageProgress[index] = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            const totalProgress = perImageProgress.reduce((sum, p) => sum + p, 0) / images.length;
            onProgress(Math.round(totalProgress));
          }
        },
        (error) => {
          reject(new Error(`Upload failed for image ${index}: ${error.message}`));
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadUrl);
          } catch (error) {
            reject(new Error(`Failed to get download URL for image ${index}`));
          }
        }
      );
    });
  });

  return Promise.all(uploadPromises);
}

/** Expected Firebase Storage URL domain for URL validation */
const STORAGE_URL_PATTERN = /^https:\/\/firebasestorage\.googleapis\.com\//;

/**
 * Copy images from pending scan Storage path to permanent receipts path.
 * Called by save resolution flow (AC-20) when user saves the async scan result.
 * Planned for wiring in the save resolution UI story.
 *
 * Note: Firebase client SDK cannot copy Storage objects directly.
 * Instead, we download and re-upload. For large files this is suboptimal
 * but acceptable for receipt images (typically <2MB each).
 */
export async function copyPendingToReceipts(
  pendingUrls: string[],
  userId: string,
  transactionId: string,
  onProgress?: (percent: number) => void
): Promise<string[]> {
  if (pendingUrls.length === 0) return [];

  const newUrls: string[] = [];

  for (let i = 0; i < pendingUrls.length; i++) {
    // Idempotency: skip URLs already at permanent receipts path, or
    // self-contained representations (data:/blob:) that have nothing to copy.
    if (
      pendingUrls[i].startsWith('data:') ||
      pendingUrls[i].startsWith('blob:') ||
      pendingUrls[i].includes('receipts%2F')
    ) {
      newUrls.push(pendingUrls[i]);
      continue;
    }
    if (!STORAGE_URL_PATTERN.test(pendingUrls[i])) {
      throw new Error(`Invalid Storage URL at index ${i}: URL must be a Firebase Storage URL`);
    }
    const response = await fetch(pendingUrls[i]);
    if (!response.ok) {
      throw new Error(`Failed to download image at index ${i}: HTTP ${response.status}`);
    }
    const blob = await response.blob();
    const storagePath = `receipts/${userId}/${transactionId}/image_${i}.jpg`;
    const storageRef = ref(storage, storagePath);

    await uploadBytesResumable(storageRef, blob);
    const downloadUrl = await getDownloadURL(storageRef);
    newUrls.push(downloadUrl);

    if (onProgress) {
      onProgress(Math.round(((i + 1) / pendingUrls.length) * 100));
    }
  }

  return newUrls;
}
