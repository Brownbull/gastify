import {
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    serverTimestamp,
    query,
    orderBy,
    limit,
    Firestore,
    Unsubscribe,
    runTransaction,
} from 'firebase/firestore';
import {
    TrustedMerchant,
    TrustedMerchantCreate,
    TrustPromptEligibility,
    TRUST_THRESHOLDS,
} from '../types/trust';
import { LISTENER_LIMITS } from './firestore';
import { sanitizeMerchantName } from '@/utils/sanitize';
import { trustedMerchantsPath, assertValidDocumentId } from '@/lib/firestorePaths';
import { normalizeForMapping } from './mappingServiceBase';

/**
 * Normalize a merchant name for trust matching.
 * Composes on normalizeForMapping with an additional NFD diacritics step.
 *
 * Story 11.4: Task 2 - Handle merchant name normalization
 * Story 15-TD-6: Compose on normalizeForMapping base
 */
export function normalizeMerchantNameForTrust(name: string): string {
    // NFD diacritics removal (the step normalizeForMapping lacks)
    const withoutDiacritics = name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    // Shared normalization: lowercase, trim, remove non-alnum, collapse spaces
    return normalizeForMapping(withoutDiacritics);
}

/**
 * Calculate edit rate from scan and edit counts
 * Returns 0 if no scans to avoid division by zero
 */
export function calculateEditRate(scanCount: number, editCount: number): number {
    if (scanCount === 0) return 0;
    return editCount / scanCount;
}

/**
 * Check if trust prompt should be shown for a merchant
 * Story 11.4: AC #2, AC #4
 *
 * Trust criteria:
 * - At least 3 scans (MIN_SCANS)
 * - Edit rate < 10% (MAX_EDIT_RATE)
 * - Not already trusted
 * - Not previously declined (to avoid nagging)
 */
export function shouldShowTrustPrompt(merchant: TrustedMerchant): TrustPromptEligibility {
    // Already trusted - no prompt needed
    if (merchant.trusted) {
        return {
            shouldShowPrompt: false,
            merchant,
            reason: 'already_trusted',
        };
    }

    // Already declined - don't nag (AC #4)
    if (merchant.declined) {
        return {
            shouldShowPrompt: false,
            merchant,
            reason: 'already_declined',
        };
    }

    // Insufficient scans (AC #2: minimum 3)
    if (merchant.scanCount < TRUST_THRESHOLDS.MIN_SCANS) {
        return {
            shouldShowPrompt: false,
            merchant,
            reason: 'insufficient_scans',
        };
    }

    // High edit rate (AC #2: must be < 10%)
    if (merchant.editRate >= TRUST_THRESHOLDS.MAX_EDIT_RATE) {
        return {
            shouldShowPrompt: false,
            merchant,
            reason: 'high_edit_rate',
        };
    }

    // All criteria met - show prompt
    return {
        shouldShowPrompt: true,
        merchant,
        reason: 'eligible',
    };
}

/**
 * Record a scan for a merchant (create or update tracking record)
 * Story 11.4: Task 2 - Track each scan
 *
 * @param db Firestore instance
 * @param userId User ID
 * @param appId App ID
 * @param merchantName Merchant display name (alias)
 * @param wasEdited Whether the user edited the transaction before saving
 * @returns Updated trust prompt eligibility
 */
export async function recordScan(
    db: Firestore,
    userId: string,
    appId: string,
    merchantName: string,
    wasEdited: boolean
): Promise<TrustPromptEligibility> {
    const sanitizedMerchant = sanitizeMerchantName(merchantName);
    const normalizedName = normalizeMerchantNameForTrust(sanitizedMerchant);
    assertValidDocumentId(normalizedName, 'merchantDocId');

    // Use normalized name as document ID for consistent lookups
    const collectionPath = trustedMerchantsPath(appId, userId);
    const docRef = doc(db, collectionPath, normalizedName);

    // TOCTOU fix: wrap read-then-write in runTransaction for atomic update
    return runTransaction(db, async (transaction) => {
        const existingDoc = await transaction.get(docRef);

        if (existingDoc.exists()) {
            // Update existing record atomically
            const existing = { id: existingDoc.id, ...existingDoc.data() } as TrustedMerchant;
            const newScanCount = existing.scanCount + 1;
            const newEditCount = existing.editCount + (wasEdited ? 1 : 0);
            const newEditRate = calculateEditRate(newScanCount, newEditCount);

            transaction.update(docRef, {
                scanCount: newScanCount,
                editCount: newEditCount,
                editRate: newEditRate,
                lastScanAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            const updated: TrustedMerchant = {
                ...existing,
                scanCount: newScanCount,
                editCount: newEditCount,
                editRate: newEditRate,
            };

            return shouldShowTrustPrompt(updated);
        } else {
            // Create new record - use TrustedMerchantCreate for proper serverTimestamp() typing
            const newRecord: TrustedMerchantCreate = {
                merchantName: sanitizedMerchant,
                normalizedName,
                scanCount: 1,
                editCount: wasEdited ? 1 : 0,
                editRate: wasEdited ? 1 : 0,
                trusted: false,
                lastScanAt: serverTimestamp(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            transaction.set(docRef, newRecord);

            return {
                shouldShowPrompt: false,
                merchant: {
                    id: normalizedName,
                    merchantName: sanitizedMerchant,
                    normalizedName,
                    scanCount: 1,
                    editCount: wasEdited ? 1 : 0,
                    editRate: wasEdited ? 1 : 0,
                    trusted: false,
                } as TrustedMerchant,
                reason: 'insufficient_scans',
            };
        }
    });
}

/**
 * Check if a merchant is trusted
 * Story 11.4: AC #5 - Trusted merchants auto-save
 */
export async function isMerchantTrusted(
    db: Firestore,
    userId: string,
    appId: string,
    merchantName: string
): Promise<boolean> {
    const normalizedName = normalizeMerchantNameForTrust(sanitizeMerchantName(merchantName));
    assertValidDocumentId(normalizedName, 'merchantDocId');
    const collectionPath = trustedMerchantsPath(appId, userId);
    const docRef = doc(db, collectionPath, normalizedName);

    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return false;

    const data = docSnap.data() as TrustedMerchant;
    return data.trusted === true;
}

/**
 * Mark a merchant as trusted
 * Story 11.4: AC #4 - User can accept trust
 * Story 15-TD-11: Wrapped in runTransaction for TOCTOU safety
 */
export async function trustMerchant(
    db: Firestore,
    userId: string,
    appId: string,
    merchantName: string
): Promise<void> {
    const sanitizedMerchant = sanitizeMerchantName(merchantName);
    const normalizedName = normalizeMerchantNameForTrust(sanitizedMerchant);
    assertValidDocumentId(normalizedName, 'merchantDocId');
    const collectionPath = trustedMerchantsPath(appId, userId);
    const docRef = doc(db, collectionPath, normalizedName);

    await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(docRef);
        if (!snap.exists()) {
            throw new Error(`Merchant trust record not found: ${normalizedName}`);
        }

        const data = snap.data() as TrustedMerchant;
        if (data.trusted) {
            return; // Already trusted — no-op
        }

        transaction.update(docRef, {
            trusted: true,
            trustedAt: serverTimestamp(),
            promptShownAt: serverTimestamp(),
            declined: false,
            updatedAt: serverTimestamp(),
        });
    });
}

/**
 * Decline trust for a merchant (marks as declined to avoid nagging)
 * Story 11.4: AC #4 - User can decline trust, only show prompt once per merchant
 * Story 15-TD-11: Wrapped in runTransaction for TOCTOU safety
 */
export async function declineTrust(
    db: Firestore,
    userId: string,
    appId: string,
    merchantName: string
): Promise<void> {
    const sanitizedMerchant = sanitizeMerchantName(merchantName);
    const normalizedName = normalizeMerchantNameForTrust(sanitizedMerchant);
    assertValidDocumentId(normalizedName, 'merchantDocId');
    const collectionPath = trustedMerchantsPath(appId, userId);
    const docRef = doc(db, collectionPath, normalizedName);

    await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(docRef);
        if (!snap.exists()) {
            throw new Error(`Merchant trust record not found: ${normalizedName}`);
        }

        const data = snap.data() as TrustedMerchant;
        if (data.declined || data.trusted) {
            return; // Already declined or trusted — no-op (prevents contradictory state)
        }

        transaction.update(docRef, {
            declined: true,
            promptShownAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    });
}

/**
 * Revoke trust for a merchant
 * Story 11.4: AC #7 - Users can revoke trust at any time
 * Story 15-TD-11: Wrapped in runTransaction for TOCTOU safety
 */
export async function revokeTrust(
    db: Firestore,
    userId: string,
    appId: string,
    merchantName: string
): Promise<void> {
    const sanitizedMerchant = sanitizeMerchantName(merchantName);
    const normalizedName = normalizeMerchantNameForTrust(sanitizedMerchant);
    assertValidDocumentId(normalizedName, 'merchantDocId');
    const collectionPath = trustedMerchantsPath(appId, userId);
    const docRef = doc(db, collectionPath, normalizedName);

    await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(docRef);
        if (!snap.exists()) {
            throw new Error(`Merchant trust record not found: ${normalizedName}`);
        }

        const data = snap.data() as TrustedMerchant;
        if (!data.trusted) {
            return; // Not currently trusted — no-op
        }

        transaction.update(docRef, {
            trusted: false,
            trustedAt: null,
            updatedAt: serverTimestamp(),
        });
    });
}

/**
 * Delete a trusted merchant record entirely
 * Story 11.4: AC #6, AC #7 - Settings management
 * Story 15-TD-15: Wrapped in runTransaction for TOCTOU safety
 */
export async function deleteTrustedMerchant(
    db: Firestore,
    userId: string,
    appId: string,
    merchantId: string
): Promise<void> {
    assertValidDocumentId(merchantId, 'merchantId');
    const collectionPath = trustedMerchantsPath(appId, userId);
    const docRef = doc(db, collectionPath, merchantId);

    await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(docRef);
        if (!snap.exists()) {
            throw new Error(`Merchant trust record not found: ${merchantId}`);
        }
        transaction.delete(docRef);
    });
}

/**
 * Get all trusted merchants for a user
 * Story 11.4: AC #6 - View trusted merchants in Settings
 */
export async function getTrustedMerchants(
    db: Firestore,
    userId: string,
    appId: string
): Promise<TrustedMerchant[]> {
    const collectionPath = trustedMerchantsPath(appId, userId);
    const colRef = collection(db, collectionPath);
    const snapshot = await getDocs(colRef);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    } as TrustedMerchant));
}

/**
 * Get only merchants that are trusted (for Settings display)
 * Story 11.4: AC #6 - List trusted merchants
 */
export async function getOnlyTrustedMerchants(
    db: Firestore,
    userId: string,
    appId: string
): Promise<TrustedMerchant[]> {
    const all = await getTrustedMerchants(db, userId, appId);
    return all.filter(m => m.trusted === true);
}

/**
 * Subscribe to trusted merchants (real-time updates)
 * Story 11.4: AC #6 - Settings management
 * Story 14.25: LIMITED to 200 merchants to reduce Firestore reads
 */
export function subscribeToTrustedMerchants(
    db: Firestore,
    userId: string,
    appId: string,
    callback: (merchants: TrustedMerchant[]) => void
): Unsubscribe {
    const collectionPath = trustedMerchantsPath(appId, userId);
    const colRef = collection(db, collectionPath);

    // Story 14.25: Add limit to reduce Firestore reads
    // Order by scanCount desc to prioritize most-used merchants
    const q = query(
        colRef,
        orderBy('scanCount', 'desc'),
        limit(LISTENER_LIMITS.TRUSTED_MERCHANTS)
    );

    return onSnapshot(q, (snapshot) => {
        const merchants = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as TrustedMerchant));

        // Dev-mode logging for snapshot size monitoring (AC #6)
        if (import.meta.env.DEV && snapshot.size >= LISTENER_LIMITS.TRUSTED_MERCHANTS) {
            console.warn(
                `[merchantTrustService] subscribeToTrustedMerchants: ${snapshot.size} docs at limit`
            );
        }

        callback(merchants);
    });
}

/**
 * Get merchant trust record by name
 */
export async function getMerchantTrustRecord(
    db: Firestore,
    userId: string,
    appId: string,
    merchantName: string
): Promise<TrustedMerchant | null> {
    const normalizedName = normalizeMerchantNameForTrust(sanitizeMerchantName(merchantName));
    assertValidDocumentId(normalizedName, 'merchantDocId');
    const collectionPath = trustedMerchantsPath(appId, userId);
    const docRef = doc(db, collectionPath, normalizedName);

    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;

    return {
        id: docSnap.id,
        ...docSnap.data(),
    } as TrustedMerchant;
}
