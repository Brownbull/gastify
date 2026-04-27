/**
 * Personal Records Type Definitions
 *
 * Story 14.19: Personal Records Detection
 * Epic 14: Core Implementation
 *
 * Type definitions for personal records detection and celebration system.
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// Core Types
// ============================================================================

/**
 * Types of personal records that can be detected
 */
export type PersonalRecordType =
    | 'lowest_category_week'       // Lowest spending in a category this week
    | 'lowest_total_week'          // Lowest total spending this week
    | 'consecutive_tracking_days'  // Consecutive days tracking expenses
    | 'first_under_budget'         // First time under budget in a category
    | 'savings_milestone';         // Reached a savings goal

/**
 * A detected personal record
 */
export interface PersonalRecord {
    /** Unique identifier */
    id: string;
    /** Type of record achieved */
    type: PersonalRecordType;
    /** Category for category-specific records (e.g., 'Restaurant') */
    category?: string;
    /** The value that set the record (e.g., weekly total) */
    value: number;
    /** The previous best value (for comparison messaging) */
    previousBest?: number;
    /** When the record was achieved */
    achievedAt: Date;
    /** Human-readable message describing the achievement */
    message: string;
    /** Number of months/weeks this spans (for messaging like "in 3 months") */
    lookbackPeriod?: number;
}

/**
 * Firestore document for stored personal records
 * Path: artifacts/{appId}/users/{userId}/personalRecords/{recordId}
 */
export interface StoredPersonalRecord {
    /** Firestore document ID (populated when reading from Firestore) */
    id?: string;
    /** Record type */
    type: PersonalRecordType;
    /** Category for category-specific records */
    category?: string;
    /** The value that set the record */
    value: number;
    /** Previous best value */
    previousBest?: number;
    /** When achieved (Firestore timestamp) */
    achievedAt: Timestamp;
    /** Lookback period in months */
    lookbackPeriod?: number;
}

// ============================================================================
// Cooldown Types
// ============================================================================

/**
 * Cooldown state for record celebrations
 * Prevents overwhelming users with too many celebrations
 */
export interface RecordCooldowns {
    /** Timestamp of last celebration in this session (any record type) */
    lastSessionCelebration: string | null;
    /** Per-record-type cooldowns (ISO timestamp strings) */
    recordTypeCooldowns: Partial<Record<PersonalRecordType, string>>;
}

/**
 * localStorage key for record cooldowns
 */
export const RECORD_COOLDOWNS_KEY = 'boletapp_record_cooldowns';

/**
 * Cooldown period for same record type (24 hours in milliseconds)
 */
export const RECORD_TYPE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// ============================================================================
// Detection Context Types
// ============================================================================

/**
 * Weekly total for a specific category
 */
export interface WeeklyTotal {
    /** Week identifier (ISO week format: YYYY-Www) */
    weekId: string;
    /** Start date of the week */
    weekStart: Date;
    /** End date of the week */
    weekEnd: Date;
    /** Total spending for this week */
    total: number;
}

/**
 * Context for detecting records after a transaction save
 */
export interface RecordDetectionContext {
    /** User ID */
    userId: string;
    /** All user transactions */
    transactions: import('./transaction').Transaction[];
    /** Current week's total by category */
    currentWeekTotals: Record<string, number>;
}

// ============================================================================
// Service Response Types
// ============================================================================

/**
 * Result of record detection attempt
 */
export interface RecordDetectionResult {
    /** Detected records (may be empty) */
    records: PersonalRecord[];
    /** Whether any record passed cooldown check and should be celebrated */
    shouldCelebrate: boolean;
    /** The top record to celebrate (if any) */
    recordToCelebrate?: PersonalRecord;
}
