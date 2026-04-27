/**
 * Credit Formatting Utilities
 *
 * Story 15b-3d: Extracted from userCreditsService.ts.
 * Pure number → string formatters with no Firestore dependency.
 */

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
