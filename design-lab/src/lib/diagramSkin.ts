/**
 * Diagram skin (DM-13d / DM-20) — the Token-True palette + softness shared by
 * EVERY analytics diagram (treemap · donut · sankey · trend · reports), so the
 * whole surface reads as one system. Factored out of organisms/Treemap.tsx
 * (which now re-exports these for back-compat).
 *
 * Per DM-11/DM-13b the palette is FIXED; diagram spikes vary density/layout,
 * not color. Change `DIAGRAM_TINT` to re-tune softness everywhere at once.
 */

/** Token-True chart hues (gt-chart-1..6) as raw hex, for tint math. */
export const GT_CHART_HEX = ["#8B5CF6", "#FBBF24", "#F472B6", "#34D399", "#3B82F6", "#64748B"];

/**
 * The ONE neutral grey for the "Otros"/"Más" aggregate bucket across every
 * diagram (donut · sankey · treemap · trend · reports). A raw hex (charting
 * libs/SVG attrs can't take Tailwind classes); = Tailwind gray-400. Single
 * source so the aggregate reads the same everywhere.
 */
export const OTROS_GREY = "#9CA3AF";

/** #rrggbb → rgba(...) at the given alpha. */
export function hexA(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Full-saturation Token-True fill (vivid) — the spike's compare-only knob. */
export const tokenTrueColor = (_id: string, i: number) => GT_CHART_HEX[i % GT_CHART_HEX.length];

/**
 * The diagram-wide Token-True palette softness (user-locked 50%). Single source
 * of truth for every diagram's fill alpha.
 */
export const DIAGRAM_TINT = 0.5;

/** Build a Token-True palette fn at a given tint alpha (0–1). Default DIAGRAM_TINT. */
export const tokenTrueTint = (alpha: number) => (_id: string, i: number) => hexA(GT_CHART_HEX[i % GT_CHART_HEX.length], alpha);

/** Softened Token-True fill at the locked diagram tint. The DEFAULT diagram palette. */
export const tokenTrueSoftColor = tokenTrueTint(DIAGRAM_TINT);

/** A diagram color-resolver: `(categoryId, index) => css color`. */
export type DiagramColorFor = (id: string, index: number) => string;
