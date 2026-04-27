/**
 * Centralized Firestore Collection Path Builders
 *
 * Story 15-1b: Single source of truth for all Firestore paths.
 * All services import path builders from here instead of defining inline.
 *
 * Pattern: artifacts/{appId}/users/{userId}/{collection}
 */

// =============================================================================
// Path Segment Validation (Story 15-TD-8 + 15-TD-18: Input Validation Hardening)
// =============================================================================

const SEGMENT_PATTERN = /^[a-zA-Z0-9_-]+$/;
/** Firebase project IDs max 30 chars; 64 gives headroom for custom app identifiers */
const MAX_APP_ID_LENGTH = 64;
/** Firestore document IDs max 1500 bytes; 256 chars is a safe conservative limit */
const MAX_SEGMENT_LENGTH = 256;

export function assertValidSegment(value: string, label: string, maxLength: number = MAX_SEGMENT_LENGTH): void {
    if (typeof value !== 'string' || !value || value.length > maxLength || !SEGMENT_PATTERN.test(value)) {
        throw new Error(`Invalid ${label} format`);
    }
}

/**
 * Story 15-TD-23: Looser document ID validator that allows spaces.
 * Used for Firestore document IDs that may contain spaces (e.g., normalized merchant names).
 * Blocks path traversal (/, ..) while permitting [a-zA-Z0-9_ -].
 */
const DOC_ID_PATTERN = /^[a-zA-Z0-9_ -]+$/;

export function assertValidDocumentId(value: string, label: string, maxLength: number = MAX_SEGMENT_LENGTH): void {
    if (typeof value !== 'string' || !value || !value.trim() || value.length > maxLength || !DOC_ID_PATTERN.test(value)) {
        throw new Error(`Invalid ${label} format`);
    }
}

function assertValidAppId(appId: string): void {
    assertValidSegment(appId, 'appId', MAX_APP_ID_LENGTH);
}

// =============================================================================
// Collection Paths (return string paths for collection() calls)
// =============================================================================

export function transactionsPath(appId: string, userId: string): string {
    assertValidAppId(appId);
    assertValidSegment(userId, 'userId');
    return `artifacts/${appId}/users/${userId}/transactions`;
}

export function merchantMappingsPath(appId: string, userId: string): string {
    assertValidAppId(appId);
    assertValidSegment(userId, 'userId');
    return `artifacts/${appId}/users/${userId}/merchant_mappings`;
}

export function categoryMappingsPath(appId: string, userId: string): string {
    assertValidAppId(appId);
    assertValidSegment(userId, 'userId');
    return `artifacts/${appId}/users/${userId}/category_mappings`;
}

export function subcategoryMappingsPath(appId: string, userId: string): string {
    assertValidAppId(appId);
    assertValidSegment(userId, 'userId');
    return `artifacts/${appId}/users/${userId}/subcategory_mappings`;
}

export function itemNameMappingsPath(appId: string, userId: string): string {
    assertValidAppId(appId);
    assertValidSegment(userId, 'userId');
    return `artifacts/${appId}/users/${userId}/item_name_mappings`;
}

export function trustedMerchantsPath(appId: string, userId: string): string {
    assertValidAppId(appId);
    assertValidSegment(userId, 'userId');
    return `artifacts/${appId}/users/${userId}/trusted_merchants`;
}

export function airlocksPath(appId: string, userId: string): string {
    assertValidAppId(appId);
    assertValidSegment(userId, 'userId');
    return `artifacts/${appId}/users/${userId}/airlocks`;
}

export function personalRecordsPath(appId: string, userId: string): string {
    assertValidAppId(appId);
    assertValidSegment(userId, 'userId');
    return `artifacts/${appId}/users/${userId}/personalRecords`;
}

export function notificationsPath(appId: string, userId: string): string {
    assertValidAppId(appId);
    assertValidSegment(userId, 'userId');
    return `artifacts/${appId}/users/${userId}/notifications`;
}

// =============================================================================
// Document Paths (return [collection, ...segments] for doc() calls)
// =============================================================================

export function preferencesDocSegments(appId: string, userId: string) {
    assertValidAppId(appId);
    assertValidSegment(userId, 'userId');
    return ['artifacts', appId, 'users', userId, 'preferences', 'settings'] as const;
}

export function creditsDocSegments(appId: string, userId: string) {
    assertValidAppId(appId);
    assertValidSegment(userId, 'userId');
    return ['artifacts', appId, 'users', userId, 'credits', 'balance'] as const;
}

export function insightProfileDocSegments(appId: string, userId: string) {
    assertValidAppId(appId);
    assertValidSegment(userId, 'userId');
    return ['artifacts', appId, 'users', userId, 'insightProfile', 'profile'] as const;
}

// =============================================================================
// Transaction Document Path (for doc() calls with known ID)
// =============================================================================

export function transactionDocSegments(appId: string, userId: string, transactionId: string) {
    assertValidAppId(appId);
    assertValidSegment(userId, 'userId');
    assertValidSegment(transactionId, 'transactionId');
    return ['artifacts', appId, 'users', userId, 'transactions', transactionId] as const;
}

export function notificationDocSegments(appId: string, userId: string, notificationId: string) {
    assertValidAppId(appId);
    assertValidSegment(userId, 'userId');
    assertValidSegment(notificationId, 'notificationId');
    return ['artifacts', appId, 'users', userId, 'notifications', notificationId] as const;
}
