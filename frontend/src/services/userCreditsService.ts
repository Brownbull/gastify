/**
 * User Credits Service
 *
 * Persists scan credits in Firestore per user profile.
 * Credits are stored at: artifacts/{appId}/users/{userId}/credits/balance
 *
 * Credits persist across logins and are only modified by:
 * - Scanning receipts (deduct)
 * - Future: purchasing credits, subscription renewal, promotions (add)
 */

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Firestore,
  FieldValue,
  Timestamp,
  runTransaction,
  DocumentSnapshot,
} from 'firebase/firestore';
import { UserCredits, DEFAULT_CREDITS } from '../types/scan';
import { creditsDocSegments } from '@/lib/firestorePaths';

/**
 * Firestore document structure for credits
 */
interface CreditsDocument {
  /** Remaining normal credits available */
  remaining: number;
  /** Total normal credits used (lifetime) */
  used: number;
  /** Remaining super credits (tier 2) available */
  superRemaining: number;
  /** Total super credits used (lifetime) */
  superUsed: number;
  /** When credits were last updated */
  updatedAt?: FieldValue | Timestamp;
  /** When user was created (for initial credit grant) */
  createdAt?: FieldValue | Timestamp;
}

/**
 * Get the Firestore document reference for user credits
 */
function getCreditsDocRef(db: Firestore, appId: string, userId: string) {
  return doc(db, ...creditsDocSegments(appId, userId));
}

/**
 * Read fresh credits from a Firestore document snapshot.
 * Returns DEFAULT_CREDITS if the document does not exist.
 * Used inside transactions to get the authoritative balance.
 */
function readFreshCredits(snap: DocumentSnapshot): UserCredits {
  const data = snap.exists() ? (snap.data() as CreditsDocument) : null;
  return data
    ? {
        remaining: data.remaining ?? DEFAULT_CREDITS.remaining,
        used: data.used ?? 0,
        superRemaining: data.superRemaining ?? DEFAULT_CREDITS.superRemaining,
        superUsed: data.superUsed ?? 0,
      }
    : DEFAULT_CREDITS;
}

/**
 * Load user credits from Firestore.
 * Returns DEFAULT_CREDITS for new users (and saves them).
 * Throws on network/permission errors — callers must handle failures.
 *
 * @param db - Firestore instance
 * @param userId - User ID from Firebase Auth
 * @param appId - Application ID
 * @returns User credits from Firestore or defaults for new users
 * @throws Error on Firestore read/write failure
 */
export async function getUserCredits(
  db: Firestore,
  userId: string,
  appId: string
): Promise<UserCredits> {
  const docRef = getCreditsDocRef(db, appId, userId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return readFreshCredits(docSnap);
  }

  // New user - grant initial credits and save to Firestore
  await setDoc(docRef, {
    remaining: DEFAULT_CREDITS.remaining,
    used: 0,
    superRemaining: DEFAULT_CREDITS.superRemaining,
    superUsed: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return DEFAULT_CREDITS;
}

/**
 * Save user credits to Firestore.
 *
 * @deprecated Use transactional methods (deductAndSaveCredits, addAndSaveCredits, etc.)
 * instead. This non-transactional setDoc bypasses TOCTOU safety and can cause lost updates.
 *
 * @param db - Firestore instance
 * @param userId - User ID from Firebase Auth
 * @param appId - Application ID
 * @param credits - Credits to save
 */
export async function saveUserCredits(
  db: Firestore,
  userId: string,
  appId: string,
  credits: UserCredits
): Promise<void> {
  const docRef = getCreditsDocRef(db, appId, userId);

  await setDoc(
    docRef,
    {
      remaining: credits.remaining,
      used: credits.used,
      superRemaining: credits.superRemaining,
      superUsed: credits.superUsed,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Deduct normal credits and persist to Firestore atomically.
 * TOCTOU fix: reads fresh balance inside transaction to prevent overdrafts.
 *
 * @param db - Firestore instance
 * @param userId - User ID
 * @param appId - Application ID
 * @param amount - Amount to deduct (must be a positive integer)
 * @returns Updated credits
 * @throws Error if insufficient credits or invalid amount
 */
export async function deductAndSaveCredits(
  db: Firestore,
  userId: string,
  appId: string,
  amount: number
): Promise<UserCredits> {
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
    throw new Error('Amount must be a positive integer');
  }

  const docRef = getCreditsDocRef(db, appId, userId);

  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(docRef);
    const freshCredits = readFreshCredits(snap);

    if (freshCredits.remaining < amount) {
      throw new Error('Insufficient credits');
    }

    const newCredits: UserCredits = {
      remaining: freshCredits.remaining - amount,
      used: freshCredits.used + amount,
      superRemaining: freshCredits.superRemaining,
      superUsed: freshCredits.superUsed,
    };

    transaction.set(docRef, {
      ...newCredits,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return newCredits;
  });
}

/**
 * Deduct super credits and persist to Firestore atomically.
 * TOCTOU fix: reads fresh balance inside transaction to prevent overdrafts.
 *
 * @param db - Firestore instance
 * @param userId - User ID
 * @param appId - Application ID
 * @param amount - Amount to deduct (must be a positive integer)
 * @returns Updated credits
 * @throws Error if insufficient super credits or invalid amount
 */
export async function deductAndSaveSuperCredits(
  db: Firestore,
  userId: string,
  appId: string,
  amount: number
): Promise<UserCredits> {
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
    throw new Error('Amount must be a positive integer');
  }

  const docRef = getCreditsDocRef(db, appId, userId);

  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(docRef);
    const freshCredits = readFreshCredits(snap);

    if (freshCredits.superRemaining < amount) {
      throw new Error('Insufficient super credits');
    }

    const newCredits: UserCredits = {
      remaining: freshCredits.remaining,
      used: freshCredits.used,
      superRemaining: freshCredits.superRemaining - amount,
      superUsed: freshCredits.superUsed + amount,
    };

    transaction.set(docRef, {
      ...newCredits,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return newCredits;
  });
}

/**
 * Add normal credits and persist to Firestore atomically.
 * TOCTOU fix: reads fresh balance inside transaction to prevent lost updates.
 *
 * @param db - Firestore instance
 * @param userId - User ID
 * @param appId - Application ID
 * @param amount - Amount to add (must be a positive integer)
 * @returns Updated credits
 * @throws Error if invalid amount
 */
export async function addAndSaveCredits(
  db: Firestore,
  userId: string,
  appId: string,
  amount: number
): Promise<UserCredits> {
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
    throw new Error('Amount must be a positive integer');
  }

  const docRef = getCreditsDocRef(db, appId, userId);

  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(docRef);
    const freshCredits = readFreshCredits(snap);

    const newCredits: UserCredits = {
      remaining: freshCredits.remaining + amount,
      used: freshCredits.used,
      superRemaining: freshCredits.superRemaining,
      superUsed: freshCredits.superUsed,
    };

    transaction.set(docRef, {
      ...newCredits,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return newCredits;
  });
}

/**
 * Add super credits and persist to Firestore atomically.
 * TOCTOU fix: reads fresh balance inside transaction to prevent lost updates.
 *
 * @param db - Firestore instance
 * @param userId - User ID
 * @param appId - Application ID
 * @param amount - Amount to add (must be a positive integer)
 * @returns Updated credits
 * @throws Error if invalid amount
 */
export async function addAndSaveSuperCredits(
  db: Firestore,
  userId: string,
  appId: string,
  amount: number
): Promise<UserCredits> {
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
    throw new Error('Amount must be a positive integer');
  }

  const docRef = getCreditsDocRef(db, appId, userId);

  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(docRef);
    const freshCredits = readFreshCredits(snap);

    const newCredits: UserCredits = {
      remaining: freshCredits.remaining,
      used: freshCredits.used,
      superRemaining: freshCredits.superRemaining + amount,
      superUsed: freshCredits.superUsed,
    };

    transaction.set(docRef, {
      ...newCredits,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return newCredits;
  });
}

/**
 * Format normal credits for display (max 3 digits, then K notation).
 * - Up to 999: show as-is (e.g., "42", "999")
 * - 1000+: show as K (e.g., "1K", "2K", "10K")
 *
 * @param credits - Number of credits
 * @returns Formatted string (e.g., "42", "999", "1K", "10K")
 */
export function formatCreditsDisplay(credits: number): string {
  if (credits >= 1000) {
    const k = Math.floor(credits / 1000);
    return `${k}K`;
  }
  return credits.toString();
}

/**
 * Format super credits for display — alias for {@link formatCreditsDisplay} (same rules).
 * @param credits - Number of super credits
 * @returns Formatted string (e.g., "42", "999", "1K", "10K")
 */
export const formatSuperCreditsDisplay = formatCreditsDisplay;
