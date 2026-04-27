/**
 * Item Name Mapping Service
 *
 * Story 15-1c: Thin wrapper over mappingServiceBase.
 * Uses compound upsert key (normalizedMerchant + normalizedItemName).
 */

import { Firestore, Unsubscribe } from 'firebase/firestore';
import { ItemNameMapping, NewItemNameMapping } from '../types/itemNameMapping';
import { sanitizeItemName } from '@/utils/sanitize';
import { itemNameMappingsPath } from '@/lib/firestorePaths';
import {
    type MappingConfig,
    normalizeForMapping,
    saveMapping,
    getMappings,
    getMappingsFiltered,
    subscribeToMappings,
    deleteMapping,
    incrementMappingUsageBase,
    updateMappingTarget,
} from './mappingServiceBase';

export const MAPPING_CONFIG: MappingConfig = {
    collectionPath: itemNameMappingsPath,
    serviceName: 'itemNameMappingService',
    primaryKeyField: 'normalizedMerchant',
    secondaryKeyField: 'normalizedItemName',
    targetField: 'targetItemName',
    sanitizeTarget: sanitizeItemName,
};

/** Normalize an item name for fuzzy matching */
export const normalizeItemName = normalizeForMapping;

export async function saveItemNameMapping(
    db: Firestore, userId: string, appId: string, mapping: NewItemNameMapping
): Promise<string> {
    return saveMapping(db, userId, appId, mapping, MAPPING_CONFIG);
}

export async function getItemNameMappings(
    db: Firestore, userId: string, appId: string
): Promise<ItemNameMapping[]> {
    return getMappings<ItemNameMapping>(db, userId, appId, MAPPING_CONFIG);
}

/**
 * Get item name mappings for a specific merchant (used during scan processing).
 * Returns mappings scoped to the given normalized merchant name.
 */
export async function getItemNameMappingsForMerchant(
    db: Firestore, userId: string, appId: string, normalizedMerchant: string
): Promise<ItemNameMapping[]> {
    return getMappingsFiltered<ItemNameMapping>(
        db, userId, appId, 'normalizedMerchant', normalizedMerchant, MAPPING_CONFIG
    );
}

export function subscribeToItemNameMappings(
    db: Firestore, userId: string, appId: string, callback: (mappings: ItemNameMapping[]) => void
): Unsubscribe {
    return subscribeToMappings<ItemNameMapping>(db, userId, appId, callback, MAPPING_CONFIG);
}

export async function deleteItemNameMapping(
    db: Firestore, userId: string, appId: string, mappingId: string
): Promise<void> {
    return deleteMapping(db, userId, appId, mappingId, MAPPING_CONFIG);
}

export async function incrementItemNameMappingUsage(
    db: Firestore, userId: string, appId: string, mappingId: string
): Promise<void> {
    return incrementMappingUsageBase(db, userId, appId, mappingId, MAPPING_CONFIG);
}

export async function updateItemNameMappingTarget(
    db: Firestore, userId: string, appId: string, mappingId: string, newTargetItemName: string
): Promise<void> {
    return updateMappingTarget(db, userId, appId, mappingId, newTargetItemName, MAPPING_CONFIG);
}
