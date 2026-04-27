/**
 * Timestamp Conversion Utilities
 *
 * Story 15-2c: Unified TimestampLike → Date/millis
 *
 * Centralizes conversion between Firestore Timestamps, Date objects,
 * ISO strings, and millisecond numbers. Replaces 7+ duplicated
 * polymorphic timestamp handlers across the codebase.
 */

/**
 * Any value that can be interpreted as a timestamp.
 * Covers Firestore Timestamp (with toDate/seconds), objects with just toDate(),
 * serialized {seconds, nanoseconds}, Date, ISO string, and epoch millis.
 */
export type TimestampLike =
  | { toDate: () => Date }
  | { seconds: number; nanoseconds?: number }
  | Date
  | string
  | number;

/**
 * Type guard: is value a Firestore Timestamp-like object?
 * Matches both live Firestore Timestamp instances (with toDate method)
 * and serialized {seconds, nanoseconds} plain objects.
 */
export function isFirestoreTimestamp(
  value: unknown
): value is { seconds: number; nanoseconds?: number; toDate?: () => Date } {
  if (!value || typeof value !== 'object') return false;
  return typeof (value as Record<string, unknown>).seconds === 'number';
}

/**
 * Type guard: is value a valid (non-NaN) Date?
 */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Convert any TimestampLike value to milliseconds since epoch.
 * Returns 0 for null/undefined/invalid values.
 */
export function toMillis(value: TimestampLike | null | undefined): number {
  if (value == null) return 0;

  // Number — assume already millis
  if (typeof value === 'number') return value;

  // Date object
  if (value instanceof Date) return value.getTime() || 0;

  // Object with seconds (Firestore Timestamp or serialized)
  if (typeof value === 'object' && 'seconds' in value) {
    const ts = value as { seconds: number; nanoseconds?: number };
    return ts.seconds * 1000 + ((ts.nanoseconds || 0) / 1_000_000);
  }

  // Object with toDate method (Firestore Timestamp without seconds in type)
  if (typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
    try {
      const date = (value as { toDate: () => Date }).toDate();
      return date?.getTime() || 0;
    } catch {
      return 0;
    }
  }

  // String — parse as Date
  if (typeof value === 'string') {
    const ms = new Date(value).getTime();
    return isNaN(ms) ? 0 : ms;
  }

  return 0;
}

/**
 * Convert any TimestampLike value to a Date object.
 * Returns null for null/undefined/invalid values.
 */
export function toDateSafe(value: TimestampLike | null | undefined): Date | null {
  if (value == null) return null;

  // Date object — return as-is if valid
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  // Object with toDate method (live Firestore Timestamp)
  if (typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
    try {
      const date = (value as { toDate: () => Date }).toDate();
      return isValidDate(date) ? date : null;
    } catch {
      return null;
    }
  }

  // Object with seconds (serialized Firestore Timestamp)
  if (typeof value === 'object' && 'seconds' in value) {
    const ms = toMillis(value);
    return ms > 0 ? new Date(ms) : null;
  }

  // Number — assume millis
  if (typeof value === 'number') {
    return value > 0 ? new Date(value) : null;
  }

  // String — parse
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}
