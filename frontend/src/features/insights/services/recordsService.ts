/**
 * Records Service
 *
 * Story 14.19: Personal Records Detection
 * Epic 14: Core Implementation
 *
 * Service for detecting personal spending records (e.g., "lowest restaurant week").
 * Integrates with the Insight Engine and Celebration System.
 *
 * Pattern: Functional module matching existing insightEngineService.ts pattern
 */

import {
    collection,
    addDoc,
    getDocs,
    doc,
    deleteDoc,
    query,
    orderBy,
    limit,
    Firestore,
    Timestamp,
} from 'firebase/firestore';
import { personalRecordsPath, assertValidSegment } from '@/lib/firestorePaths';
import { batchDelete } from '@/lib/firestoreBatch';
import type { Transaction } from '@/types/transaction';
import type {
    PersonalRecord,
    PersonalRecordType,
    RecordCooldowns,
    WeeklyTotal,
    RecordDetectionResult,
    StoredPersonalRecord,
} from '@/types/personalRecord';
import {
    RECORD_COOLDOWNS_KEY,
    RECORD_TYPE_COOLDOWN_MS,
} from '@/types/personalRecord';
import { getStorageJSON, setStorageJSON } from '@/utils/storage';

// ============================================================================
// Date Parsing Utilities
// ============================================================================

/**
 * Parses a date string (YYYY-MM-DD) into a Date object at noon local time.
 * This avoids timezone issues when comparing dates.
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date at noon local time
 */
function parseDateString(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
}

// ============================================================================
// Week Calculation Utilities
// ============================================================================

/**
 * Gets the ISO week ID for a given date (YYYY-Www format).
 * ISO 8601: Week 1 is the first week with at least 4 days in the new year.
 *
 * @param date - Date to get week ID for
 * @returns Week ID in format "YYYY-Www" (e.g., "2025-W02")
 */
export function getCurrentWeekId(date: Date = new Date()): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    // Get first day of year
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    // Calculate full weeks to nearest Thursday
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    // Return ISO week string
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Gets the start of the ISO week (Monday) for a given date.
 *
 * @param date - Any date within the week
 * @returns Monday 00:00:00 of that week
 */
export function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Gets the end of the ISO week (Sunday) for a given date.
 *
 * @param date - Any date within the week
 * @returns Sunday 23:59:59 of that week
 */
export function getWeekEnd(date: Date): Date {
    const start = getWeekStart(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
}

/**
 * Gets all weeks within a date range.
 *
 * @param endDate - End date (usually current date)
 * @param lookbackMonths - Number of months to look back
 * @returns Array of WeeklyTotal objects (without totals filled in)
 */
export function getWeeksInRange(endDate: Date, lookbackMonths: number): WeeklyTotal[] {
    const weeks: WeeklyTotal[] = [];
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - lookbackMonths);

    let current = getWeekStart(startDate);
    const end = getWeekEnd(endDate);

    while (current <= end) {
        const weekEnd = getWeekEnd(current);
        weeks.push({
            weekId: getCurrentWeekId(current),
            weekStart: new Date(current),
            weekEnd: new Date(weekEnd),
            total: 0,
        });
        // Move to next week
        current = new Date(current);
        current.setDate(current.getDate() + 7);
    }

    return weeks;
}

// ============================================================================
// Weekly Totals Calculation
// ============================================================================

/**
 * Calculates weekly spending totals for a specific category.
 *
 * @param transactions - All user transactions
 * @param category - Category to filter by
 * @param lookbackMonths - Number of months to analyze
 * @returns Array of weekly totals, sorted chronologically
 */
export function getWeeklyTotalsForCategory(
    transactions: Transaction[],
    category: string,
    lookbackMonths: number
): WeeklyTotal[] {
    const now = new Date();
    const weeks = getWeeksInRange(now, lookbackMonths);

    // Filter transactions by category
    const categoryTxns = transactions.filter((tx) => tx.category === category);

    // Group transactions by week
    for (const tx of categoryTxns) {
        // Parse date string (YYYY-MM-DD) to avoid timezone issues
        const txDate = parseDateString(tx.date);
        const weekId = getCurrentWeekId(txDate);

        const week = weeks.find((w) => w.weekId === weekId);
        if (week) {
            week.total += tx.total;
        }
    }

    return weeks;
}

// ============================================================================
// Record Detection
// ============================================================================

/**
 * Detects if the current week is the lowest spending week for a category.
 *
 * @param transactions - All user transactions
 * @param category - Category to check
 * @param currentWeekTotal - Total spending this week in the category
 * @param lookbackMonths - Number of months to compare against (default: 3)
 * @returns PersonalRecord if new record detected, null otherwise
 */
export function detectLowestCategoryWeek(
    transactions: Transaction[],
    category: string,
    currentWeekTotal: number,
    lookbackMonths: number = 3
): PersonalRecord | null {
    const weeklyTotals = getWeeklyTotalsForCategory(transactions, category, lookbackMonths);

    // Filter to weeks that have any transactions in that timeframe
    // We need historical data to compare against
    const weeksWithData = weeklyTotals.filter((w) => {
        // Check if any transaction exists in this week for this category
        return transactions.some((tx) => {
            // Parse date string to avoid timezone issues
            const txWeekId = getCurrentWeekId(parseDateString(tx.date));
            return txWeekId === w.weekId && tx.category === category;
        });
    });

    // Need at least 2 weeks of historical data
    if (weeksWithData.length < 2) {
        return null;
    }

    // Get historical weeks (exclude current week)
    const currentWeekId = getCurrentWeekId(new Date());
    const historical = weeksWithData.filter((w) => w.weekId !== currentWeekId);

    if (historical.length < 1) {
        return null;
    }

    // Find the previous best (lowest total)
    const previousBest = Math.min(...historical.map((w) => w.total));

    // Check if current week beats the record
    if (currentWeekTotal < previousBest) {
        return {
            id: `record-${Date.now()}`,
            type: 'lowest_category_week',
            category,
            value: currentWeekTotal,
            previousBest,
            achievedAt: new Date(),
            message: generateRecordMessage('lowest_category_week', category, lookbackMonths),
            lookbackPeriod: lookbackMonths,
        };
    }

    return null;
}

/**
 * Detects if the current week is the lowest total spending week.
 *
 * @param transactions - All user transactions
 * @param currentWeekTotal - Total spending this week
 * @param lookbackMonths - Number of months to compare against
 * @returns PersonalRecord if new record detected, null otherwise
 */
export function detectLowestTotalWeek(
    transactions: Transaction[],
    currentWeekTotal: number,
    lookbackMonths: number = 3
): PersonalRecord | null {
    const now = new Date();
    const weeks = getWeeksInRange(now, lookbackMonths);

    // Calculate totals for each week
    for (const tx of transactions) {
        // Parse date string (YYYY-MM-DD) to avoid timezone issues
        const txDate = parseDateString(tx.date);
        const weekId = getCurrentWeekId(txDate);

        const week = weeks.find((w) => w.weekId === weekId);
        if (week) {
            week.total += tx.total;
        }
    }

    // Get weeks with data
    const weeksWithData = weeks.filter((w) => w.total > 0);

    // Need at least 2 weeks of data
    if (weeksWithData.length < 2) {
        return null;
    }

    // Get historical weeks (exclude current week)
    const currentWeekId = getCurrentWeekId(now);
    const historical = weeksWithData.filter((w) => w.weekId !== currentWeekId);

    if (historical.length < 1) {
        return null;
    }

    const previousBest = Math.min(...historical.map((w) => w.total));

    if (currentWeekTotal < previousBest) {
        return {
            id: `record-${Date.now()}`,
            type: 'lowest_total_week',
            value: currentWeekTotal,
            previousBest,
            achievedAt: new Date(),
            message: generateRecordMessage('lowest_total_week', undefined, lookbackMonths),
            lookbackPeriod: lookbackMonths,
        };
    }

    return null;
}

/**
 * Detects all possible records for the current context.
 *
 * @param transactions - All user transactions
 * @param categories - Categories to check for records
 * @param currentWeekTotals - Current week totals by category
 * @returns Array of detected records
 */
export function detectAllRecords(
    transactions: Transaction[],
    categories: string[],
    currentWeekTotals: Record<string, number>
): PersonalRecord[] {
    const records: PersonalRecord[] = [];

    // Check each category for lowest week record
    for (const category of categories) {
        const total = currentWeekTotals[category] ?? 0;
        const record = detectLowestCategoryWeek(transactions, category, total, 3);
        if (record) {
            records.push(record);
        }
    }

    // Check for lowest total week
    const totalSpending = Object.values(currentWeekTotals).reduce((sum, v) => sum + v, 0);
    const totalRecord = detectLowestTotalWeek(transactions, totalSpending, 3);
    if (totalRecord) {
        records.push(totalRecord);
    }

    return records;
}

// ============================================================================
// Message Generation
// ============================================================================

/**
 * Generates a human-readable message for a record.
 *
 * @param type - Type of record
 * @param category - Category (for category-specific records)
 * @param lookbackMonths - Number of months the record spans
 * @returns Spanish message describing the achievement
 */
export function generateRecordMessage(
    type: PersonalRecordType,
    category?: string,
    lookbackMonths: number = 3
): string {
    const periodText = lookbackMonths === 1 ? '1 mes' : `${lookbackMonths} meses`;

    switch (type) {
        case 'lowest_category_week':
            return `¡Tu semana más baja en ${category} en ${periodText}!`;

        case 'lowest_total_week':
            return `¡Tu semana de menor gasto total en ${periodText}!`;

        case 'consecutive_tracking_days':
            return `¡${lookbackMonths} días seguidos registrando gastos!`;

        case 'first_under_budget':
            return `¡Primera semana bajo presupuesto en ${category}!`;

        case 'savings_milestone':
            return `¡Meta de ahorro alcanzada!`;

        default:
            return '¡Récord personal!';
    }
}

// ============================================================================
// Cooldown Management
// ============================================================================

/**
 * Returns default cooldowns state (no cooldowns active).
 */
export function getDefaultCooldowns(): RecordCooldowns {
    return {
        lastSessionCelebration: null,
        recordTypeCooldowns: {},
    };
}

/**
 * Gets record cooldowns from localStorage.
 *
 * @returns Current cooldowns state
 */
export function getRecordCooldowns(): RecordCooldowns {
    const parsed = getStorageJSON<RecordCooldowns | null>(RECORD_COOLDOWNS_KEY, null);
    if (parsed && typeof parsed === 'object' && 'recordTypeCooldowns' in parsed) {
        return parsed;
    }
    return getDefaultCooldowns();
}

/**
 * Saves record cooldowns to localStorage.
 */
export function setRecordCooldowns(cooldowns: RecordCooldowns): void {
    setStorageJSON(RECORD_COOLDOWNS_KEY, cooldowns);
}

/**
 * Checks if a record can be shown based on cooldowns.
 *
 * Rules:
 * - Maximum one celebration per session
 * - Minimum 24h between same record type
 *
 * @param type - Record type to check
 * @param cooldowns - Current cooldowns state
 * @returns true if record can be shown
 */
export function canShowRecord(
    type: PersonalRecordType,
    cooldowns: RecordCooldowns
): boolean {
    const now = Date.now();

    // Check session cooldown
    if (cooldowns.lastSessionCelebration) {
        const lastCelebration = new Date(cooldowns.lastSessionCelebration).getTime();
        // Consider it same session if within 30 minutes
        const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
        if (now - lastCelebration < SESSION_TIMEOUT_MS) {
            return false;
        }
    }

    // Check record type cooldown (24h)
    const lastOfType = cooldowns.recordTypeCooldowns[type];
    if (lastOfType) {
        const lastTime = new Date(lastOfType).getTime();
        if (now - lastTime < RECORD_TYPE_COOLDOWN_MS) {
            return false;
        }
    }

    return true;
}

/**
 * Updates cooldowns after showing a record celebration.
 *
 * @param cooldowns - Current cooldowns
 * @param type - Record type that was shown
 * @returns Updated cooldowns
 */
export function updateRecordCooldowns(
    cooldowns: RecordCooldowns,
    type: PersonalRecordType
): RecordCooldowns {
    const now = new Date().toISOString();

    return {
        lastSessionCelebration: now,
        recordTypeCooldowns: {
            ...cooldowns.recordTypeCooldowns,
            [type]: now,
        },
    };
}

// ============================================================================
// Main Detection Entry Point
// ============================================================================

/**
 * Main entry point for record detection after a transaction save.
 * Checks for records and applies cooldown logic.
 *
 * @param transactions - All user transactions
 * @param categories - Categories to check
 * @param currentWeekTotals - Current week totals by category
 * @returns Detection result with record to celebrate (if any)
 */
export function detectAndFilterRecords(
    transactions: Transaction[],
    categories: string[],
    currentWeekTotals: Record<string, number>
): RecordDetectionResult {
    const records = detectAllRecords(transactions, categories, currentWeekTotals);

    if (records.length === 0) {
        return {
            records: [],
            shouldCelebrate: false,
        };
    }

    const cooldowns = getRecordCooldowns();

    // Find first record that passes cooldown check
    const recordToCelebrate = records.find((r) => canShowRecord(r.type, cooldowns));

    if (recordToCelebrate) {
        // Update cooldowns
        const updatedCooldowns = updateRecordCooldowns(cooldowns, recordToCelebrate.type);
        setRecordCooldowns(updatedCooldowns);

        return {
            records,
            shouldCelebrate: true,
            recordToCelebrate,
        };
    }

    return {
        records,
        shouldCelebrate: false,
    };
}

// ============================================================================
// Firestore Storage (AC #4)
// ============================================================================

/**
 * Stores a personal record in Firestore.
 *
 * @param db - Firestore instance
 * @param userId - User's auth UID
 * @param appId - Application ID
 * @param record - Personal record to store
 * @returns Document ID of stored record
 */
export async function storePersonalRecord(
    db: Firestore,
    userId: string,
    appId: string,
    record: PersonalRecord
): Promise<string> {
    const recordsRef = collection(db, personalRecordsPath(appId, userId));

    const storedRecord: StoredPersonalRecord = {
        type: record.type,
        value: record.value,
        achievedAt: Timestamp.fromDate(record.achievedAt),
        ...(record.category && { category: record.category }),
        ...(record.previousBest !== undefined && { previousBest: record.previousBest }),
        ...(record.lookbackPeriod !== undefined && { lookbackPeriod: record.lookbackPeriod }),
    };

    const docRef = await addDoc(recordsRef, storedRecord);
    return docRef.id;
}

/**
 * Gets recent personal records from Firestore.
 *
 * @param db - Firestore instance
 * @param userId - User's auth UID
 * @param appId - Application ID
 * @param maxRecords - Maximum number of records to return (default: 10)
 * @returns Array of stored records (most recent first)
 */
export async function getRecentPersonalRecords(
    db: Firestore,
    userId: string,
    appId: string,
    maxRecords: number = 10
): Promise<StoredPersonalRecord[]> {
    const recordsRef = collection(db, personalRecordsPath(appId, userId));

    const q = query(recordsRef, orderBy('achievedAt', 'desc'), limit(maxRecords));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
    } as StoredPersonalRecord));
}

/**
 * Checks if a similar record was achieved recently (duplicate detection).
 *
 * @param db - Firestore instance
 * @param userId - User's auth UID
 * @param appId - Application ID
 * @param record - Record to check
 * @param withinDays - Days to look back (default: 7)
 * @returns true if a similar record exists within the timeframe
 */
export async function hasRecentSimilarRecord(
    db: Firestore,
    userId: string,
    appId: string,
    record: PersonalRecord,
    withinDays: number = 7
): Promise<boolean> {
    const recentRecords = await getRecentPersonalRecords(db, userId, appId, 20);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - withinDays);

    return recentRecords.some((stored) => {
        const storedDate = stored.achievedAt.toDate();
        if (storedDate < cutoffDate) return false;

        // Same type and (if applicable) same category
        if (stored.type !== record.type) return false;
        if (record.category && stored.category !== record.category) return false;

        return true;
    });
}

// ============================================================================
// Delete Operations (Code Review Fix - Story 14.33d)
// ============================================================================

/**
 * Delete a single personal record from Firestore.
 *
 * @param db - Firestore instance
 * @param userId - User's auth UID
 * @param appId - Application ID
 * @param recordId - Record document ID to delete
 */
export async function deletePersonalRecord(
    db: Firestore,
    userId: string,
    appId: string,
    recordId: string
): Promise<void> {
    assertValidSegment(recordId, 'recordId');
    const recordRef = doc(db, personalRecordsPath(appId, userId), recordId);
    await deleteDoc(recordRef);
}

/**
 * Delete multiple personal records from Firestore in a batch.
 *
 * @param db - Firestore instance
 * @param userId - User's auth UID
 * @param appId - Application ID
 * @param recordIds - Array of record document IDs to delete
 */
export async function deletePersonalRecords(
    db: Firestore,
    userId: string,
    appId: string,
    recordIds: string[]
): Promise<void> {
    if (recordIds.length === 0) return;

    recordIds.forEach(id => assertValidSegment(id, 'recordId'));
    const refs = recordIds.map(id => doc(db, personalRecordsPath(appId, userId), id));
    await batchDelete(db, refs);
}
