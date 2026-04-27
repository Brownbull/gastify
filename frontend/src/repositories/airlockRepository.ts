/**
 * Airlock Repository
 *
 * Story 15-6a: Interface definition.
 * Story 15-6b: Firestore implementation wrapping features/insights/services/airlockService.ts.
 */

import type { AirlockRecord, AirlockTransaction } from '@/types/airlock';
import type { RepositoryContext } from './types';
import {
  generateAirlock,
  getUserAirlocks,
  markAirlockViewed,
  deleteAirlock,
  deleteAirlocks,
} from '@/features/insights/services/airlockService';

// =============================================================================
// Interface
// =============================================================================

export interface IAirlockRepository {
  generate(transactions?: AirlockTransaction[]): Promise<AirlockRecord>;
  getAll(): Promise<AirlockRecord[]>;
  markViewed(airlockId: string): Promise<void>;
  delete(airlockId: string): Promise<void>;
  deleteBatch(airlockIds: string[]): Promise<void>;
}

// =============================================================================
// Firestore Implementation
// =============================================================================

export function createAirlockRepository(ctx: RepositoryContext): IAirlockRepository {
  const { db, userId, appId } = ctx;
  return {
    generate: (transactions) => generateAirlock(db, userId, appId, transactions),
    getAll: () => getUserAirlocks(db, userId, appId),
    markViewed: (id) => markAirlockViewed(db, userId, appId, id),
    delete: (id) => deleteAirlock(db, userId, appId, id),
    deleteBatch: (ids) => deleteAirlocks(db, userId, appId, ids),
  };
}
