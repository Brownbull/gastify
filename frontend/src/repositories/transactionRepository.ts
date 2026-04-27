/**
 * Transaction Repository
 *
 * Story 15-6a: Interface definition.
 * Story 15-6b: Firestore implementation wrapping firestore.ts service.
 */

import type { Transaction } from '@/types/transaction';
import type { RepositoryContext, PaginationCursor, Unsubscribe } from './types';
import {
  addTransaction,
  updateTransaction,
  deleteTransaction,
  subscribeToTransactions,
  subscribeToRecentScans,
  wipeAllTransactions,
  getTransactionPage,
  deleteTransactionsBatch,
  updateTransactionsBatch,
  LISTENER_LIMITS,
  PAGINATION_PAGE_SIZE,
} from '@/services/firestore';

// Re-export constants for consumers migrating from direct service imports
export { LISTENER_LIMITS, PAGINATION_PAGE_SIZE };

// =============================================================================
// Interface
// =============================================================================

export interface TransactionPage {
  transactions: Transaction[];
  cursor: PaginationCursor;
  hasMore: boolean;
}

export interface ITransactionRepository {
  add(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<string>;
  update(transactionId: string, updates: Partial<Transaction>): Promise<void>;
  delete(transactionId: string): Promise<void>;
  subscribe(callback: (transactions: Transaction[]) => void): Unsubscribe;
  subscribeRecentScans(callback: (transactions: Transaction[]) => void): Unsubscribe;
  wipeAll(): Promise<void>;
  getPage(cursor?: PaginationCursor, pageSize?: number): Promise<TransactionPage>;
  deleteBatch(transactionIds: string[]): Promise<void>;
  updateBatch(transactionIds: string[], updates: Partial<Transaction>): Promise<void>;
}

// =============================================================================
// Firestore Implementation
// =============================================================================

export function createTransactionRepository(ctx: RepositoryContext): ITransactionRepository {
  const { db, userId, appId } = ctx;
  return {
    add: (transaction) => addTransaction(db, userId, appId, transaction),
    update: (id, updates) => updateTransaction(db, userId, appId, id, updates),
    delete: (id) => deleteTransaction(db, userId, appId, id),
    subscribe: (cb) => subscribeToTransactions(db, userId, appId, cb),
    subscribeRecentScans: (cb) => subscribeToRecentScans(db, userId, appId, cb),
    wipeAll: () => wipeAllTransactions(db, userId, appId),
    getPage: async (cursor, pageSize) => {
      const page = await getTransactionPage(
        db, userId, appId,
        cursor as Parameters<typeof getTransactionPage>[3],
        pageSize,
      );
      return {
        transactions: page.transactions,
        cursor: page.lastDoc,
        hasMore: page.hasMore,
      };
    },
    deleteBatch: (ids) => deleteTransactionsBatch(db, userId, appId, ids),
    updateBatch: (ids, updates) => updateTransactionsBatch(db, userId, appId, ids, updates),
  };
}
