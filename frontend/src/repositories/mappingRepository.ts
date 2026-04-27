/**
 * Mapping Repository
 *
 * Story 15-6a: Generic interface for all 4 mapping types.
 * Story 15-6b: Firestore implementation wrapping mappingServiceBase.ts.
 * Story 15-TD-9: save() signature uses Omit to prevent type cast workarounds.
 */

import type { RepositoryContext, Unsubscribe, ServerGeneratedFields } from './types';
import type { MappingConfig } from '@/services/mappingServiceBase';
import {
  saveMapping,
  getMappings,
  getMappingsFiltered,
  subscribeToMappings,
  deleteMapping,
  incrementMappingUsageBase,
  updateMappingTarget,
} from '@/services/mappingServiceBase';

// =============================================================================
// Interface
// =============================================================================

export interface IMappingRepository<T> {
  save(mapping: Omit<T, ServerGeneratedFields>): Promise<string>;
  getAll(): Promise<T[]>;
  getFiltered(filterField: string, filterValue: string): Promise<T[]>;
  subscribe(callback: (mappings: T[]) => void): Unsubscribe;
  delete(mappingId: string): Promise<void>;
  incrementUsage(mappingId: string): Promise<void>;
  updateTarget(mappingId: string, newTarget: string): Promise<void>;
}

// =============================================================================
// Firestore Implementation
// =============================================================================

export function createMappingRepository<T>(
  ctx: RepositoryContext,
  config: MappingConfig,
): IMappingRepository<T> {
  const { db, userId, appId } = ctx;
  return {
    // Generic-to-concrete bridge cast: Omit<T, ...> cannot be proven assignable
    // to Record<string, unknown> at the generic level. This single cast is
    // encapsulated here so consumers never need to cast.
    save: (mapping) => saveMapping(db, userId, appId, mapping as Record<string, unknown>, config),
    getAll: () => getMappings<T>(db, userId, appId, config),
    getFiltered: (field, value) => getMappingsFiltered<T>(db, userId, appId, field, value, config),
    subscribe: (cb) => subscribeToMappings<T>(db, userId, appId, cb, config),
    delete: (id) => deleteMapping(db, userId, appId, id, config),
    incrementUsage: (id) => incrementMappingUsageBase(db, userId, appId, id, config),
    updateTarget: (id, target) => updateMappingTarget(db, userId, appId, id, target, config),
  };
}
