/**
 * Insight Profile Repository
 *
 * Story 15-6a: Interface definition.
 * Story 15-6b: Firestore implementation wrapping features/insights/services/insightProfileService.ts.
 */

import type { UserInsightProfile, InsightContent } from '@/types/insight';
import type { RepositoryContext } from './types';
import {
  getOrCreateInsightProfile,
  getInsightProfile,
  trackTransactionForProfile,
  setFirstTransactionDate,
  recordInsightShown,
  deleteInsight,
  deleteInsights,
  clearRecentInsights,
  resetInsightProfile,
  recordIntentionalResponse,
} from '@/features/insights/services/insightProfileService';

// =============================================================================
// Interface
// =============================================================================

export type { InsightContent };

export interface InsightDeleteTarget {
  insightId: string;
  shownAtSeconds: number;
}

export interface IInsightProfileRepository {
  getOrCreate(): Promise<UserInsightProfile>;
  get(): Promise<UserInsightProfile | null>;
  trackTransaction(transactionDate: Date): Promise<void>;
  setFirstTransactionDate(firstDate: Date): Promise<void>;
  recordInsightShown(
    insightId: string,
    transactionId?: string,
    fullInsight?: InsightContent,
  ): Promise<void>;
  deleteInsight(insightId: string, shownAtSeconds: number): Promise<void>;
  deleteInsights(targets: InsightDeleteTarget[]): Promise<void>;
  clearRecentInsights(): Promise<void>;
  reset(): Promise<void>;
  recordIntentionalResponse(
    insightId: string,
    shownAtSeconds: number,
    response: 'intentional' | 'unintentional' | null,
  ): Promise<void>;
}

// =============================================================================
// Firestore Implementation
// =============================================================================

export function createInsightProfileRepository(ctx: RepositoryContext): IInsightProfileRepository {
  const { db, userId, appId } = ctx;
  return {
    getOrCreate: () => getOrCreateInsightProfile(db, userId, appId),
    get: () => getInsightProfile(db, userId, appId),
    trackTransaction: (date) => trackTransactionForProfile(db, userId, appId, date),
    setFirstTransactionDate: (date) => setFirstTransactionDate(db, userId, appId, date),
    recordInsightShown: (insightId, txId, fullInsight) =>
      recordInsightShown(db, userId, appId, insightId, txId, fullInsight),
    deleteInsight: (insightId, shownAt) => deleteInsight(db, userId, appId, insightId, shownAt),
    deleteInsights: (targets) => deleteInsights(db, userId, appId, targets),
    clearRecentInsights: () => clearRecentInsights(db, userId, appId),
    reset: () => resetInsightProfile(db, userId, appId),
    recordIntentionalResponse: (insightId, shownAt, response) =>
      recordIntentionalResponse(db, userId, appId, insightId, shownAt, response),
  };
}
