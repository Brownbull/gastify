/**
 * useUserCredits Hook
 *
 * React hook for managing user scan credits with Firestore persistence.
 * Credits persist across logins and are only modified by scanning receipts.
 *
 * Story 15b-3d: Migrated from direct userCreditsService imports to ICreditsRepository.
 * All Firestore operations now go through useCreditsRepository().
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { User } from 'firebase/auth';
import { UserCredits, DEFAULT_CREDITS } from '../types/scan';
import { useCreditsRepository } from '@/repositories/hooks';

interface UseUserCreditsResult {
  /** Current user credits (both normal and super) */
  credits: UserCredits;
  /** Loading state */
  loading: boolean;
  /** Error from loading credits (null if no error) */
  error: Error | null;
  /** Whether credits are currently reserved (pending confirmation) */
  hasReservedCredits: boolean;
  /** Deduct normal credits (for scanning) */
  deductCredits: (amount: number) => Promise<boolean>;
  /** Deduct super credits (tier 2) */
  deductSuperCredits: (amount: number) => Promise<boolean>;
  /** Add normal credits (for purchases, promotions) */
  addCredits: (amount: number) => Promise<void>;
  /** Add super credits (tier 2) */
  addSuperCredits: (amount: number) => Promise<void>;
  /** Force refresh credits from Firestore (e.g., after admin changes) */
  refreshCredits: () => Promise<void>;
  /**
   * Story 14.24: Reserve credits locally without persisting to Firestore.
   * Used when scan starts - UI shows deducted but not saved to server.
   * Must call confirmReservedCredits on success or refundReservedCredits on failure.
   */
  reserveCredits: (amount: number, type?: 'normal' | 'super') => boolean;
  /**
   * Story 14.24: Confirm reserved credits by persisting to Firestore.
   * Called after successful scan completion.
   */
  confirmReservedCredits: () => Promise<boolean>;
  /**
   * Story 14.24: Refund reserved credits (restore UI state).
   * Called when scan fails - credit is not charged.
   */
  refundReservedCredits: () => void;
}

/**
 * State for tracking reserved credits during scan operations.
 * Story 14.24: Credits are reserved (UI deducted) but not persisted until scan succeeds.
 */
interface ReservedCreditsState {
  /** Amount of credits reserved */
  amount: number;
  /** Type of credits reserved */
  type: 'normal' | 'super';
  /** Credits before reservation (for rollback) */
  originalCredits: UserCredits;
}

export function useUserCredits(
  user: User | null
): UseUserCreditsResult {
  const repo = useCreditsRepository();
  const [credits, setCredits] = useState<UserCredits>(DEFAULT_CREDITS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Track if we've loaded credits for this user to avoid resetting
  const loadedForUserRef = useRef<string | null>(null);

  // Story 14.24: Track reserved credits (pending confirmation)
  const [reservedCredits, setReservedCredits] = useState<ReservedCreditsState | null>(null);

  // Load credits on mount or when user/repo change
  useEffect(() => {
    if (!user || !repo) {
      setLoading(false);
      return;
    }

    // Skip if already loaded for this user
    if (loadedForUserRef.current === user.uid) {
      return;
    }

    const loadCredits = async () => {
      setLoading(true);
      setError(null);
      try {
        const userCredits = await repo.get();
        setCredits(userCredits);
        loadedForUserRef.current = user.uid;
      } catch (err) {
        console.error('Failed to load user credits:', err);
        setError(new Error('Unable to load credits. Please try again later.'));
      } finally {
        setLoading(false);
      }
    };

    loadCredits();
  }, [user, repo]);

  // Refresh credits when app becomes visible (catches admin changes made while in background)
  useEffect(() => {
    if (!user || !repo) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh credits when user returns to app
        repo.get()
          .then((refreshed) => {
            setCredits(refreshed);
            setError(null);
          })
          .catch((err) => {
            console.error('Failed to refresh credits on visibility change:', err);
            setError(new Error('Unable to refresh credits. Please try again later.'));
          });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, repo]);

  // Deduct normal credits (for scanning receipts)
  // Uses transactional repo.deduct to prevent TOCTOU overdrafts (TD-10)
  const deductCredits = useCallback(
    async (amount: number): Promise<boolean> => {
      if (!repo) return false;

      try {
        const updatedCredits = await repo.deduct(amount);
        setCredits(updatedCredits);
        return true;
      } catch (error) {
        // 'Insufficient credits' or 'Amount must be a positive integer' are expected
        if (error instanceof Error && error.message === 'Insufficient credits') {
          return false;
        }
        console.error('Failed to deduct credits:', error);
        return false;
      }
    },
    [repo]
  );

  // Deduct super credits (tier 2)
  // Uses transactional repo.deductSuper to prevent TOCTOU overdrafts (TD-10)
  const deductSuperCredits = useCallback(
    async (amount: number): Promise<boolean> => {
      if (!repo) return false;

      try {
        const updatedCredits = await repo.deductSuper(amount);
        setCredits(updatedCredits);
        return true;
      } catch (error) {
        if (error instanceof Error && error.message === 'Insufficient super credits') {
          return false;
        }
        console.error('Failed to deduct super credits:', error);
        return false;
      }
    },
    [repo]
  );

  // Add normal credits (for purchases, promotions, etc.)
  // Uses transactional repo.add to prevent lost updates (TD-13)
  const addCredits = useCallback(
    async (amount: number): Promise<void> => {
      if (!repo) return;

      try {
        const updatedCredits = await repo.add(amount);
        setCredits(updatedCredits);
      } catch (error) {
        console.error('Failed to add credits:', error);
        throw new Error('Unable to add credits. Please try again later.');
      }
    },
    [repo]
  );

  // Add super credits (for purchases, promotions, etc.)
  // Uses transactional repo.addSuper to prevent lost updates (TD-13)
  const addSuperCredits = useCallback(
    async (amount: number): Promise<void> => {
      if (!repo) return;

      try {
        const updatedCredits = await repo.addSuper(amount);
        setCredits(updatedCredits);
      } catch (error) {
        console.error('Failed to add super credits:', error);
        throw new Error('Unable to add credits. Please try again later.');
      }
    },
    [repo]
  );

  // Force refresh credits from Firestore (e.g., after admin changes or app resume)
  const refreshCredits = useCallback(async (): Promise<void> => {
    if (!repo) return;

    setLoading(true);
    try {
      const userCredits = await repo.get();
      setCredits(userCredits);
    } catch (error) {
      console.error('Failed to refresh user credits:', error);
    } finally {
      setLoading(false);
    }
  }, [repo]);

  /**
   * Story 14.24: Reserve credits locally without persisting to Firestore.
   * UI will show the deducted amount, but Firestore is not updated until confirmReservedCredits.
   * Returns true if reservation succeeded, false if insufficient credits.
   */
  const reserveCredits = useCallback(
    (amount: number, type: 'normal' | 'super' = 'normal'): boolean => {
      // Check if sufficient credits
      const available = type === 'super' ? credits.superRemaining : credits.remaining;
      if (available < amount) {
        return false;
      }

      // If there's already a reservation, refund it first (shouldn't happen normally)
      if (reservedCredits) {
        if (import.meta.env.DEV) console.warn('reserveCredits called with existing reservation - refunding first');
        setCredits(reservedCredits.originalCredits);
      }

      // Store original credits for potential rollback
      const originalCredits = { ...credits };

      // Optimistically deduct from local state (UI shows deducted amount)
      const newCredits: UserCredits =
        type === 'super'
          ? {
              remaining: credits.remaining,
              used: credits.used,
              superRemaining: credits.superRemaining - amount,
              superUsed: credits.superUsed + amount,
            }
          : {
              remaining: credits.remaining - amount,
              used: credits.used + amount,
              superRemaining: credits.superRemaining,
              superUsed: credits.superUsed,
            };

      setCredits(newCredits);
      setReservedCredits({ amount, type, originalCredits });

      return true;
    },
    [credits, reservedCredits]
  );

  /**
   * Story 14.24: Confirm reserved credits by persisting to Firestore.
   * Called after successful scan completion.
   * TD-10: Uses transactional deduction to prevent TOCTOU overdrafts.
   */
  const confirmReservedCredits = useCallback(async (): Promise<boolean> => {
    if (!repo) {
      if (import.meta.env.DEV) console.error('confirmReservedCredits: no repository available');
      return false;
    }

    if (!reservedCredits) {
      if (import.meta.env.DEV) console.warn('confirmReservedCredits called without reservation');
      return false;
    }

    try {
      // Use transactional deduction — reads fresh balance inside transaction
      const updatedCredits = reservedCredits.type === 'super'
        ? await repo.deductSuper(reservedCredits.amount)
        : await repo.deduct(reservedCredits.amount);
      setCredits(updatedCredits);
      setReservedCredits(null);
      return true;
    } catch (error) {
      console.error('Failed to confirm reserved credits:', error);
      // Refund: restore pre-reservation state
      setCredits(reservedCredits.originalCredits);
      setReservedCredits(null);
      return false;
    }
  }, [repo, reservedCredits]);

  /**
   * Story 14.24: Refund reserved credits (restore UI state).
   * Called when scan fails - credit is not charged.
   */
  const refundReservedCredits = useCallback((): void => {
    if (!reservedCredits) {
      if (import.meta.env.DEV) console.warn('refundReservedCredits called without reservation');
      return;
    }

    // Restore original credits (before reservation)
    setCredits(reservedCredits.originalCredits);
    setReservedCredits(null);
  }, [reservedCredits]);

  return {
    credits,
    loading,
    error,
    hasReservedCredits: reservedCredits !== null,
    deductCredits,
    deductSuperCredits,
    addCredits,
    addSuperCredits,
    refreshCredits,
    reserveCredits,
    confirmReservedCredits,
    refundReservedCredits,
  };
}
