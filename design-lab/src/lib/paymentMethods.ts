/**
 * Payment-method config (DM-8) — the relational payment indicator. gastify
 * stores NO card data: a payment method is a user-defined label + a chosen
 * `fin-*` pixel icon + an accent color. There is always exactly one cash method
 * ("Efectivo", fixed coin icon) and 0–10 user-defined cards.
 *
 * `color` is a swatch hue (data, inline-styled — same documented exception as
 * category colors), NOT a gt-* token. `icon` is a pixel-icon name from the
 * CARD_ICON_CHOICES set.
 */

export type PaymentKind = "cash" | "card";

export interface PaymentMethod {
  id: string;
  kind: PaymentKind;
  /** user nickname — e.g. "Efectivo", "Falabella", "Débito BCI". */
  label: string;
  /** swatch hue for cards (data, inline-styled). Cash ignores this. */
  color?: string;
  /** chosen fin-* pixel icon for cards. Cash uses the fixed coin. */
  icon?: string;
}

/** The single cash method — always present, fixed. */
export const CASH: PaymentMethod = { id: "cash", kind: "cash", label: "Efectivo", icon: "fin-coin" };

/** Finance pixel icons a user can pick for a card in the add-card form. */
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

/** Swatch hues offered in the add-card form. */
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

/** Sample user cards (mock). Up to 10 allowed; here a default + one more. */
export const SAMPLE_CARDS: PaymentMethod[] = [
  { id: "falabella", kind: "card", label: "CMR Falabella", color: "#16a34a", icon: "card-green" },
  { id: "bci-debito", kind: "card", label: "Débito BCI", color: "#1d4ed8", icon: "card-blue" },
  { id: "santander", kind: "card", label: "Mastercard Santander", color: "#dc2626", icon: "card-red" },
];

/** Max cards a user may define. */
export const MAX_CARDS = 10;

/** All sample methods: cash first, then cards. */
export const SAMPLE_METHODS: PaymentMethod[] = [CASH, ...SAMPLE_CARDS];

export function getPaymentMethod(id: string, methods: PaymentMethod[] = SAMPLE_METHODS): PaymentMethod {
  return methods.find((m) => m.id === id) ?? CASH;
}

/**
 * The chip/row background for a method: the card's saturated color softened to
 * a low-opacity tint (~15%), or white for cash. Returns a CSS color string for
 * inline `backgroundColor`. One color is STORED per card; it's softened here at
 * render so the swatch in the add-card form stays vivid while the chip reads
 * soft (matching the category-tint feel).
 */
const SOFT_ALPHA = 0.15;

export function softBgFor(method: PaymentMethod): string {
  if (method.kind === "cash" || !method.color) return "var(--surface)"; // white for cash
  return hexToRgba(method.color, SOFT_ALPHA);
}

/** #rrggbb → rgba(r,g,b,alpha). Falls back to the input if not a 6-digit hex. */
export function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
