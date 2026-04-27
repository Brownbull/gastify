import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../config/firebase';
import type { Transaction } from '../types/transaction';

// Initialize Firebase Functions
const functions = getFunctions(app);

/**
 * Receipt/store types supported by the Cloud Function
 * Story 9.8: Matches ReceiptType from functions/src/prompts/input-hints.ts
 */
export type ReceiptType =
    | 'auto'
    | 'supermarket'
    | 'restaurant'
    | 'gas_station'
    | 'pharmacy'
    | 'parking'
    | 'convenience_store'
    | 'department_store'
    | 'electronics'
    | 'clothing'
    | 'hardware'
    | 'other';

// Type definition for Cloud Function request
interface AnalyzeReceiptRequest {
    images: string[];
    currency?: string;  // Optional for V3 (auto-detects from receipt)
    /** Story 9.8: Optional hint for store/receipt type (defaults to 'auto') */
    receiptType?: ReceiptType;
    /** Story 14.15b: If true, images are URLs from Firebase Storage (for re-scan) */
    isRescan?: boolean;
}

/**
 * Analyzes receipt images using Firebase Cloud Function
 * The actual Gemini API call happens server-side for security
 *
 * @param images - Array of base64 encoded images OR URLs (for re-scan)
 * @param currency - Currency code (e.g., "CLP")
 * @param receiptType - Story 9.8: Optional hint for store type (defaults to 'auto')
 * @param isRescan - Story 14.15b: If true, images are URLs from Firebase Storage
 * @returns Promise<Transaction> - Parsed transaction data
 * @throws Error if analysis fails or user is not authenticated
 */
export async function analyzeReceipt(
    images: string[],
    currency: string,
    receiptType?: ReceiptType,
    isRescan?: boolean
): Promise<Transaction> {
    try {
        // Call the Cloud Function
        const analyzeReceiptFn = httpsCallable<AnalyzeReceiptRequest, Transaction>(
            functions,
            'analyzeReceipt'
        );

        // Build request with optional receiptType (Story 9.8) and isRescan (Story 14.15b)
        const request: AnalyzeReceiptRequest = { images, currency };
        if (receiptType && receiptType !== 'auto') {
            request.receiptType = receiptType;
        }
        if (isRescan) {
            request.isRescan = true;
        }

        const result = await analyzeReceiptFn(request);

        return result.data;
    } catch (error: unknown) {
        // Handle Firebase Functions errors
        console.error('Error calling analyzeReceipt Cloud Function:', error);

        // Type guard for Firebase Functions errors
        if (error && typeof error === 'object' && 'code' in error) {
            const functionsError = error as { code: string; message?: string };

            // Provide user-friendly error messages based on error code
            if (functionsError.code === 'unauthenticated') {
                throw new Error('You must be logged in to scan receipts.');
            }

            if (functionsError.code === 'invalid-argument') {
                throw new Error('Invalid receipt data. Please try again.');
            }

            if (functionsError.code === 'resource-exhausted') {
                throw new Error('Too many requests. Please wait a moment and try again.');
            }

            // Re-throw with original message if available
            if (functionsError.message) {
                throw new Error(functionsError.message);
            }
        }

        // Generic error fallback
        throw new Error('Failed to analyze receipt. Please try again or enter manually.');
    }
}

// =============================================================================
// Story 18-13b: Async scan pipeline — queue callable
// =============================================================================

/** Request for the queueReceiptScan callable */
export interface QueueReceiptScanRequest {
    scanId: string;
    imageUrls: string[];
    currency?: string;  // Optional for V3 (auto-detects from receipt)
    receiptType?: ReceiptType;
}

/** Response from the queueReceiptScan callable */
export interface QueueReceiptScanResponse {
    scanId: string;
    processingDeadline: string;
}

/**
 * Queue a receipt scan for async processing via the 2-function pipeline.
 * Returns immediately with { scanId, processingDeadline }. The actual
 * Gemini processing happens server-side via a Firestore onCreate trigger.
 *
 * @param request - scanId, imageUrls (Storage URLs), currency, optional receiptType
 * @returns Promise with scanId and processingDeadline ISO string
 * @throws Error if validation fails, credits insufficient, or user not authenticated
 */
export async function queueReceiptScan(
    request: QueueReceiptScanRequest
): Promise<QueueReceiptScanResponse> {
    try {
        const queueFn = httpsCallable<QueueReceiptScanRequest, QueueReceiptScanResponse>(
            functions,
            'queueReceiptScan'
        );

        const result = await queueFn(request);
        return result.data;
    } catch (error: unknown) {
        console.error('Error calling queueReceiptScan Cloud Function:', error);

        if (error && typeof error === 'object' && 'code' in error) {
            const functionsError = error as { code: string; message?: string };

            if (functionsError.code === 'unauthenticated') {
                throw new Error('You must be logged in to scan receipts.');
            }

            if (functionsError.code === 'invalid-argument') {
                throw new Error('Invalid scan request. Please try again.');
            }

            if (functionsError.code === 'resource-exhausted') {
                throw new Error('Too many requests. Please wait a moment and try again.');
            }

            if (functionsError.message) {
                throw new Error(functionsError.message);
            }
        }

        throw new Error('Failed to queue receipt scan. Please try again.');
    }
}
