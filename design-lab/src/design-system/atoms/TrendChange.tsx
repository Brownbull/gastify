/**
 * TrendChange (DM-13) — a signed % delta with a direction glyph. Spending
 * semantics (legacy BoletApp contract): up = MORE spend = negative (bad),
 * down = LESS = positive (good), neutral = "=". The color pair is passed via
 * the `tone` map so the chart-skin spike can vary it.
 */
export type TrendDirection = "up" | "down" | "neutral" | "new";

export interface TrendChangeProps {
  direction: TrendDirection;
  /** signed percent (e.g. -12). Ignored for "new". */
  percent?: number;
  /** pill background, or bare text when false. */
  pill?: boolean;
  /**
   * On a gradient/colored card the bordered semantic pill clashes — `onGradient`
   * swaps it to a translucent white pill (legacy story-card parity). Implies pill.
   */
  onGradient?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const glyph: Record<TrendDirection, string> = { up: "▲", down: "▼", neutral: "=", new: "✦" };

/**
 * Direction → raw CSS color (the same spending semantics as the pill, in a form
 * that goes on an SVG/`color=` attribute, e.g. `<Sparkline color=…>`). Single
 * source so trend rows + report group cards don't re-define the up/down map.
 * up = more spend = bad = red; down = less = good = green; neutral/new = grey.
 */
export const DIRECTION_COLOR: Record<TrendDirection, string> = {
  up: "var(--negative-primary)",
  down: "var(--positive-primary)",
  neutral: "var(--text-tertiary)",
  new: "var(--text-tertiary)",
};

// Semantic colors (gt tokens): up=negative(red), down=positive(green),
// neutral/new=ink-3. The skin spike may override these mappings.
const toneText: Record<TrendDirection, string> = {
  up: "text-gt-negative",
  down: "text-gt-positive",
  neutral: "text-gt-ink-3",
  new: "text-gt-primary",
};
const tonePill: Record<TrendDirection, string> = {
  up: "bg-gt-negative-bg text-gt-negative",
  down: "bg-gt-positive-bg text-gt-positive",
  neutral: "bg-gt-bg-3 text-gt-ink-3",
  new: "bg-gt-primary-soft text-gt-primary",
};

export function TrendChange({ direction, percent, pill = false, onGradient = false, size = "sm", className = "" }: TrendChangeProps) {
  const label = direction === "new" ? "nuevo" : `${percent != null && percent > 0 ? "+" : ""}${percent ?? 0}%`;
  const sz = size === "sm" ? "text-gt-xs" : "text-gt-sm";
  if (onGradient) {
    return (
      <span className={`inline-flex items-center gap-gt-4 rounded-gt-pill bg-white/20 px-gt-8 py-gt-2 font-extrabold leading-none text-white ${sz} ${className}`}>
        <span aria-hidden="true">{glyph[direction]}</span>
        {label}
      </span>
    );
  }
  if (pill) {
    return (
      <span className={`inline-flex items-center gap-gt-4 rounded-gt-pill border-2 border-gt-line-strong px-gt-8 py-gt-2 font-extrabold leading-none ${sz} ${tonePill[direction]} ${className}`}>
        <span aria-hidden="true">{glyph[direction]}</span>
        {label}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-gt-2 font-extrabold leading-none ${sz} ${toneText[direction]} ${className}`}>
      <span aria-hidden="true">{glyph[direction]}</span>
      {label}
    </span>
  );
}
