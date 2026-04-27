/**
 * Repository Layer - Barrel Export
 *
 * Story 15-6a: Repository interfaces (contract definitions).
 * Story 15-6b: Factory functions (Firestore implementations).
 * Story 15-6c: React hooks for consumer migration.
 *
 * Usage pattern:
 *   import { useTransactionRepository } from '@/repositories';
 *   const txRepo = useTransactionRepository();
 *   await txRepo?.add(transaction);
 */

// Shared types
export type { RepositoryContext, PaginationCursor, Unsubscribe } from './types';

// Transaction
export type { ITransactionRepository, TransactionPage } from './transactionRepository';
export { createTransactionRepository, LISTENER_LIMITS, PAGINATION_PAGE_SIZE } from './transactionRepository';

// Mapping (generic)
export type { IMappingRepository } from './mappingRepository';
export { createMappingRepository } from './mappingRepository';

// Merchant Trust
export type { ITrustRepository } from './trustRepository';
export { createTrustRepository } from './trustRepository';

// User Preferences
export type { IPreferencesRepository } from './preferencesRepository';
export { createPreferencesRepository } from './preferencesRepository';

// User Credits
export type { ICreditsRepository } from './creditsRepository';
export { createCreditsRepository } from './creditsRepository';

// Personal Records
export type { IRecordsRepository } from './recordsRepository';
// Re-export StoredPersonalRecord for consumers that need the return type
export type { StoredPersonalRecord } from '@/types/personalRecord';
export { createRecordsRepository } from './recordsRepository';

// Airlocks
export type { IAirlockRepository } from './airlockRepository';
export { createAirlockRepository } from './airlockRepository';

// Insight Profile
export type { IInsightProfileRepository, InsightContent, InsightDeleteTarget } from './insightProfileRepository';
export { createInsightProfileRepository } from './insightProfileRepository';

// React hooks
export {
  useTransactionRepository,
  useTrustRepository,
  usePreferencesRepository,
  useCreditsRepository,
  useRecordsRepository,
  useAirlockRepository,
  useInsightProfileRepository,
  useCategoryMappingRepository,
  useMerchantMappingRepository,
  useSubcategoryMappingRepository,
  useItemNameMappingRepository,
} from './hooks';
