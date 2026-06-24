/**
 * Small hex-color helpers for per-instance accent colors (group/member avatars).
 * The backend permits both #RGB and #RRGGBB (groups.py _HEX_COLOR), so anything
 * that manipulates a stored color must tolerate the short form.
 */

/** Expand #RGB → #RRGGBB; pass through #RRGGBB. */
export function expandHex(hex: string): string {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return `#${h}`;
}

function relativeLuminance(hex: string): number {
  const h = expandHex(hex).slice(1);
  const channel = (i: number) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

const INK = "#1E293B"; // --color-gt-ink
const INK_LUM = 0.0144;

/**
 * Pick ink or white text — whichever has the higher WCAG contrast on `bg`.
 * Keeps initials legible on light accents (amber/emerald) where white fails AA.
 */
export function readableTextColor(bg: string): string {
  const l = relativeLuminance(bg);
  const cInk = (Math.max(l, INK_LUM) + 0.05) / (Math.min(l, INK_LUM) + 0.05);
  const cWhite = 1.05 / (l + 0.05);
  return cInk >= cWhite ? INK : "#FFFFFF";
}
