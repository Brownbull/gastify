/**
 * Airlock Type Definitions
 *
 * Story 14.33c.1: Airlock Generation & Persistence
 * @see docs/sprint-artifacts/epic14/stories/story-14.33c.1-airlock-generation-persistence.md
 *
 * Airlocks are AI-generated spending insights that users can generate
 * using super credits. They are persisted to Firestore for later viewing.
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Firestore document: users/{userId}/airlocks/{airlockId}
 *
 * Represents a single AI-generated spending insight.
 */
export interface AirlockRecord {
  /** Unique identifier (Firestore document ID) */
  id: string;
  /** User who owns this airlock */
  userId: string;
  /** When the airlock was generated */
  createdAt: Timestamp;
  /** When the user viewed this airlock (null if unviewed) */
  viewedAt?: Timestamp | null;

  // Content fields
  /** Short title (e.g., "Tu café de la semana") */
  title: string;
  /** Detailed message with the insight */
  message: string;
  /** Emoji representing this insight */
  emoji: string;
  /** Optional actionable recommendation */
  recommendation?: string;

  /** Metadata for analytics and context */
  metadata?: AirlockMetadata;
}

/**
 * Metadata about the data used to generate the airlock.
 * Useful for analytics and understanding insight context.
 */
export interface AirlockMetadata {
  /** Number of transactions analyzed */
  transactionCount: number;
  /** Date range of analyzed transactions */
  dateRange: {
    start: Date | Timestamp;
    end: Date | Timestamp;
  };
  /** Categories involved in this insight */
  categories: string[];
  /** Total amount of transactions analyzed */
  totalAmount: number;
  /** Currency of the transactions */
  currency?: string;
}

/**
 * Input for generating a new airlock.
 * Contains transaction data for AI analysis.
 */
export interface AirlockGenerationInput {
  /** User ID for ownership */
  userId: string;
  /** Recent transactions to analyze */
  transactions: AirlockTransaction[];
}

/**
 * Simplified transaction data for airlock generation.
 * Only the fields needed for AI analysis.
 */
export interface AirlockTransaction {
  merchant: string;
  total: number;
  date: Date;
  category?: string;
  currency?: string;
  items?: Array<{
    name: string;
    totalPrice: number;
    category?: string;
  }>;
}

/**
 * Result of airlock generation (before Firestore persistence).
 */
export interface AirlockGenerationResult {
  title: string;
  message: string;
  emoji: string;
  recommendation?: string;
  metadata: AirlockMetadata;
}

/**
 * Firestore collection path for airlocks.
 * Pattern: users/{userId}/airlocks
 */
export const AIRLOCKS_COLLECTION = 'airlocks';

/**
 * Maximum number of airlocks to keep in history.
 * Older airlocks are not automatically deleted, but UI may limit display.
 */
export const MAX_AIRLOCK_HISTORY = 50;

/**
 * Super credit cost to generate one airlock.
 */
export const AIRLOCK_CREDIT_COST = 1;
