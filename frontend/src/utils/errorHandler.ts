/**
 * Centralized Error Handler
 *
 * Story 15-2h: Error code mapping + toast service
 *
 * Classifies caught errors into typed categories and maps them to
 * user-facing translation keys. Used with the toast system to give
 * users meaningful feedback instead of silent failures.
 *
 * @module errorHandler
 */

import type { ToastType } from '@/shared/hooks/useToast';

// =============================================================================
// Error Classification
// =============================================================================

export type ErrorCode =
    | 'NETWORK_ERROR'
    | 'TIMEOUT_ERROR'
    | 'PERMISSION_DENIED'
    | 'STORAGE_QUOTA'
    | 'NOT_FOUND'
    | 'VALIDATION_ERROR'
    | 'UNKNOWN_ERROR';

export interface ErrorInfo {
    code: ErrorCode;
    titleKey: string;
    messageKey: string;
    toastType: ToastType;
}

const ERROR_MAP: Record<ErrorCode, ErrorInfo> = {
    NETWORK_ERROR: {
        code: 'NETWORK_ERROR',
        titleKey: 'errorNetworkTitle',
        messageKey: 'errorNetworkMessage',
        toastType: 'error',
    },
    TIMEOUT_ERROR: {
        code: 'TIMEOUT_ERROR',
        titleKey: 'errorNetworkTitle',
        messageKey: 'scanErrorTimeout',
        toastType: 'error',
    },
    PERMISSION_DENIED: {
        code: 'PERMISSION_DENIED',
        titleKey: 'errorPermissionDeniedTitle',
        messageKey: 'errorPermissionDeniedMessage',
        toastType: 'error',
    },
    STORAGE_QUOTA: {
        code: 'STORAGE_QUOTA',
        titleKey: 'errorStorageQuotaTitle',
        messageKey: 'errorStorageQuotaMessage',
        toastType: 'warning',
    },
    NOT_FOUND: {
        code: 'NOT_FOUND',
        titleKey: 'errorUnknownTitle',
        messageKey: 'errorUnknownMessage',
        toastType: 'error',
    },
    VALIDATION_ERROR: {
        code: 'VALIDATION_ERROR',
        titleKey: 'errorUnknownTitle',
        messageKey: 'errorUnknownMessage',
        toastType: 'warning',
    },
    UNKNOWN_ERROR: {
        code: 'UNKNOWN_ERROR',
        titleKey: 'errorUnknownTitle',
        messageKey: 'errorUnknownMessage',
        toastType: 'error',
    },
};

/**
 * Classify a caught error into a typed ErrorCode.
 *
 * Inspects error message, name, and code properties to determine
 * the most specific error category.
 */
export function classifyError(error: unknown): ErrorCode {
    if (!error) return 'UNKNOWN_ERROR';

    const message = extractErrorMessage(error).toLowerCase();
    const code = extractErrorCode(error);

    // Network errors — 'fetch' alone is too broad (e.g. "fetch user preferences")
    if (
        message.includes('network') ||
        message.includes('failed to fetch') ||
        message.includes('net::err') ||
        message.includes('econnrefused') ||
        code === 'unavailable'
    ) {
        return 'NETWORK_ERROR';
    }

    // Timeout errors
    if (
        message.includes('timeout') ||
        message.includes('timed out') ||
        message.includes('deadline') ||
        code === 'deadline-exceeded'
    ) {
        return 'TIMEOUT_ERROR';
    }

    // Permission errors (Firestore/Firebase)
    if (
        message.includes('permission') ||
        message.includes('unauthorized') ||
        message.includes('unauthenticated') ||
        code === 'permission-denied' ||
        code === 'unauthenticated'
    ) {
        return 'PERMISSION_DENIED';
    }

    // Storage quota — match specific phrases, not bare 'storage'/'disk'
    if (
        message.includes('quota') ||
        message.includes('storage quota') ||
        message.includes('disk quota') ||
        message.includes('disk full') ||
        code === 'resource-exhausted'
    ) {
        return 'STORAGE_QUOTA';
    }

    // Not found
    if (
        message.includes('not found') ||
        message.includes('no document') ||
        code === 'not-found'
    ) {
        return 'NOT_FOUND';
    }

    // Validation
    if (
        message.includes('invalid') ||
        message.includes('validation') ||
        code === 'invalid-argument'
    ) {
        return 'VALIDATION_ERROR';
    }

    return 'UNKNOWN_ERROR';
}

/**
 * Get error info (translation keys + toast type) for an ErrorCode.
 */
export function getErrorInfo(code: ErrorCode): ErrorInfo {
    return ERROR_MAP[code];
}

/**
 * Classify an error and return its info in one step.
 * Convenience wrapper combining classifyError + getErrorInfo.
 */
export function classifyAndGetErrorInfo(error: unknown): ErrorInfo {
    return getErrorInfo(classifyError(error));
}

// =============================================================================
// Error Message Extraction
// =============================================================================

/**
 * Safely extract a human-readable message from any thrown value.
 *
 * WARNING: Returns raw error text. Do NOT display the result directly
 * to users. Use classifyAndGetErrorInfo() for user-facing messages,
 * which maps to translation keys instead of exposing internals.
 */
export function extractErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as { message: unknown }).message);
    }
    return 'Unknown error';
}

/**
 * Extract error code from Firebase/Firestore errors.
 * Firebase errors have a `code` property like 'permission-denied'.
 */
function extractErrorCode(error: unknown): string | undefined {
    if (error && typeof error === 'object' && 'code' in error) {
        return String((error as { code: unknown }).code);
    }
    return undefined;
}
