import { Timestamp, FieldValue } from 'firebase/firestore';

/**
 * TrustedMerchant represents tracking data for a merchant's scan history
 * and whether the user has marked them as trusted for auto-save.
 *
 * Stored in: artifacts/{appId}/users/{userId}/trusted_merchants/{merchantId}
 *
 * Trust Criteria (AC #2):
 * - Minimum 3 scans from merchant (scanCount >= 3)
 * - Edit rate < 10% (editRate < 0.10)
 * - User confirms trust via prompt
 *
 * Once trusted, future scans skip Quick Save Card and auto-save (AC #5).
 *
 * Story 11.4: Trust Merchant System
 */
export interface TrustedMerchant {
    /** Firestore document ID (optional when creating) */
    id?: string;
    /** Display merchant name (user's preferred alias) */
    merchantName: string;
    /** Normalized name for matching (lowercase, no special chars) */
    normalizedName: string;
    /** Total number of scans from this merchant */
    scanCount: number;
    /** Number of scans that were edited before save */
    editCount: number;
    /** Edit rate = editCount / scanCount (0.0 - 1.0) */
    editRate: number;
    /** Whether user has confirmed trust for this merchant */
    trusted: boolean;
    /** When user confirmed trust (only set if trusted=true) */
    trustedAt?: Timestamp;
    /** When trust prompt was shown (to avoid nagging - AC #4) */
    promptShownAt?: Timestamp;
    /** Whether user declined trust (to avoid nagging - AC #4) */
    declined?: boolean;
    /** When the last scan from this merchant occurred */
    lastScanAt: Timestamp;
    /** When this record was created */
    createdAt: Timestamp;
    /** When this record was last updated */
    updatedAt: Timestamp;
}

/**
 * Data required to create a new trusted merchant record
 */
export type NewTrustedMerchant = Omit<TrustedMerchant, 'id' | 'createdAt' | 'updatedAt' | 'lastScanAt'>;

/**
 * Data for updating a scan record (used by recordScan service function)
 */
export interface ScanRecordUpdate {
    /** Whether the user edited the transaction before saving */
    wasEdited: boolean;
}

/**
 * Result from checking if a trust prompt should be shown
 */
export interface TrustPromptEligibility {
    /** Whether the trust prompt should be shown */
    shouldShowPrompt: boolean;
    /** The merchant record (if exists) */
    merchant?: TrustedMerchant;
    /** Reason why prompt is/isn't eligible */
    reason: 'already_trusted' | 'already_declined' | 'insufficient_scans' | 'high_edit_rate' | 'eligible';
}

/**
 * Constants for trust thresholds
 */
export const TRUST_THRESHOLDS = {
    /** Minimum scans before trust prompt can appear (AC #2) */
    MIN_SCANS: 3,
    /** Maximum edit rate for trust eligibility (AC #2: <10%) */
    MAX_EDIT_RATE: 0.10,
} as const;

/**
 * Type for creating new TrustedMerchant documents in Firestore.
 * Timestamps are replaced with FieldValue to allow serverTimestamp().
 *
 * Story 11.4: Code Review fix - proper typing for serverTimestamp()
 */
export interface TrustedMerchantCreate {
    merchantName: string;
    normalizedName: string;
    scanCount: number;
    editCount: number;
    editRate: number;
    trusted: boolean;
    trustedAt?: FieldValue;
    promptShownAt?: FieldValue;
    declined?: boolean;
    lastScanAt: FieldValue;
    createdAt: FieldValue;
    updatedAt: FieldValue;
}
