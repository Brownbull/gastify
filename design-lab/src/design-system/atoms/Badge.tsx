import type { ReactNode } from "react";

/**
 * Badge — Playful Geometric grammar, "Flat pill" treatment (DM-3, spike C):
 * pill + 2px ink border, NO shadow, extrabold, filled accent per tone — cleaner
 * in dense rows. Semantic spending tones: positive = spending DOWN (good),
 * negative = UP (bad), per the legacy BoletApp color contract.
 */
export type BadgeTone = "positive" | "negative" | "neutral" | "warning" | "primary";

export interface BadgeProps {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}

const toneClasses: Record<BadgeTone, string> = {
  positive: "bg-gt-positive text-gt-ink",
  negative: "bg-gt-negative text-white",
  neutral: "bg-gt-bg-3 text-gt-ink",
  warning: "bg-gt-accent text-gt-ink",
  primary: "bg-gt-primary text-white",
};

export function Badge({ tone = "neutral", className = "", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-gt-4 rounded-gt-pill border-2 border-gt-line-strong px-gt-10 py-gt-2 text-gt-sm font-extrabold leading-none ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
