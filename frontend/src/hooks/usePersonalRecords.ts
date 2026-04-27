/**
 * usePersonalRecords Hook
 *
 * Story 14.19: Personal Records Detection
 * Epic 14: Core Implementation
 *
 * AC#5: Integration with Celebration System
 *
 * Hook for detecting and celebrating personal spending records.
 * Integrates with the Celebration System for celebrateBig effects.
 */

import { useState, useCallback, useRef } from 'react';
import { Firestore } from 'firebase/firestore';
import type { Transaction } from '../types/transaction';
import type { PersonalRecord } from '../types/personalRecord';
import {
    detectAndFilterRecords,
    getCurrentWeekId,
} from '@features/insights/services/recordsService';
import { useRecordsRepository } from '@/repositories';

/**
 * Options for usePersonalRecords hook
 */
export interface UsePersonalRecordsOptions {
    /** Firestore instance */
    db: Firestore | null;
    /** User ID */
    userId: string | null;
    /** Application ID */
    appId: string | null;
}

/**
 * Result of the personal records hook
 */
export interface UsePersonalRecordsResult {
    /** Current record to celebrate (if any) */
    recordToCelebrate: PersonalRecord | null;
    /** Whether a record banner should be shown */
    showRecordBanner: boolean;
    /** Check for records after a transaction save */
    checkForRecords: (transactions: Transaction[]) => void;
    /** Dismiss the current record banner */
    dismissRecord: () => void;
    /** Clear any pending record celebration */
    clearPendingCelebration: () => void;
}

/**
 * Hook for managing personal record detection and celebration.
 *
 * Usage:
 * 1. Call checkForRecords() after saving a transaction
 * 2. If recordToCelebrate is set, trigger celebrateBig
 * 3. Show PersonalRecordBanner when showRecordBanner is true
 * 4. Call dismissRecord() when user dismisses the banner
 *
 * @example
 * ```tsx
 * const { recordToCelebrate, showRecordBanner, checkForRecords, dismissRecord } = usePersonalRecords();
 *
 * // After saving a transaction
 * useEffect(() => {
 *   if (savedTransaction) {
 *     checkForRecords(allTransactions);
 *   }
 * }, [savedTransaction]);
 *
 * // Trigger celebration when record is detected
 * useEffect(() => {
 *   if (recordToCelebrate) {
 *     celebrationRef.current?.celebratePreset('personalRecord');
 *   }
 * }, [recordToCelebrate]);
 *
 * // Show banner after celebration
 * {showRecordBanner && recordToCelebrate && (
 *   <PersonalRecordBanner record={recordToCelebrate} onDismiss={dismissRecord} />
 * )}
 * ```
 */
export function usePersonalRecords({
    db,
    userId,
    appId,
}: UsePersonalRecordsOptions): UsePersonalRecordsResult {
    const recordsRepo = useRecordsRepository();
    const [recordToCelebrate, setRecordToCelebrate] = useState<PersonalRecord | null>(null);
    const [showRecordBanner, setShowRecordBanner] = useState(false);

    // Track if we've already checked in this session to avoid duplicate checks
    const lastCheckWeekRef = useRef<string | null>(null);

    /**
     * Calculates current week totals by category from transactions.
     */
    const calculateCurrentWeekTotals = useCallback((transactions: Transaction[]): Record<string, number> => {
        const currentWeekId = getCurrentWeekId(new Date());
        const totals: Record<string, number> = {};

        for (const tx of transactions) {
            // Parse date to get week ID
            const [year, month, day] = tx.date.split('-').map(Number);
            const txDate = new Date(year, month - 1, day, 12, 0, 0);
            const txWeekId = getCurrentWeekId(txDate);

            if (txWeekId === currentWeekId && tx.category) {
                totals[tx.category] = (totals[tx.category] || 0) + tx.total;
            }
        }

        return totals;
    }, []);

    /**
     * Gets unique categories from transactions.
     */
    const getCategories = useCallback((transactions: Transaction[]): string[] => {
        const categories = new Set<string>();
        for (const tx of transactions) {
            if (tx.category) {
                categories.add(tx.category);
            }
        }
        return Array.from(categories);
    }, []);

    /**
     * Checks for personal records after a transaction save.
     * Should be called after each transaction is saved.
     */
    const checkForRecords = useCallback((transactions: Transaction[]) => {
        // Skip if not authenticated or services not available
        if (!userId || !db || !appId) return;

        // Only check once per week to avoid excessive detection
        const currentWeekId = getCurrentWeekId(new Date());
        if (lastCheckWeekRef.current === currentWeekId) {
            return;
        }

        const categories = getCategories(transactions);
        const currentWeekTotals = calculateCurrentWeekTotals(transactions);

        const result = detectAndFilterRecords(transactions, categories, currentWeekTotals);

        if (result.shouldCelebrate && result.recordToCelebrate) {
            // Mark this week as checked
            lastCheckWeekRef.current = currentWeekId;

            // Set record for celebration
            setRecordToCelebrate(result.recordToCelebrate);

            // Store the record in Firestore (fire-and-forget)
            recordsRepo?.store(result.recordToCelebrate).catch((error) => {
                console.warn('[PersonalRecords] Failed to store record:', error);
            });

            // Show banner after a delay (to let confetti play first)
            setTimeout(() => {
                setShowRecordBanner(true);
            }, 1500);
        }
    }, [userId, db, appId, getCategories, calculateCurrentWeekTotals]);

    /**
     * Dismisses the current record banner.
     */
    const dismissRecord = useCallback(() => {
        setShowRecordBanner(false);
        // Keep recordToCelebrate for a bit in case caller needs it
        setTimeout(() => {
            setRecordToCelebrate(null);
        }, 300);
    }, []);

    /**
     * Clears any pending celebration without showing it.
     */
    const clearPendingCelebration = useCallback(() => {
        setRecordToCelebrate(null);
        setShowRecordBanner(false);
    }, []);

    return {
        recordToCelebrate,
        showRecordBanner,
        checkForRecords,
        dismissRecord,
        clearPendingCelebration,
    };
}

export default usePersonalRecords;
