/**
 * Personal Records Repository
 *
 * Story 15-6a: Interface definition.
 * Story 15-6b: Firestore implementation wrapping features/insights/services/recordsService.ts.
 */

import type { PersonalRecord, StoredPersonalRecord } from '@/types/personalRecord';
import type { RepositoryContext } from './types';
import {
  storePersonalRecord,
  getRecentPersonalRecords,
  hasRecentSimilarRecord,
  deletePersonalRecord,
  deletePersonalRecords,
} from '@/features/insights/services/recordsService';

// =============================================================================
// Interface
// =============================================================================

export interface IRecordsRepository {
  store(record: PersonalRecord): Promise<string>;
  getRecent(limitCount?: number): Promise<StoredPersonalRecord[]>;
  hasRecentSimilar(record: PersonalRecord, withinDays?: number): Promise<boolean>;
  delete(recordId: string): Promise<void>;
  deleteBatch(recordIds: string[]): Promise<void>;
}

// =============================================================================
// Firestore Implementation
// =============================================================================

export function createRecordsRepository(ctx: RepositoryContext): IRecordsRepository {
  const { db, userId, appId } = ctx;
  return {
    store: (record) => storePersonalRecord(db, userId, appId, record),
    getRecent: (limitCount) => getRecentPersonalRecords(db, userId, appId, limitCount),
    hasRecentSimilar: (record, withinDays) => hasRecentSimilarRecord(db, userId, appId, record, withinDays),
    delete: (id) => deletePersonalRecord(db, userId, appId, id),
    deleteBatch: (ids) => deletePersonalRecords(db, userId, appId, ids),
  };
}
