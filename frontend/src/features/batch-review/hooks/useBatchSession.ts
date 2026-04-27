/**
 * useBatchSession Hook
 *
 * Story 10.7: Batch Mode Summary
 * Tracks multi-receipt scanning sessions for batch summary display.
 *
 * Features:
 * - Tracks receipts and insights in a session
 * - Session expires after 30 minutes of inactivity
 * - Enters "batch mode" after 3+ receipts (configurable threshold)
 * - Calculates total amount across session
 */

import { useState, useCallback, useEffect } from 'react';
import type { Transaction } from '@/types/transaction';
import { Insight } from '@/types/insight';

/**
 * Batch session state containing accumulated receipts and insights.
 */
export interface BatchSession {
  /** Receipts saved during this session */
  receipts: Transaction[];
  /** Insights generated during this session */
  insights: Insight[];
  /** When the session started */
  startedAt: Date;
  /** Total amount across all receipts in session */
  totalAmount: number;
}

export interface UseBatchSessionReturn {
  /** Current batch session, or null if no active session */
  session: BatchSession | null;
  /** Add a transaction (and optionally its insight) to the batch */
  addToBatch: (tx: Transaction, insight: Insight | null) => void;
  /** Clear the current batch session */
  clearBatch: () => void;
  /** True if 3+ receipts have been scanned in this session */
  isBatchMode: boolean;
}

/** Number of receipts required to trigger batch mode (AC #1) */
const BATCH_THRESHOLD = 3;

/** Session timeout in milliseconds (30 minutes) */
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Hook for tracking batch scanning sessions.
 * Accumulates receipts and insights across multiple saves within a time window.
 */
export function useBatchSession(): UseBatchSessionReturn {
  const [session, setSession] = useState<BatchSession | null>(null);

  /**
   * Cleanup effect: Clear session if it has expired.
   * Runs on mount and when session changes to ensure stale sessions are cleared.
   */
  useEffect(() => {
    if (!session) return;

    const elapsed = Date.now() - session.startedAt.getTime();
    if (elapsed >= SESSION_TIMEOUT_MS) {
      // Session already expired, clear it
      setSession(null);
      return;
    }

    // Schedule cleanup for when session will expire
    const remainingTime = SESSION_TIMEOUT_MS - elapsed;
    const timer = setTimeout(() => {
      setSession(null);
    }, remainingTime);

    return () => clearTimeout(timer);
  }, [session]);

  /**
   * Add a transaction (and optionally its insight) to the current batch.
   * Creates a new session if none exists or if the previous one expired.
   */
  const addToBatch = useCallback((tx: Transaction, insight: Insight | null) => {
    setSession(prev => {
      const now = new Date();

      // Start new session if none exists or expired
      if (!prev || (Date.now() - prev.startedAt.getTime()) > SESSION_TIMEOUT_MS) {
        return {
          receipts: [tx],
          insights: insight ? [insight] : [],
          startedAt: now,
          totalAmount: tx.total,
        };
      }

      // Add to existing session
      return {
        ...prev,
        receipts: [...prev.receipts, tx],
        insights: insight ? [...prev.insights, insight] : prev.insights,
        totalAmount: prev.totalAmount + tx.total,
      };
    });
  }, []);

  /**
   * Clear the current batch session.
   */
  const clearBatch = useCallback(() => {
    setSession(null);
  }, []);

  // Calculate isBatchMode based on receipt count (AC #1: 3+ receipts)
  const isBatchMode = (session?.receipts.length ?? 0) >= BATCH_THRESHOLD;

  return {
    session,
    addToBatch,
    clearBatch,
    isBatchMode,
  };
}
