/**
 * Firestore Batch Operations Utility
 *
 * Story 15-1f: Centralized auto-chunking for writeBatch operations.
 * Story 15-TD-2: Added retry with exponential backoff on commit failures.
 *
 * Firestore silently fails above 500 operations per batch. This utility
 * auto-chunks operations and retries failed commits once with a 1s delay.
 *
 * **Partial-commit behavior:** When processing >500 documents, operations
 * are split into chunks. If chunk 1 succeeds but chunk 2 fails, chunk 1's
 * writes are already committed. Callers should design for idempotent retries.
 *
 * @example
 * ```typescript
 * await batchDelete(db, refs);
 * await batchWrite(db, items, (batch, item) => batch.set(ref, item));
 * ```
 */

import { writeBatch, Firestore, DocumentReference } from 'firebase/firestore';

export const FIRESTORE_BATCH_LIMIT = 500;

/**
 * Result of a batch operation, reporting per-chunk success/failure.
 *
 * Story 15-TD-12: Enables callers to detect and surface partial-commit failures.
 *
 * When processing >500 documents, operations are split into chunks.
 * If chunk 1 succeeds but chunk 2 fails, `succeededBatches` and `failedBatches`
 * reflect the partial commit. Already-committed writes are not rolled back.
 */
export interface BatchResult {
    /** Total number of chunk batches processed */
    totalBatches: number;
    /** Number of chunks that committed successfully */
    succeededBatches: number;
    /** Number of chunks that failed after retry */
    failedBatches: number;
    /** Errors from failed chunks */
    errors: Error[];
}

/** Base delay for exponential backoff (milliseconds) */
const RETRY_BASE_DELAY_MS = 1000;

/** Maximum number of retry attempts per chunk */
const MAX_RETRIES = 1;

/** Firestore error codes that are transient and worth retrying */
const RETRYABLE_CODES = ['unavailable', 'deadline-exceeded', 'aborted', 'resource-exhausted'];

/**
 * Commit a batch with retry and exponential backoff.
 * Only retries on transient Firestore errors (unavailable, deadline-exceeded, etc.).
 * Permanent errors (permission-denied, not-found) are thrown immediately.
 */
async function commitWithRetry(batch: ReturnType<typeof writeBatch>): Promise<void> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            await batch.commit();
            return;
        } catch (error: unknown) {
            const code = (error as { code?: string })?.code;
            const isRetryable = code && RETRYABLE_CODES.includes(code);
            if (attempt < MAX_RETRIES && isRetryable) {
                const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
}

/**
 * Core chunked batch execution. Shared by batchDelete and batchWrite.
 *
 * Splits items into chunks of FIRESTORE_BATCH_LIMIT, populates each batch
 * via the callback, commits with retry, and tracks per-chunk results.
 *
 * If ALL chunks fail, throws the first error (with `batchResult` stats attached).
 * If some chunks succeed and some fail, returns the result without throwing
 * so callers can detect and surface partial-commit failures.
 */
async function executeChunkedBatch<T>(
    db: Firestore,
    items: T[],
    populate: (batch: ReturnType<typeof writeBatch>, chunk: T[]) => void
): Promise<BatchResult> {
    const result: BatchResult = { totalBatches: 0, succeededBatches: 0, failedBatches: 0, errors: [] };

    for (let i = 0; i < items.length; i += FIRESTORE_BATCH_LIMIT) {
        const chunk = items.slice(i, i + FIRESTORE_BATCH_LIMIT);
        const batch = writeBatch(db);
        populate(batch, chunk);
        result.totalBatches++;
        try {
            await commitWithRetry(batch);
            result.succeededBatches++;
        } catch (error: unknown) {
            result.failedBatches++;
            result.errors.push(error instanceof Error ? error : new Error(String(error)));
        }
    }

    if (result.failedBatches > 0 && result.succeededBatches === 0) {
        const err = result.errors[0];
        (err as Error & { batchResult?: BatchResult }).batchResult = {
            totalBatches: result.totalBatches,
            succeededBatches: result.succeededBatches,
            failedBatches: result.failedBatches,
            errors: result.errors,
        };
        throw err;
    }

    return result;
}

/**
 * Delete documents in auto-chunked batches of 500.
 * Each chunk is committed with retry/backoff on failure.
 *
 * Returns a `BatchResult` with per-chunk success/failure counts.
 * If ALL chunks fail, throws. If some succeed and some fail, returns the result.
 */
export async function batchDelete(
    db: Firestore,
    refs: DocumentReference[]
): Promise<BatchResult> {
    return executeChunkedBatch(db, refs, (batch, chunk) => {
        for (const ref of chunk) batch.delete(ref);
    });
}

/**
 * Write documents in auto-chunked batches of 500.
 * The callback receives the batch and each item, so you can call
 * batch.set(), batch.update(), or batch.delete() as needed.
 * Each chunk is committed with retry/backoff on failure.
 *
 * Returns a `BatchResult` with per-chunk success/failure counts.
 * If ALL chunks fail, throws. If some succeed and some fail, returns the result.
 */
export async function batchWrite<T>(
    db: Firestore,
    items: T[],
    operation: (batch: ReturnType<typeof writeBatch>, item: T) => void
): Promise<BatchResult> {
    return executeChunkedBatch(db, items, (batch, chunk) => {
        for (const item of chunk) operation(batch, item);
    });
}
