/**
 * Payment-method presentation config (DM-8). gastify stores NO card data — a card
 * alias is a user label + a chosen fin-* pixel icon + an accent color (+ whether
 * it's the default method). Ported from design-lab/src/lib/paymentMethods.ts.
 *
 * `color` is a swatch hue (data, inline-styled — the documented exception, like
 * category colors), NOT a gt-* token. `icon` is a pixel-icon name.
 */

/** Finance pixel icons a user can pick for a card. All exist in public/pixel-icons. */
export const CARD_ICON_CHOICES = [
  "card-green",
  "card-blue",
  "card-red",
  "fin-card-chip",
  "fin-card-contactless",
  "fin-credit-card",
  "fin-wallet",
  "fin-coin",
  "fin-piggy-bank",
  "fin-budget",
  "fin-receipt",
  "fin-income-up",
  "fin-expense-down",
  "store-bank",
  "wallet-green",
  "peso-coin",
  "piggy-coins-stack",
] as const;

/** Swatch hues offered in the editor. */
export const CARD_COLOR_CHOICES = [
  "#16a34a", // green
  "#ea580c", // orange
  "#dc2626", // red
  "#2563eb", // blue
  "#7c3aed", // violet
  "#0891b2", // cyan
  "#db2777", // pink
  "#57534e", // stone
] as const;

/** Max card aliases a user may define. */
export const MAX_CARDS = 10;

export const DEFAULT_CARD_ICON = CARD_ICON_CHOICES[0]; // card-green
export const DEFAULT_CARD_COLOR = CARD_COLOR_CHOICES[0]; // #16a34a

/** "#16a34a" -> "rgba(22, 163, 74, 0.15)"; returns input on a non-6-digit hex. */
export function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return hex;
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Soft (~15%) tint of the card color for the icon tile / preview chip background. */
export function softBgFor(color: string | null | undefined): string {
  return hexToRgba(color || DEFAULT_CARD_COLOR, 0.15);
}
