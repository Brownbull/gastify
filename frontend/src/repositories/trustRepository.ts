/**
 * Merchant Trust Repository
 *
 * Story 15-6a: Interface definition.
 * Story 15-6b: Firestore implementation wrapping merchantTrustService.ts.
 */

import type { TrustedMerchant, TrustPromptEligibility } from '@/types/trust';
import type { RepositoryContext, Unsubscribe } from './types';
import {
  recordScan,
  isMerchantTrusted,
  trustMerchant,
  declineTrust,
  revokeTrust,
  deleteTrustedMerchant,
  getTrustedMerchants,
  getOnlyTrustedMerchants,
  subscribeToTrustedMerchants,
  getMerchantTrustRecord,
} from '@/services/merchantTrustService';

// =============================================================================
// Interface
// =============================================================================

export interface ITrustRepository {
  recordScan(merchantName: string, wasEdited: boolean): Promise<TrustPromptEligibility>;
  isTrusted(merchantName: string): Promise<boolean>;
  trust(merchantName: string): Promise<void>;
  declineTrust(merchantName: string): Promise<void>;
  revokeTrust(merchantName: string): Promise<void>;
  delete(merchantName: string): Promise<void>;
  getAll(): Promise<TrustedMerchant[]>;
  getOnlyTrusted(): Promise<TrustedMerchant[]>;
  subscribe(callback: (merchants: TrustedMerchant[]) => void): Unsubscribe;
  getRecord(merchantName: string): Promise<TrustedMerchant | null>;
}

// =============================================================================
// Firestore Implementation
// =============================================================================

export function createTrustRepository(ctx: RepositoryContext): ITrustRepository {
  const { db, userId, appId } = ctx;
  return {
    recordScan: (name, edited) => recordScan(db, userId, appId, name, edited),
    isTrusted: (name) => isMerchantTrusted(db, userId, appId, name),
    trust: (name) => trustMerchant(db, userId, appId, name),
    declineTrust: (name) => declineTrust(db, userId, appId, name),
    revokeTrust: (name) => revokeTrust(db, userId, appId, name),
    delete: (name) => deleteTrustedMerchant(db, userId, appId, name),
    getAll: () => getTrustedMerchants(db, userId, appId),
    getOnlyTrusted: () => getOnlyTrustedMerchants(db, userId, appId),
    subscribe: (cb) => subscribeToTrustedMerchants(db, userId, appId, cb),
    getRecord: (name) => getMerchantTrustRecord(db, userId, appId, name),
  };
}
