/**
 * Card icon catalog (DM-43) — generic pixel-art card glyphs for the credit/debit
 * cards common in Chile, used by the PaymentPicker / statement card selector.
 *
 * IMPORTANT — no trademarked logos. Each card is a GENERIC pixel-art card
 * differentiated ONLY by the issuer's brand COLOR (plus the card name as a text
 * label). We deliberately do NOT reproduce bank/network logos or wordmarks, even
 * stylized — that would reproduce protected brand marks. Color + label is the
 * whole differentiation.
 *
 * ── Generation recipe (PixelLab pixflux) ────────────────────────────────
 * To add a new color card, generate at 32×32 with:
 *   description: "A plain <COLOR> credit card icon, front view, solid <COLOR>
 *     body with a small gold chip, no text no logo no symbols, clean flat pixel
 *     art UI icon, dark outline"
 *   negative_description: "text, letters, logo, brand, wordmark, words, numbers,
 *     symbols, blurry, 3d, realistic"
 *   outline: "single color black outline" · shading: "flat shading"
 *   detail: "low detail" · no_background: true · text_guidance_scale: 13
 *   save_to_file: design-lab/public/pixel-icons/card-<color>.png
 * Then add a row below mapping an issuer to that icon + its brand-color hex.
 */

export interface CardIcon {
  /** issuer / network key. */
  id: string;
  /** display name (label only — never a reproduced logo). */
  label: string;
  /** pixel-icon name under /pixel-icons/. */
  icon: string;
  /** issuer brand color (hex) — accent, applied inline. */
  color: string;
  /** "bank" issuer, "retail" store card, or "network" scheme. */
  kind: "bank" | "retail" | "network";
}

/** The Chilean card set — banks, retail cards, and networks. */
export const CARD_ICONS: CardIcon[] = [
  // ── Banks ──
  { id: "banco-chile", label: "Banco de Chile", icon: "card-navy", color: "#0a2540", kind: "bank" },
  { id: "bancoestado", label: "BancoEstado", icon: "card-orange", color: "#ea580c", kind: "bank" },
  { id: "bci", label: "BCI", icon: "card-blue", color: "#1d4ed8", kind: "bank" },
  { id: "santander", label: "Santander", icon: "card-red", color: "#dc2626", kind: "bank" },
  { id: "scotiabank", label: "Scotiabank", icon: "card-crimson", color: "#b91c1c", kind: "bank" },
  { id: "itau", label: "Itaú", icon: "card-amber", color: "#f59e0b", kind: "bank" },
  { id: "security", label: "Banco Security", icon: "card-slate", color: "#475569", kind: "bank" },
  { id: "bice", label: "Banco BICE", icon: "card-teal", color: "#0f766e", kind: "bank" },
  // ── Retail / store cards ──
  { id: "falabella", label: "CMR Falabella", icon: "card-green", color: "#16a34a", kind: "retail" },
  { id: "ripley", label: "Ripley", icon: "card-violet", color: "#7c3aed", kind: "retail" },
  { id: "lider", label: "Líder / BancoFalabella", icon: "card-blue", color: "#1d4ed8", kind: "retail" },
  // ── Networks ──
  { id: "visa", label: "Visa", icon: "card-navy", color: "#1a1f71", kind: "network" },
  { id: "mastercard", label: "Mastercard", icon: "card-orange", color: "#eb5b25", kind: "network" },
  { id: "amex", label: "American Express", icon: "card-teal", color: "#0ea5e9", kind: "network" },
  { id: "redcompra", label: "Redcompra (débito)", icon: "card-teal", color: "#0d9488", kind: "network" },
];

/** All distinct color glyphs available (for the assets-page swatch grid). */
export const CARD_COLOR_GLYPHS = [
  "card-green", "card-blue", "card-red", "card-navy", "card-orange",
  "card-violet", "card-teal", "card-amber", "card-crimson", "card-slate",
];
