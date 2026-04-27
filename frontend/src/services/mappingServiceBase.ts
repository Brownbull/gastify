/**
 * Generic Mapping Service Base
 *
 * Story 15-1c: Eliminates ~600 lines of duplicated CRUD logic across
 * 4 mapping services (merchant, category, subcategory, itemName).
 *
 * Each service provides a MappingConfig, and this module provides
 * the 6 standard operations: save (upsert), get, subscribe, delete,
 * incrementUsage, updateTarget.
 */

import {
    collection,
    doc,
    onSnapshot,
    serverTimestamp,
    Firestore,
    Unsubscribe,
    getDocs,
    query,
    where,
    limit,
    orderBy,
    increment,
    runTransaction,
    updateDoc,
} from 'firebase/firestore';
import { LISTENER_LIMITS } from './firestore';
import { assertValidSegment } from '@/lib/firestorePaths';

// =============================================================================
// Configuration Interface
// =============================================================================

export interface MappingConfig {
    /** Collection path builder */
    collectionPath: (appId: string, userId: string) => string;
    /** Service name for dev-mode warnings */
    serviceName: string;
    /** Primary key field for upsert lookups (e.g. 'normalizedMerchant') */
    primaryKeyField: string;
    /** Secondary key field for compound upsert (e.g. 'normalizedItemName') */
    secondaryKeyField?: string;
    /** Target field name (e.g. 'targetMerchant') */
    targetField: string;
    /** Optional sanitizer for the target value on save/update */
    sanitizeTarget?: (value: string) => string;
}

// =============================================================================
// Generic Normalize (Story 15-1d: shared by all 4 services)
// =============================================================================

/**
 * Normalize a name for fuzzy matching.
 * Identical logic used by merchant, category, subcategory, and itemName services.
 */
export function normalizeForMapping(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ');
}

// =============================================================================
// Deterministic Document IDs (Story 15-TD-9: prevent duplicate-create race)
// =============================================================================

/**
 * Generate a deterministic Firestore document ID from primary key field(s).
 * Makes concurrent creates idempotent by targeting the same document.
 *
 * Uses btoa encoding (bijective) with base64url substitution to produce
 * a URL-safe, collision-free ID from the key fields.
 * Input is always normalized (lowercase, alphanumeric) by normalizeForMapping(),
 * so btoa is safe for ASCII input.
 */
export function generateDeterministicId(
    config: MappingConfig,
    mapping: Record<string, unknown>,
): string {
    const primaryValue = String(mapping[config.primaryKeyField] ?? '');
    const parts = [primaryValue];

    if (config.secondaryKeyField) {
        const secondaryValue = String(mapping[config.secondaryKeyField] ?? '');
        parts.push(secondaryValue);
    }

    // Join with separator that cannot appear in normalized values
    const raw = parts.join('::');

    // Fallback for empty input — use placeholder to ensure non-empty ID
    const input = raw || '_empty_';

    // base64url encoding: bijective — no two distinct inputs produce the same ID
    // Firestore IDs allow [a-zA-Z0-9_-], so base64url chars are safe
    return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// =============================================================================
// Generic CRUD Operations
// =============================================================================

/**
 * Save (upsert) a mapping document.
 * If a document with the same primary key (and optional secondary key) exists,
 * it will be updated. Otherwise, a new document is created.
 *
 * Story 15-TD-9: Create path uses deterministic document IDs to prevent
 * duplicate-create race conditions from concurrent calls.
 */
export async function saveMapping<T extends Record<string, unknown>>(
    db: Firestore,
    userId: string,
    appId: string,
    mapping: T,
    config: MappingConfig
): Promise<string> {
    const collRef = collection(db, config.collectionPath(appId, userId));

    // Sanitize target field if configured
    const data = config.sanitizeTarget
        ? { ...mapping, [config.targetField]: config.sanitizeTarget(mapping[config.targetField] as string) }
        : { ...mapping };

    // Build upsert query (outside transaction — client SDK limitation).
    // Duplicate-create race is mitigated by deterministic document IDs below.
    const filters = [
        where(config.primaryKeyField, '==', mapping[config.primaryKeyField]),
    ];
    if (config.secondaryKeyField) {
        filters.push(where(config.secondaryKeyField, '==', mapping[config.secondaryKeyField]));
    }

    const existingDocs = await getDocs(query(collRef, ...filters, limit(1)));

    if (!existingDocs.empty) {
        // TOCTOU fix: wrap update in transaction to verify doc still exists
        const existingRef = existingDocs.docs[0].ref;
        await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(existingRef);
            if (snap.exists()) {
                transaction.update(existingRef, {
                    ...data,
                    updatedAt: serverTimestamp(),
                });
            } else {
                // Doc was deleted between query and transaction — create new
                transaction.set(existingRef, {
                    ...data,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
            }
        });
        return existingDocs.docs[0].id;
    }

    // No existing doc — create with deterministic ID to prevent duplicate-create race.
    // Two concurrent creates target the same doc, making the operation idempotent.
    const deterministicId = generateDeterministicId(config, data);
    const newDocRef = doc(collRef, deterministicId);
    await runTransaction(db, async (transaction) => {
        const existingSnap = await transaction.get(newDocRef);
        if (existingSnap.exists()) {
            // Concurrent create already won — update instead of duplicate
            transaction.update(newDocRef, {
                ...data,
                updatedAt: serverTimestamp(),
            });
        } else {
            transaction.set(newDocRef, {
                ...data,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        }
    });
    return newDocRef.id;
}

/**
 * Get all mappings for a user (one-time fetch).
 */
export async function getMappings<T>(
    db: Firestore,
    userId: string,
    appId: string,
    config: MappingConfig
): Promise<T[]> {
    const collRef = collection(db, config.collectionPath(appId, userId));
    const q = query(collRef, limit(LISTENER_LIMITS.MAPPINGS));
    const snapshot = await getDocs(q);

    if (import.meta.env.DEV && snapshot.size >= LISTENER_LIMITS.MAPPINGS) {
        console.warn(
            `[${config.serviceName}] getMappings: ${snapshot.size} docs at limit - user has reached mapping limit`
        );
    }

    return snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
    })) as T[];
}

/**
 * Get mappings filtered by a specific field value (one-time fetch).
 */
export async function getMappingsFiltered<T>(
    db: Firestore,
    userId: string,
    appId: string,
    filterField: string,
    filterValue: string,
    config: MappingConfig
): Promise<T[]> {
    const collRef = collection(db, config.collectionPath(appId, userId));
    const q = query(
        collRef,
        where(filterField, '==', filterValue),
        orderBy('usageCount', 'desc'),
        limit(LISTENER_LIMITS.MAPPINGS)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
    })) as T[];
}

/**
 * Subscribe to mappings (real-time updates), ordered by usageCount desc.
 */
export function subscribeToMappings<T>(
    db: Firestore,
    userId: string,
    appId: string,
    callback: (mappings: T[]) => void,
    config: MappingConfig
): Unsubscribe {
    const collRef = collection(db, config.collectionPath(appId, userId));
    const q = query(
        collRef,
        orderBy('usageCount', 'desc'),
        limit(LISTENER_LIMITS.MAPPINGS)
    );

    return onSnapshot(q, (snapshot) => {
        const mappings = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
        })) as T[];

        if (import.meta.env.DEV && snapshot.size >= LISTENER_LIMITS.MAPPINGS) {
            console.warn(
                `[${config.serviceName}] subscribeToMappings: ${snapshot.size} docs at limit - user has exceeded typical mapping count`
            );
        }

        callback(mappings);
    });
}

/**
 * Delete a mapping document.
 * Story 15-TD-15: Wrapped in runTransaction for TOCTOU safety
 */
export async function deleteMapping(
    db: Firestore,
    userId: string,
    appId: string,
    mappingId: string,
    config: MappingConfig
): Promise<void> {
    assertValidSegment(mappingId, 'mappingId');
    const docRef = doc(db, config.collectionPath(appId, userId), mappingId);

    await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(docRef);
        if (!snap.exists()) {
            throw new Error(`Mapping not found: ${mappingId}`);
        }
        transaction.delete(docRef);
    });
}

/**
 * Increment the usage count for a mapping.
 */
export async function incrementMappingUsageBase(
    db: Firestore,
    userId: string,
    appId: string,
    mappingId: string,
    config: MappingConfig
): Promise<void> {
    assertValidSegment(mappingId, 'mappingId');
    const docRef = doc(db, config.collectionPath(appId, userId), mappingId);
    return updateDoc(docRef, {
        usageCount: increment(1),
        updatedAt: serverTimestamp(),
    });
}

/**
 * Update a mapping's target field value.
 */
export async function updateMappingTarget(
    db: Firestore,
    userId: string,
    appId: string,
    mappingId: string,
    newTarget: string,
    config: MappingConfig
): Promise<void> {
    assertValidSegment(mappingId, 'mappingId');
    const docRef = doc(db, config.collectionPath(appId, userId), mappingId);
    const value = config.sanitizeTarget ? config.sanitizeTarget(newTarget) : newTarget;
    return updateDoc(docRef, {
        [config.targetField]: value,
        updatedAt: serverTimestamp(),
    });
}
