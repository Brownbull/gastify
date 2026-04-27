/**
 * Quantity display and input utilities for transaction items.
 *
 * Centralizes qty formatting, validation, and input sanitization
 * used across editor views and display components.
 *
 * Story TD-18-14: Decimal quantity support (weight-based items)
 */

/**
 * Format quantity for display. Returns string with up to 3 significant
 * decimal places, trailing zeros trimmed.
 *
 * Examples: undefined→"1", 1→"1", 2→"2", 0.633→"0.633", 1.5→"1.5", 2.250→"2.25"
 */
export function formatQty(qty: number | undefined): string {
  if (qty === undefined || !isFinite(qty) || qty < 0) return '1';
  if (Number.isInteger(qty)) return String(qty);
  // Up to 3 decimal places, trim trailing zeros
  return parseFloat(qty.toFixed(3)).toString();
}

/**
 * Whether to show the qty badge in display mode.
 * Shows when qty differs from the default of 1 (including fractional < 1).
 *
 * Replaces the broken `(item.qty ?? 1) > 1` pattern that hid quantities like 0.633.
 */
export function shouldShowQty(qty: number | undefined): boolean {
  return qty !== undefined && qty !== 0 && qty !== 1;
}

/**
 * Sanitize qty input during typing (onChange).
 * Allows digits and one decimal point, limits to 3 decimal places.
 * Returns cleaned string suitable for setting as input value.
 */
export function sanitizeQtyInput(rawValue: string): string {
  // Strip everything except digits and dot
  let cleaned = rawValue.replace(/[^0-9.]/g, '');

  // Allow only one decimal point
  const dotIndex = cleaned.indexOf('.');
  if (dotIndex !== -1) {
    cleaned = cleaned.slice(0, dotIndex + 1) + cleaned.slice(dotIndex + 1).replace(/\./g, '');
  }

  // Limit to 3 decimal places while typing
  if (dotIndex !== -1 && cleaned.length - dotIndex - 1 > 3) {
    cleaned = cleaned.slice(0, dotIndex + 4);
  }

  return cleaned;
}

/**
 * Parse and clamp qty on blur. Returns a valid number clamped to
 * [0.001, 99999] with max 3 decimal places. Falls back to 1 on invalid input.
 */
export function clampQtyOnBlur(rawValue: string): number {
  const parsed = parseFloat(rawValue);
  if (isNaN(parsed) || parsed <= 0) return 1;
  const clamped = Math.min(parsed, 99999);
  // Round to max 3 decimal places, enforce minimum after rounding
  const rounded = Math.round(clamped * 1000) / 1000;
  return rounded < 0.001 ? 1 : rounded;
}
