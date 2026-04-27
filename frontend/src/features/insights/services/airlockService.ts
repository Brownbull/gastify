/**
 * Airlock Service - CRUD operations and generation
 *
 * Story 14.33c.1: Airlock Generation & Persistence
 * @see docs/sprint-artifacts/epic14/stories/story-14.33c.1-airlock-generation-persistence.md
 *
 * AC4: AI Generation Service
 * - generateAirlock() function
 * - Mock generation until AI endpoint is ready
 * - Save to Firestore on success
 */

import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Firestore,
  Timestamp,
} from 'firebase/firestore';
import { batchDelete } from '@/lib/firestoreBatch';
import {
  AirlockRecord,
  AirlockGenerationResult,
  AirlockTransaction,
  MAX_AIRLOCK_HISTORY,
} from '@/types/airlock';
import { airlocksPath, assertValidSegment } from '@/lib/firestorePaths';
import { DEFAULT_CURRENCY } from '@/utils/currency';

// ============================================================================
// Mock Insights Data (AC4: Placeholder until AI ready)
// ============================================================================

/**
 * Mock airlock insights for generation.
 * These simulate AI-generated insights based on spending patterns.
 */
const MOCK_AIRLOCKS: AirlockGenerationResult[] = [
  {
    title: 'Tu café de la semana',
    message: 'Gastaste $45 en café esta semana, un 20% más que la semana pasada.',
    emoji: '☕',
    recommendation: 'Si reduces tu café diario a 3 veces por semana, ahorrarías $18/semana.',
    metadata: {
      transactionCount: 7,
      dateRange: { start: new Date(), end: new Date() },
      categories: ['Cafetería'],
      totalAmount: 45,
      currency: DEFAULT_CURRENCY,
    },
  },
  {
    title: 'Compras nocturnas',
    message: 'El 60% de tus compras fueron después de las 9pm.',
    emoji: '🌙',
    recommendation: 'Las compras nocturnas suelen ser más impulsivas. Considera hacer listas de compras.',
    metadata: {
      transactionCount: 12,
      dateRange: { start: new Date(), end: new Date() },
      categories: ['Supermercado', 'Delivery'],
      totalAmount: 89000,
      currency: DEFAULT_CURRENCY,
    },
  },
  {
    title: 'Fan del delivery',
    message: 'Ordenaste delivery 8 veces este mes. ¡Eso es más de 2 veces por semana!',
    emoji: '🛵',
    recommendation: 'Cocinar en casa 2 de esas veces te ahorraría aproximadamente $24,000/mes.',
    metadata: {
      transactionCount: 8,
      dateRange: { start: new Date(), end: new Date() },
      categories: ['Delivery', 'Restaurante'],
      totalAmount: 64000,
      currency: DEFAULT_CURRENCY,
    },
  },
  {
    title: 'Supermercado frecuente',
    message: 'Fuiste al super 12 veces este mes. ¿Muchas compras pequeñas?',
    emoji: '🛒',
    recommendation: 'Consolida tus compras semanales para ahorrar tiempo y evitar compras impulsivas.',
    metadata: {
      transactionCount: 12,
      dateRange: { start: new Date(), end: new Date() },
      categories: ['Supermercado'],
      totalAmount: 156000,
      currency: DEFAULT_CURRENCY,
    },
  },
  {
    title: 'Día caro de la semana',
    message: 'Los sábados gastas 40% más que otros días.',
    emoji: '📅',
    recommendation: 'Planifica actividades gratuitas los sábados para balancear.',
    metadata: {
      transactionCount: 20,
      dateRange: { start: new Date(), end: new Date() },
      categories: ['Entretenimiento', 'Restaurante'],
      totalAmount: 120000,
      currency: DEFAULT_CURRENCY,
    },
  },
  {
    title: 'Tienda favorita',
    message: 'Visitaste Jumbo 6 veces este mes. ¡Es tu lugar favorito!',
    emoji: '🏪',
    recommendation: 'Aprovecha sus promociones de fidelidad para maximizar descuentos.',
    metadata: {
      transactionCount: 6,
      dateRange: { start: new Date(), end: new Date() },
      categories: ['Supermercado'],
      totalAmount: 89000,
      currency: DEFAULT_CURRENCY,
    },
  },
  {
    title: 'Gastos hormiga',
    message: 'Tienes 15 compras menores a $5,000 este mes.',
    emoji: '🐜',
    recommendation: 'Estos pequeños gastos suman $45,000. ¿Valen la pena todos?',
    metadata: {
      transactionCount: 15,
      dateRange: { start: new Date(), end: new Date() },
      categories: ['Varios'],
      totalAmount: 45000,
      currency: DEFAULT_CURRENCY,
    },
  },
  {
    title: 'Fin de mes intenso',
    message: 'Gastaste 35% de tu presupuesto mensual en los últimos 5 días.',
    emoji: '🔥',
    recommendation: 'Intenta distribuir tus gastos más uniformemente durante el mes.',
    metadata: {
      transactionCount: 25,
      dateRange: { start: new Date(), end: new Date() },
      categories: ['Varios'],
      totalAmount: 200000,
      currency: DEFAULT_CURRENCY,
    },
  },
];

// Track which mock insights have been used this session (to avoid repetition)
let usedMockIndices: number[] = [];

/**
 * Reset mock state for testing isolation.
 * Per Atlas Section 5 testing patterns - export cache clear helpers.
 * @internal - Only for use in test files
 */
export function _resetMockState(): void {
  usedMockIndices = [];
}

/**
 * Get a random mock insight that hasn't been used recently.
 */
function getRandomMockInsight(): AirlockGenerationResult {
  // Reset if all have been used
  if (usedMockIndices.length >= MOCK_AIRLOCKS.length) {
    usedMockIndices = [];
  }

  // Find an unused index
  let index: number;
  do {
    index = Math.floor(Math.random() * MOCK_AIRLOCKS.length);
  } while (usedMockIndices.includes(index));

  usedMockIndices.push(index);
  return MOCK_AIRLOCKS[index];
}

// ============================================================================
// Firestore Path Helpers
// ============================================================================

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Generate a new airlock insight and save to Firestore.
 *
 * AC4: AI Generation Service
 * - Uses mock generation until AI endpoint is ready
 * - Saves to Firestore on success
 *
 * **MOCK IMPLEMENTATION NOTE (Story 14.33c.1):**
 * Currently returns random insights from a predefined list. The `transactions`
 * parameter is accepted but not used - future AI implementation will analyze
 * transaction patterns to generate personalized insights. Mock insights use
 * hardcoded Chilean-relevant scenarios (café, delivery, supermercado).
 *
 * @param db - Firestore instance
 * @param userId - User ID
 * @param appId - App ID
 * @param transactions - Recent transactions for context (future: used by AI)
 * @returns The created AirlockRecord
 */
export async function generateAirlock(
  db: Firestore,
  userId: string,
  appId: string,
  _transactions: AirlockTransaction[] = [] // Prefixed with _ since mock doesn't use it
): Promise<AirlockRecord> {
  // AC4: Use mock generation (placeholder until AI ready)
  const mockResult = getRandomMockInsight();

  // Update metadata with actual date range
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const airlockData = {
    userId,
    title: mockResult.title,
    message: mockResult.message,
    emoji: mockResult.emoji,
    recommendation: mockResult.recommendation,
    metadata: {
      ...mockResult.metadata,
      dateRange: {
        start: oneWeekAgo,
        end: now,
      },
    },
    createdAt: serverTimestamp(),
    viewedAt: null,
  };

  // Save to Firestore
  const collectionPath = airlocksPath(appId, userId);
  const docRef = await addDoc(collection(db, collectionPath), airlockData);

  // Return the complete record with generated ID
  return {
    id: docRef.id,
    userId,
    title: mockResult.title,
    message: mockResult.message,
    emoji: mockResult.emoji,
    recommendation: mockResult.recommendation,
    metadata: {
      ...mockResult.metadata,
      dateRange: {
        start: oneWeekAgo,
        end: now,
      },
    },
    createdAt: Timestamp.now(),
    viewedAt: null,
  };
}

/**
 * Get all airlocks for a user, sorted by most recent first.
 *
 * AC5: Airlock History List
 *
 * @param db - Firestore instance
 * @param userId - User ID
 * @param appId - App ID
 * @returns Array of AirlockRecord sorted by createdAt desc
 */
export async function getUserAirlocks(
  db: Firestore,
  userId: string,
  appId: string
): Promise<AirlockRecord[]> {
  const collectionPath = airlocksPath(appId, userId);
  const q = query(
    collection(db, collectionPath),
    orderBy('createdAt', 'desc'),
    limit(MAX_AIRLOCK_HISTORY)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as AirlockRecord[];
}

/**
 * Mark an airlock as viewed.
 *
 * AC6: Airlock Card Interaction
 * - Mark as viewed when AirlockSequence completes
 *
 * @param db - Firestore instance
 * @param userId - User ID
 * @param appId - App ID
 * @param airlockId - Airlock document ID
 */
export async function markAirlockViewed(
  db: Firestore,
  userId: string,
  appId: string,
  airlockId: string
): Promise<void> {
  assertValidSegment(airlockId, 'airlockId');
  const collectionPath = airlocksPath(appId, userId);
  const docRef = doc(db, collectionPath, airlockId);

  await updateDoc(docRef, {
    viewedAt: serverTimestamp(),
  });
}

/**
 * Check if user has enough super credits for airlock generation.
 *
 * AC3: Credit Integration
 * - Check user's super credit balance before generation
 *
 * @param currentCredits - User's current credit balance
 * @param cost - Cost of operation (default: 1)
 * @returns true if user has sufficient credits
 */
export function hasEnoughCredits(currentCredits: number, cost: number = 1): boolean {
  return currentCredits >= cost;
}

/**
 * Calculate new credit balance after deduction.
 *
 * AC3: Credit Integration
 * - Deduct 1 super credit on successful generation
 *
 * @param currentCredits - User's current credit balance
 * @param cost - Cost to deduct (default: 1)
 * @returns New credit balance
 */
export function deductCredits(currentCredits: number, cost: number = 1): number {
  return Math.max(0, currentCredits - cost);
}

// ============================================================================
// Delete Operations (Code Review Fix - Story 14.33d)
// ============================================================================

/**
 * Delete a single airlock from Firestore.
 *
 * @param db - Firestore instance
 * @param userId - User ID
 * @param appId - App ID
 * @param airlockId - Airlock document ID to delete
 */
export async function deleteAirlock(
  db: Firestore,
  userId: string,
  appId: string,
  airlockId: string
): Promise<void> {
  assertValidSegment(airlockId, 'airlockId');
  const collectionPath = airlocksPath(appId, userId);
  const docRef = doc(db, collectionPath, airlockId);
  await deleteDoc(docRef);
}

/**
 * Delete multiple airlocks from Firestore in a batch.
 *
 * @param db - Firestore instance
 * @param userId - User ID
 * @param appId - App ID
 * @param airlockIds - Array of airlock document IDs to delete
 */
export async function deleteAirlocks(
  db: Firestore,
  userId: string,
  appId: string,
  airlockIds: string[]
): Promise<void> {
  if (airlockIds.length === 0) return;

  airlockIds.forEach(id => assertValidSegment(id, 'airlockId'));
  const refs = airlockIds.map(id => doc(db, airlocksPath(appId, userId), id));
  await batchDelete(db, refs);
}
