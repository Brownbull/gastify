/**
 * Duplicate Grouping Utility
 *
 * Story 15-1e: Shared Union-Find grouping algorithm extracted from
 * duplicateDetectionService.ts and itemDuplicateDetectionService.ts.
 *
 * Both services had identical grouping logic (~70 lines each).
 */

/**
 * Build groups of related duplicates using Union-Find.
 *
 * Takes a duplicate map (entityId -> [duplicateIds]) and merges
 * transitive relationships into unified groups.
 *
 * @returns Array of unique groups (each group is a Set of entity IDs)
 */
export function buildDuplicateGroups(
    duplicateMap: Map<string, string[]>
): Set<string>[] {
    const idToGroup = new Map<string, Set<string>>();

    for (const [entityId, duplicateIds] of duplicateMap) {
        let group = idToGroup.get(entityId);
        if (!group) {
            group = new Set([entityId]);
            idToGroup.set(entityId, group);
        }

        for (const dupId of duplicateIds) {
            const existingGroup = idToGroup.get(dupId);
            if (existingGroup && existingGroup !== group) {
                // Merge groups
                for (const id of existingGroup) {
                    group.add(id);
                    idToGroup.set(id, group);
                }
            } else {
                group.add(dupId);
                idToGroup.set(dupId, group);
            }
        }
    }

    // Deduplicate groups (multiple IDs point to same Set reference)
    const uniqueGroups = new Set<Set<string>>();
    for (const group of idToGroup.values()) {
        uniqueGroups.add(group);
    }
    return Array.from(uniqueGroups);
}

/**
 * Generic filter-and-group pipeline for duplicate entities.
 *
 * @param items - All items to process
 * @param duplicateMap - Map from entity ID to its duplicate IDs
 * @param getId - Extract the ID from an entity
 * @param sortGroups - Comparator to order groups relative to each other
 * @param sortWithin - Comparator to order items within a group
 * @returns Items filtered to only duplicates, grouped together
 */
export function filterAndGroupDuplicates<T>(
    items: T[],
    duplicateMap: Map<string, string[]>,
    getId: (item: T) => string,
    sortGroups: (a: T | undefined, b: T | undefined) => number,
    sortWithin: (a: T, b: T) => number,
): T[] {
    if (duplicateMap.size === 0) return [];

    const groups = buildDuplicateGroups(duplicateMap);

    // Create item lookup
    const itemById = new Map<string, T>();
    for (const item of items) {
        itemById.set(getId(item), item);
    }

    // Sort groups
    const sortedGroups = groups.sort((a, b) => {
        const aFirst = itemById.get(Array.from(a)[0]);
        const bFirst = itemById.get(Array.from(b)[0]);
        return sortGroups(aFirst, bFirst);
    });

    // Build result
    const result: T[] = [];
    const addedIds = new Set<string>();

    for (const group of sortedGroups) {
        const groupItems = Array.from(group)
            .map(id => itemById.get(id))
            .filter((item): item is T => item !== undefined && !addedIds.has(getId(item)))
            .sort(sortWithin);

        for (const item of groupItems) {
            result.push(item);
            addedIds.add(getId(item));
        }
    }

    return result;
}
