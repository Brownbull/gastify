import {
    collection,
    addDoc,
    doc,
    onSnapshot,
    serverTimestamp,
    Firestore,
    Unsubscribe,
    getDocs,
    query,
    orderBy,
    limit,
    startAfter,
    QueryDocumentSnapshot,
    DocumentData,
    increment,
    runTransaction,
} from 'firebase/firestore';
import type { Transaction } from '../types/transaction';
import { toMillis } from '@/utils/timestamp';
import { computePeriods } from '../utils/date';
import { ensureTransactionsDefaults } from '../utils/transactionUtils';
import { transactionsPath, assertValidSegment } from '@/lib/firestorePaths';
import { batchDelete, batchWrite } from '@/lib/firestoreBatch';

/**
 * Removes undefined values from an object (Firestore doesn't accept undefined).
 * Recursively cleans nested objects and arrays.
 */
function removeUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value === undefined) {
            continue; // Skip undefined values
        }
        if (Array.isArray(value)) {
            // Recursively clean array items if they're objects
            cleaned[key] = value.map(item =>
                item && typeof item === 'object' && !Array.isArray(item)
                    ? removeUndefined(item as Record<string, unknown>)
                    : item
            );
        } else if (value && typeof value === 'object' && !(value instanceof Date)) {
            // Recursively clean nested objects (but not Date or Timestamp)
            cleaned[key] = removeUndefined(value as Record<string, unknown>);
        } else {
            cleaned[key] = value;
        }
    }
    return cleaned as Partial<T>;
}

export async function addTransaction(
    db: Firestore,
    userId: string,
    appId: string,
    transaction: Omit<Transaction, 'id' | 'createdAt'>
): Promise<string> {
    // Clean undefined values before sending to Firestore
    const cleanedTransaction = removeUndefined(transaction as Record<string, unknown>);

    // Story 14d-v2-1.2b: Compute periods from date for efficient temporal queries
    const periods = transaction.date ? computePeriods(transaction.date) : undefined;

    // Story 14d-v2-1.2b: Set version: 1 for new transactions (optimistic concurrency)
    // Also set updatedAt, periods for efficient queries
    const transactionWithDefaults = {
        ...cleanedTransaction,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        version: 1,
        ...(periods && { periods }),
    };

    const docRef = await addDoc(
        collection(db, transactionsPath(appId, userId)),
        transactionWithDefaults
    );
    // Story 14.31: Debug logging for transaction save
    if (import.meta.env.DEV) {
        console.log('[firestore] addTransaction SUCCESS:', {
            id: docRef.id,
            merchant: transaction.merchant,
            date: transaction.date,
            currency: (transaction as Record<string, unknown>).currency,
            version: 1,
            periods: periods?.month,
            path: `artifacts/${appId}/users/${userId}/transactions/${docRef.id}`
        });
    }
    return docRef.id;
}

/**
 * Story 15-TD-15: Wrapped in runTransaction for TOCTOU safety.
 * Reads current version via transaction.get() and increments atomically,
 * preventing lost updates from concurrent writes.
 * Note: updateTransactionsBatch still uses increment(1) — see that function's
 * comment for why per-doc transactions are impractical in batch operations.
 */
export async function updateTransaction(
    db: Firestore,
    userId: string,
    appId: string,
    transactionId: string,
    updates: Partial<Transaction>
): Promise<void> {
    assertValidSegment(transactionId, 'transactionId');

    // Clean undefined values before sending to Firestore
    const cleanedUpdates = removeUndefined(updates as Record<string, unknown>);

    // Story 14d-v2-1.2b: Recompute periods if date changed
    const periods = updates.date ? computePeriods(updates.date) : undefined;

    const docRef = doc(db, transactionsPath(appId, userId), transactionId);

    await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(docRef);
        if (!snap.exists()) {
            throw new Error(`Transaction not found: ${transactionId}`);
        }

        const currentData = snap.data();
        const currentVersion = (currentData.version as number) ?? 0;

        transaction.update(docRef, {
            ...cleanedUpdates,
            updatedAt: serverTimestamp(),
            version: currentVersion + 1,
            ...(periods && { periods }),
        });
    });
}

/**
 * Story 15-TD-15: Wrapped in runTransaction for TOCTOU safety.
 * Verifies doc exists before deleting.
 */
export async function deleteTransaction(
    db: Firestore,
    userId: string,
    appId: string,
    transactionId: string
): Promise<void> {
    assertValidSegment(transactionId, 'transactionId');
    const docRef = doc(db, transactionsPath(appId, userId), transactionId);

    await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(docRef);
        if (!snap.exists()) {
            throw new Error(`Transaction not found: ${transactionId}`);
        }
        transaction.delete(docRef);
    });
}

/**
 * Listener limit constants for Firestore cost optimization.
 * Story 14.25: Reduce read costs by limiting real-time listener snapshots.
 *
 * Expected cost savings:
 * - User with 500 txns: 5,000 reads/day → 100 reads/day (98% reduction)
 */
export const LISTENER_LIMITS = {
    /** Transaction listener: 100 most recent transactions */
    TRANSACTIONS: 100,
    /** Recent scans listener: 10 most recently scanned (by createdAt) */
    RECENT_SCANS: 10,
    /** Groups listener: 50 groups (most users have <20) */
    GROUPS: 50,
    /** Trusted merchants listener: 200 merchants */
    TRUSTED_MERCHANTS: 200,
    /** Mapping listeners: 500 mappings each */
    MAPPINGS: 500,
} as const;

/**
 * Subscribe to user's transactions with real-time updates.
 *
 * Story 14.25: LIMITED to most recent 100 transactions by date (desc).
 * For full history, use pagination via History View (Story 14.27).
 *
 * @param db Firestore instance
 * @param userId User ID
 * @param appId App ID
 * @param callback Callback receiving limited transaction list
 * @returns Unsubscribe function
 */
export function subscribeToTransactions(
    db: Firestore,
    userId: string,
    appId: string,
    callback: (transactions: Transaction[]) => void
): Unsubscribe {
    const collectionRef = collection(db, transactionsPath(appId, userId));

    // Story 14.25: Add orderBy + limit to reduce Firestore reads
    const q = query(
        collectionRef,
        orderBy('date', 'desc'),
        limit(LISTENER_LIMITS.TRANSACTIONS)
    );

    return onSnapshot(q, (snapshot) => {
        const txs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Transaction));

        // Story 14d-v2-1-2b: Apply Epic 14d-v2 defaults to legacy transactions
        const normalizedTxs = ensureTransactionsDefaults(txs);

        const activeTxs = normalizedTxs;

        // Dev-mode logging for snapshot size monitoring (AC #6)
        if (import.meta.env.DEV && snapshot.size >= LISTENER_LIMITS.TRANSACTIONS) {
            console.warn(
                `[firestore] subscribeToTransactions: ${snapshot.size} docs at limit ` +
                    '- pagination needed for full history (see Story 14.27)'
            );
        }

        callback(activeTxs);
    });
}

/**
 * Subscribe to user's most recently SCANNED transactions (by createdAt).
 *
 * v9.7.0 Bugfix: Separate query for "Últimos Escaneados" carousel.
 * The main subscribeToTransactions orders by transaction date (date field),
 * which excludes recently scanned receipts with old transaction dates.
 *
 * This query orders by createdAt (scan timestamp) to ensure newly scanned
 * receipts appear immediately in the "Últimos Escaneados" section regardless
 * of their transaction date.
 *
 * @param db Firestore instance
 * @param userId User ID
 * @param appId App ID
 * @param callback Callback receiving recent scans list
 * @returns Unsubscribe function
 */
export function subscribeToRecentScans(
    db: Firestore,
    userId: string,
    appId: string,
    callback: (transactions: Transaction[]) => void
): Unsubscribe {
    const collectionRef = collection(db, transactionsPath(appId, userId));

    // Order by createdAt (scan timestamp) descending, limit to 10
    const q = query(
        collectionRef,
        orderBy('createdAt', 'desc'),
        limit(LISTENER_LIMITS.RECENT_SCANS)
    );

    return onSnapshot(q, (snapshot) => {
        const txs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Transaction));

        // Story 14d-v2-1-2b: Apply Epic 14d-v2 defaults to legacy transactions
        const normalizedTxs = ensureTransactionsDefaults(txs);

        const activeTxs = normalizedTxs;

        // Sort client-side as backup (Firestore should already sort, but ensure order)
        const sortedTxs = [...activeTxs].sort((a, b) =>
            toMillis(b.createdAt) - toMillis(a.createdAt)
        );

        // Emits on every server-confirmed snapshot.
        // Offline cache staleness for this query is handled at the consumer layer
        // (see useDashboardViewData: recentScans derived from main transaction list).
        callback(sortedTxs);
    }, (error) => {
        // Log errors - likely missing index
        console.error('[firestore] subscribeToRecentScans error:', error);
        // Return empty array on error to prevent UI crash
        callback([]);
    });
}

/**
 * Wipe all transactions for a user.
 * Story 14.26: Uses writeBatch with chunking for atomic, cost-efficient deletion.
 *
 * @param db Firestore instance
 * @param userId User ID
 * @param appId App ID
 */
export async function wipeAllTransactions(
    db: Firestore,
    userId: string,
    appId: string
): Promise<void> {
    const q = collection(db, transactionsPath(appId, userId));
    const snap = await getDocs(q);

    if (snap.empty) return;

    // Story 14.26: Atomic batch deletion with auto-chunking at 500 ops
    await batchDelete(db, snap.docs.map(d => d.ref));
}

/**
 * Story 14.27: Pagination page size for transaction history.
 * Used by getTransactionPage for cursor-based pagination.
 */
export const PAGINATION_PAGE_SIZE = 50;

/**
 * Story 14.27: Result type for paginated transaction queries.
 * Includes transactions and cursor for next page.
 */
export interface TransactionPage {
    /** Transactions for this page */
    transactions: Transaction[];
    /** Last document snapshot for cursor-based pagination (null if no more pages) */
    lastDoc: QueryDocumentSnapshot<DocumentData> | null;
    /** Whether more pages are available */
    hasMore: boolean;
}

/**
 * Story 14.27: Fetch a page of transactions with cursor-based pagination.
 *
 * This function is used to load older transactions beyond the
 * real-time listener limit (LISTENER_LIMITS.TRANSACTIONS = 100).
 *
 * Pagination uses Firestore's startAfter for efficient cursor-based navigation:
 * - First page: Pass undefined for cursor
 * - Subsequent pages: Pass lastDoc from previous page
 *
 * @param db Firestore instance
 * @param userId User ID
 * @param appId App ID
 * @param cursor Last document snapshot from previous page (undefined for first page)
 * @param pageSize Number of transactions to fetch (default: PAGINATION_PAGE_SIZE)
 * @returns TransactionPage with transactions, lastDoc cursor, and hasMore flag
 *
 * @example
 * ```ts
 * // First page
 * const page1 = await getTransactionPage(db, userId, appId);
 *
 * // Next page using cursor
 * const page2 = await getTransactionPage(db, userId, appId, page1.lastDoc);
 * ```
 */
export async function getTransactionPage(
    db: Firestore,
    userId: string,
    appId: string,
    cursor?: QueryDocumentSnapshot<DocumentData> | null,
    pageSize: number = PAGINATION_PAGE_SIZE
): Promise<TransactionPage> {
    const collectionRef = collection(db, transactionsPath(appId, userId));

    // Build query with orderBy and limit
    // Request one extra document to check if more pages exist
    const baseConstraints = [
        orderBy('date', 'desc'),
        limit(pageSize + 1),
    ];

    // Add cursor constraint if provided (for pages beyond the first)
    const constraints = cursor
        ? [...baseConstraints.slice(0, 1), startAfter(cursor), baseConstraints[1]]
        : baseConstraints;

    const q = query(collectionRef, ...constraints);
    const snapshot = await getDocs(q);

    // Check if we got more than pageSize (indicates more pages available)
    const hasMore = snapshot.docs.length > pageSize;

    // Take only pageSize documents (exclude the extra one used for hasMore check)
    const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;

    const rawTransactions = docs.map(d => ({
        id: d.id,
        ...d.data()
    } as Transaction));

    // Story 14d-v2-1-2b: Apply Epic 14d-v2 defaults to legacy transactions
    const normalizedTransactions = ensureTransactionsDefaults(rawTransactions);

    const transactions = normalizedTransactions;

    // Last document for next page cursor (null if no more pages)
    const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;

    // Dev-mode logging for pagination monitoring
    if (import.meta.env.DEV) {
        console.log(
            `[firestore] getTransactionPage: fetched ${transactions.length} docs, ` +
            `hasMore=${hasMore}, cursor=${cursor ? 'yes' : 'no'}`
        );
    }

    return {
        transactions,
        lastDoc,
        hasMore,
    };
}

/**
 * Story 14.15: Delete multiple transactions in a batch.
 * Uses Firestore writeBatch for atomic deletion.
 *
 * @param db Firestore instance
 * @param userId User ID
 * @param appId App ID
 * @param transactionIds Array of transaction IDs to delete
 */
export async function deleteTransactionsBatch(
    db: Firestore,
    userId: string,
    appId: string,
    transactionIds: string[]
): Promise<void> {
    if (transactionIds.length === 0) return;

    transactionIds.forEach(id => assertValidSegment(id, 'transactionId'));
    const refs = transactionIds.map(id => doc(db, transactionsPath(appId, userId), id));
    await batchDelete(db, refs);
}

/**
 * Story 14.15: Update multiple transactions in a batch.
 * Uses Firestore writeBatch for atomic updates.
 *
 * @param db Firestore instance
 * @param userId User ID
 * @param appId App ID
 * @param transactionIds Array of transaction IDs to update
 * @param updates Partial transaction data to apply to all
 */
export async function updateTransactionsBatch(
    db: Firestore,
    userId: string,
    appId: string,
    transactionIds: string[],
    updates: Partial<Transaction>
): Promise<void> {
    if (transactionIds.length === 0) return;

    transactionIds.forEach(id => assertValidSegment(id, 'transactionId'));

    // Clean undefined values
    const cleanedUpdates = removeUndefined(updates as Record<string, unknown>);

    // Story 14d-v2-1.2b: Recompute periods if date changed
    const periods = updates.date ? computePeriods(updates.date) : undefined;

    // Note: batch operations use increment(1) rather than transactional read+increment.
    // Per-doc transactions would be impractical at scale (up to 500 docs).
    // Single-doc updateTransaction() has full TOCTOU protection via runTransaction.
    const refs = transactionIds.map(id => doc(db, transactionsPath(appId, userId), id));
    await batchWrite(db, refs, (batch, ref) => {
        batch.update(ref, {
            ...cleanedUpdates,
            updatedAt: serverTimestamp(),
            version: increment(1),
            ...(periods && { periods }),
        });
    });
}
