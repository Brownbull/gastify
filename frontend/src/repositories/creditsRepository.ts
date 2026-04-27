/**
 * Credits Repository
 *
 * Story 15-6a: Interface definition.
 * Story 15-6b: Firestore implementation wrapping userCreditsService.ts.
 */

import type { UserCredits } from '@/types/scan';
import type { RepositoryContext } from './types';
import {
  getUserCredits,
  saveUserCredits,
  deductAndSaveCredits,
  deductAndSaveSuperCredits,
  addAndSaveCredits,
  addAndSaveSuperCredits,
} from '@/services/userCreditsService';

// =============================================================================
// Interface
// =============================================================================

export interface ICreditsRepository {
  get(): Promise<UserCredits>;
  /** @deprecated Use transactional methods (deduct, deductSuper, add, addSuper) instead. Non-transactional setDoc bypasses TOCTOU safety. */
  save(credits: UserCredits): Promise<void>;
  deduct(amount: number): Promise<UserCredits>;
  deductSuper(amount: number): Promise<UserCredits>;
  add(amount: number): Promise<UserCredits>;
  addSuper(amount: number): Promise<UserCredits>;
}

// =============================================================================
// Validation
// =============================================================================

function validateAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
    throw new Error('Amount must be a positive integer');
  }
}

// =============================================================================
// Firestore Implementation
// =============================================================================

export function createCreditsRepository(ctx: RepositoryContext): ICreditsRepository {
  const { db, userId, appId } = ctx;
  return {
    get: () => getUserCredits(db, userId, appId),
    save: (credits) => saveUserCredits(db, userId, appId, credits),
    deduct: (amount) => {
      validateAmount(amount);
      return deductAndSaveCredits(db, userId, appId, amount);
    },
    deductSuper: (amount) => {
      validateAmount(amount);
      return deductAndSaveSuperCredits(db, userId, appId, amount);
    },
    add: (amount) => {
      validateAmount(amount);
      return addAndSaveCredits(db, userId, appId, amount);
    },
    addSuper: (amount) => {
      validateAmount(amount);
      return addAndSaveSuperCredits(db, userId, appId, amount);
    },
  };
}
