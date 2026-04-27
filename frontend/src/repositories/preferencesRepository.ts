/**
 * Preferences Repository
 *
 * Story 15-6a: Interface definition.
 * Story 15-6b: Firestore implementation wrapping userPreferencesService.ts.
 */

import type {
  UserPreferences,
} from '@/types/preferences';
import type { RepositoryContext } from './types';
import {
  getUserPreferences,
  saveUserPreferences,
} from '@/services/userPreferencesService';

// =============================================================================
// Interface
// =============================================================================

export interface IPreferencesRepository {
  get(): Promise<UserPreferences>;
  save(preferences: Partial<Omit<UserPreferences, 'updatedAt'>>): Promise<void>;
}

// =============================================================================
// Firestore Implementation
// =============================================================================

export function createPreferencesRepository(ctx: RepositoryContext): IPreferencesRepository {
  const { db, userId, appId } = ctx;
  return {
    get: () => getUserPreferences(db, userId, appId),
    save: (prefs) => saveUserPreferences(db, userId, appId, prefs),
  };
}
