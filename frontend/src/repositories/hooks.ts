/**
 * Repository Hooks
 *
 * Story 15-6b: React hooks that provide repository instances.
 * Each hook creates a memoized repository bound to the current user's context.
 *
 * Usage:
 *   const txRepo = useTransactionRepository();
 *   await txRepo.add(transaction);
 *
 * Instead of:
 *   const { services, user } = useAuth();
 *   await addTransaction(services.db, user.uid, services.appId, transaction);
 */

import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { RepositoryContext } from './types';
import { createTransactionRepository, type ITransactionRepository } from './transactionRepository';
import { createMappingRepository, type IMappingRepository } from './mappingRepository';
import { createTrustRepository, type ITrustRepository } from './trustRepository';
import { createPreferencesRepository, type IPreferencesRepository } from './preferencesRepository';
import { createCreditsRepository, type ICreditsRepository } from './creditsRepository';
import { createRecordsRepository, type IRecordsRepository } from './recordsRepository';
import { createAirlockRepository, type IAirlockRepository } from './airlockRepository';
import { createInsightProfileRepository, type IInsightProfileRepository } from './insightProfileRepository';

// Mapping service configs
import { MAPPING_CONFIG as CATEGORY_CONFIG } from '@/services/categoryMappingService';
import { MAPPING_CONFIG as MERCHANT_CONFIG } from '@/services/merchantMappingService';
import { MAPPING_CONFIG as SUBCATEGORY_CONFIG } from '@/services/subcategoryMappingService';
import { MAPPING_CONFIG as ITEM_NAME_CONFIG } from '@/services/itemNameMappingService';

// Mapping types
import type { CategoryMapping } from '@/types/categoryMapping';
import type { MerchantMapping } from '@/types/merchantMapping';
import type { SubcategoryMapping } from '@/types/subcategoryMapping';
import type { ItemNameMapping } from '@/types/itemNameMapping';

/**
 * Get the current repository context from auth.
 * Returns null if not authenticated.
 */
function useRepositoryContext(): RepositoryContext | null {
  const { services, user } = useAuth();

  return useMemo(() => {
    if (!services?.db || !user?.uid) return null;
    return { db: services.db, userId: user.uid, appId: services.appId };
  }, [services?.db, services?.appId, user?.uid]);
}

// =============================================================================
// Individual Repository Hooks
// =============================================================================

export function useTransactionRepository(): ITransactionRepository | null {
  const ctx = useRepositoryContext();
  return useMemo(() => ctx ? createTransactionRepository(ctx) : null, [ctx]);
}

export function useTrustRepository(): ITrustRepository | null {
  const ctx = useRepositoryContext();
  return useMemo(() => ctx ? createTrustRepository(ctx) : null, [ctx]);
}

export function usePreferencesRepository(): IPreferencesRepository | null {
  const ctx = useRepositoryContext();
  return useMemo(() => ctx ? createPreferencesRepository(ctx) : null, [ctx]);
}

export function useCreditsRepository(): ICreditsRepository | null {
  const ctx = useRepositoryContext();
  return useMemo(() => ctx ? createCreditsRepository(ctx) : null, [ctx]);
}

export function useRecordsRepository(): IRecordsRepository | null {
  const ctx = useRepositoryContext();
  return useMemo(() => ctx ? createRecordsRepository(ctx) : null, [ctx]);
}

export function useAirlockRepository(): IAirlockRepository | null {
  const ctx = useRepositoryContext();
  return useMemo(() => ctx ? createAirlockRepository(ctx) : null, [ctx]);
}

export function useInsightProfileRepository(): IInsightProfileRepository | null {
  const ctx = useRepositoryContext();
  return useMemo(() => ctx ? createInsightProfileRepository(ctx) : null, [ctx]);
}

// =============================================================================
// Mapping Repository Hooks (typed variants)
// =============================================================================

export function useCategoryMappingRepository(): IMappingRepository<CategoryMapping> | null {
  const ctx = useRepositoryContext();
  return useMemo(() => ctx ? createMappingRepository<CategoryMapping>(ctx, CATEGORY_CONFIG) : null, [ctx]);
}

export function useMerchantMappingRepository(): IMappingRepository<MerchantMapping> | null {
  const ctx = useRepositoryContext();
  return useMemo(() => ctx ? createMappingRepository<MerchantMapping>(ctx, MERCHANT_CONFIG) : null, [ctx]);
}

export function useSubcategoryMappingRepository(): IMappingRepository<SubcategoryMapping> | null {
  const ctx = useRepositoryContext();
  return useMemo(() => ctx ? createMappingRepository<SubcategoryMapping>(ctx, SUBCATEGORY_CONFIG) : null, [ctx]);
}

export function useItemNameMappingRepository(): IMappingRepository<ItemNameMapping> | null {
  const ctx = useRepositoryContext();
  return useMemo(() => ctx ? createMappingRepository<ItemNameMapping>(ctx, ITEM_NAME_CONFIG) : null, [ctx]);
}
