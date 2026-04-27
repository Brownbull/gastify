/**
 * Statistics utility functions
 *
 * Story 14.40: Category Statistics Popup
 *
 * Provides calculation functions for transaction and item statistics:
 * - Min, max, average, median calculations
 * - Merchant frequency analysis
 * - Period-over-period comparison
 *
 * @see docs/sprint-artifacts/epic14/stories/story-14.40-category-statistics-popup.md
 */

import { numericAsc } from '@/utils/comparators';

/**
 * Calculate the median of an array of numbers.
 * Returns 0 for empty arrays.
 *
 * @param values - Array of numbers
 * @returns The median value
 */
export const calculateMedian = (values: number[]): number => {
  if (values.length === 0) return 0;

  const sorted = [...values].sort(numericAsc);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    // Even number of elements: average of two middle values
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  // Odd number of elements: return middle value
  return sorted[mid];
};

/**
 * Calculate basic statistics for an array of numbers.
 *
 * @param values - Array of numbers
 * @returns Object with count, sum, min, max, avg, median
 */
export const calculateBasicStats = (
  values: number[]
): {
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  median: number;
} => {
  if (values.length === 0) {
    return {
      count: 0,
      sum: 0,
      min: 0,
      max: 0,
      avg: 0,
      median: 0,
    };
  }

  const sum = values.reduce((acc, val) => acc + val, 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = sum / values.length;
  const median = calculateMedian(values);

  return {
    count: values.length,
    sum,
    min,
    max,
    avg,
    median,
  };
};

/**
 * Find the most frequent value in an array.
 * Returns null for empty arrays.
 *
 * @param values - Array of strings
 * @returns Tuple of [value, count] or null
 */
export const findMostFrequent = (
  values: string[]
): [string, number] | null => {
  if (values.length === 0) return null;

  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  let maxCount = 0;
  let mostFrequent = '';

  for (const [value, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      mostFrequent = value;
    }
  }

  return [mostFrequent, maxCount];
};
