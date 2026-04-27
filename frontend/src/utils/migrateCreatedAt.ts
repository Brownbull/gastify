/**
 * Migration Utility: Standardize createdAt field
 *
 * Story 14.31: Fix inconsistent createdAt formats in transactions collection.
 * Story 15-TD-12: Migrated to centralized batchWrite from firestoreBatch.ts.
 *
 * Problem:
 * - Some transactions have Firestore Timestamp (correct)
 * - Some have date strings like "January 12, 2026 at 3:00:..."
 * - Some have null values
 *
 * Solution:
 * - For transactions with invalid/missing createdAt, set it to the transaction date
 * - Convert all to proper Firestore Timestamps
 *
 * Usage (in browser console while logged in):
 *   import { migrateCreatedAt } from './utils/migrateCreatedAt';
 *   await migrateCreatedAt(db, userId, appId);
 */

import {
    Firestore,
    collection,
    getDocs,
    Timestamp,
    doc,
} from 'firebase/firestore';
import { isFirestoreTimestamp } from '@/utils/timestamp';
import { batchWrite } from '@/lib/firestoreBatch';
import { transactionsPath, transactionDocSegments } from '@/lib/firestorePaths';

interface TransactionDoc {
    id: string;
    date?: string;
    createdAt?: unknown;
    merchant?: string;
}

interface DocToFix {
    docId: string;
    merchant: string;
    oldValue: unknown;
    newCreatedAt: Timestamp;
    dateUsed: string;
}

/**
 * Convert a date string (YYYY-MM-DD) to Firestore Timestamp
 */
function dateStringToTimestamp(dateStr: string): Timestamp {
    // Parse YYYY-MM-DD format and set to noon UTC to avoid timezone issues
    const date = new Date(dateStr + 'T12:00:00Z');
    return Timestamp.fromDate(date);
}

export interface MigrationResult {
    total: number;
    fixed: number;
    skipped: number;
    errors: string[];
}

/**
 * Migrate all transactions for a user to have valid createdAt timestamps.
 * For transactions with invalid/missing createdAt, sets it to the transaction date.
 *
 * Uses centralized batchWrite for auto-chunking at 500 ops with retry/backoff.
 *
 * @param db - Firestore instance
 * @param userId - User ID
 * @param appId - App ID
 * @param dryRun - If true, only logs what would be changed without making changes
 * @returns Migration result with counts
 */
export async function migrateCreatedAt(
    db: Firestore,
    userId: string,
    appId: string,
    dryRun: boolean = false
): Promise<MigrationResult> {
    const collectionPath = transactionsPath(appId, userId);
    const collectionRef = collection(db, collectionPath);

    /* eslint-disable no-console */
    console.log(`[migrateCreatedAt] Starting migration for: ${collectionPath}`);
    console.log(`[migrateCreatedAt] Dry run: ${dryRun}`);

    const snapshot = await getDocs(collectionRef);
    console.log(`[migrateCreatedAt] Found ${snapshot.size} transactions`);

    const result: MigrationResult = {
        total: snapshot.size,
        fixed: 0,
        skipped: 0,
        errors: [],
    };

    // Pass 1: Identify documents that need fixing
    const docsToFix: DocToFix[] = [];

    for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data() as TransactionDoc;
        const { createdAt, date, merchant } = data;

        if (isFirestoreTimestamp(createdAt)) {
            result.skipped++;
            continue;
        }

        let newCreatedAt: Timestamp;
        let dateUsed: string;

        if (date && typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
            newCreatedAt = dateStringToTimestamp(date);
            dateUsed = date;
        } else {
            newCreatedAt = Timestamp.now();
            dateUsed = 'now()';
        }

        docsToFix.push({
            docId: docSnapshot.id,
            merchant: merchant || 'Unknown',
            oldValue: createdAt,
            newCreatedAt,
            dateUsed,
        });
    }

    // Log what will be/was fixed
    console.log(`[migrateCreatedAt] Transactions to fix (${docsToFix.length}):`);
    for (const item of docsToFix) {
        console.log(`  - ${item.docId} (${item.merchant}): ${JSON.stringify(item.oldValue)} -> ${item.dateUsed}`);
    }

    // Pass 2: Write fixes using centralized batchWrite (auto-chunks at 500 ops)
    if (!dryRun && docsToFix.length > 0) {
        try {
            const batchResult = await batchWrite(db, docsToFix, (batch, item) => {
                const docRef = doc(db, ...transactionDocSegments(appId, userId, item.docId));
                batch.update(docRef, { createdAt: item.newCreatedAt });
            });

            // When all batches succeed, fixed = total attempted
            if (batchResult.failedBatches === 0) {
                result.fixed = docsToFix.length;
            } else {
                // Partial failure: conservative estimate from succeeded batches
                result.fixed = docsToFix.length - (batchResult.failedBatches * Math.ceil(docsToFix.length / batchResult.totalBatches));
                result.fixed = Math.max(0, result.fixed);
                result.errors.push(
                    `${batchResult.failedBatches} of ${batchResult.totalBatches} batch chunks failed`
                );
                // Sanitize error messages — don't expose internal Firestore details
                result.errors.push(`${batchResult.errors.length} error(s) occurred. Check console for details.`);
                for (const err of batchResult.errors) {
                    console.error('[migrateCreatedAt] Batch chunk error:', err.message);
                }
            }
        } catch (error: unknown) {
            // Total failure — nothing was fixed
            result.fixed = 0;
            console.error('[migrateCreatedAt] Batch write failed:', error);
            result.errors.push('Batch write failed. Check console for details.');
        }
    } else if (dryRun) {
        // Dry run: report what would be fixed
        result.fixed = docsToFix.length;
    }

    console.log(`[migrateCreatedAt] Migration complete!`);
    console.log(`  Total: ${result.total}`);
    console.log(`  Fixed: ${result.fixed}`);
    console.log(`  Skipped (already valid): ${result.skipped}`);
    console.log(`  Errors: ${result.errors.length}`);
    /* eslint-enable no-console */

    return result;
}

// Export for use in browser console (dev only)
if (typeof window !== 'undefined' && import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).migrateCreatedAt = migrateCreatedAt;
}
