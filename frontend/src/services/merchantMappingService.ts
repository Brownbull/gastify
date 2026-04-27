/**
 * Merchant Mapping Service
 *
 * Story 15-1c: Thin wrapper over mappingServiceBase.
 * All CRUD logic lives in mappingServiceBase; this file provides
 * merchant-specific config and typed re-exports.
 */

import { Firestore, Unsubscribe } from 'firebase/firestore';
import { MerchantMapping, NewMerchantMapping } from '../types/merchantMapping';
import { sanitizeMerchantName } from '@/utils/sanitize';
import { merchantMappingsPath } from '@/lib/firestorePaths';
import {
    type MappingConfig,
    normalizeForMapping,
    saveMapping,
    getMappings,
    subscribeToMappings,
    deleteMapping,
    incrementMappingUsageBase,
    updateMappingTarget,
} from './mappingServiceBase';

export const MAPPING_CONFIG: MappingConfig = {
    collectionPath: merchantMappingsPath,
    serviceName: 'merchantMappingService',
    primaryKeyField: 'normalizedMerchant',
    targetField: 'targetMerchant',
    sanitizeTarget: sanitizeMerchantName,
};

/** Normalize a merchant name for fuzzy matching */
export const normalizeMerchantName = normalizeForMapping;

export async function saveMerchantMapping(
    db: Firestore, userId: string, appId: string, mapping: NewMerchantMapping
): Promise<string> {
    return saveMapping(db, userId, appId, mapping, MAPPING_CONFIG);
}

export async function getMerchantMappings(
    db: Firestore, userId: string, appId: string
): Promise<MerchantMapping[]> {
    return getMappings<MerchantMapping>(db, userId, appId, MAPPING_CONFIG);
}

export function subscribeToMerchantMappings(
    db: Firestore, userId: string, appId: string, callback: (mappings: MerchantMapping[]) => void
): Unsubscribe {
    return subscribeToMappings<MerchantMapping>(db, userId, appId, callback, MAPPING_CONFIG);
}

export async function deleteMerchantMapping(
    db: Firestore, userId: string, appId: string, mappingId: string
): Promise<void> {
    return deleteMapping(db, userId, appId, mappingId, MAPPING_CONFIG);
}

export async function incrementMerchantMappingUsage(
    db: Firestore, userId: string, appId: string, mappingId: string
): Promise<void> {
    return incrementMappingUsageBase(db, userId, appId, mappingId, MAPPING_CONFIG);
}

export async function updateMerchantMappingTarget(
    db: Firestore, userId: string, appId: string, mappingId: string, newTargetMerchant: string
): Promise<void> {
    return updateMappingTarget(db, userId, appId, mappingId, newTargetMerchant, MAPPING_CONFIG);
}
