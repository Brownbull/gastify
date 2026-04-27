/**
 * Category Mapping Service
 *
 * Story 15-1c: Thin wrapper over mappingServiceBase.
 */

import { Firestore, Unsubscribe } from 'firebase/firestore';
import { CategoryMapping, NewCategoryMapping } from '../types/categoryMapping';
import { categoryMappingsPath } from '@/lib/firestorePaths';
import { sanitizeInput } from '@/utils/sanitize';
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
    collectionPath: categoryMappingsPath,
    serviceName: 'categoryMappingService',
    primaryKeyField: 'normalizedItem',
    targetField: 'targetCategory',
    sanitizeTarget: (v: string) => sanitizeInput(v, { maxLength: 100 }),
};

/** Normalize an item name for fuzzy matching */
export const normalizeItemName = normalizeForMapping;

export async function saveCategoryMapping(
    db: Firestore, userId: string, appId: string, mapping: NewCategoryMapping
): Promise<string> {
    return saveMapping(db, userId, appId, mapping, MAPPING_CONFIG);
}

export async function getCategoryMappings(
    db: Firestore, userId: string, appId: string
): Promise<CategoryMapping[]> {
    return getMappings<CategoryMapping>(db, userId, appId, MAPPING_CONFIG);
}

export function subscribeToCategoryMappings(
    db: Firestore, userId: string, appId: string, callback: (mappings: CategoryMapping[]) => void
): Unsubscribe {
    return subscribeToMappings<CategoryMapping>(db, userId, appId, callback, MAPPING_CONFIG);
}

export async function deleteCategoryMapping(
    db: Firestore, userId: string, appId: string, mappingId: string
): Promise<void> {
    return deleteMapping(db, userId, appId, mappingId, MAPPING_CONFIG);
}

/** Note: historically named without domain prefix (incrementMappingUsage) */
export async function incrementMappingUsage(
    db: Firestore, userId: string, appId: string, mappingId: string
): Promise<void> {
    return incrementMappingUsageBase(db, userId, appId, mappingId, MAPPING_CONFIG);
}

export async function updateCategoryMappingTarget(
    db: Firestore, userId: string, appId: string, mappingId: string, newTargetCategory: string
): Promise<void> {
    return updateMappingTarget(db, userId, appId, mappingId, newTargetCategory, MAPPING_CONFIG);
}
