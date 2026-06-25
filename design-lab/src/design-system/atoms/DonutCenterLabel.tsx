import type { ReactNode } from "react";

/**
 * DonutCenterLabel (DM-20) — the two-line center overlay for a donut. Absolutely
 * positioned, pointer-events-none (so the ring underneath stays tappable), and
 * OUTSIDE the rotated SVG so the text renders upright. Reactive: shows the total
 * by default, the selected segment's value + label when a wedge is selected.
 */
export interface DonutCenterLabelProps {
  /** big amount (e.g. "$182k"). */
  primary: ReactNode;
  /** sub-label (e.g. "Total" or the category name). */
  label: ReactNode;
  /** optional third line (e.g. the selected segment's %). */
  hint?: ReactNode;
  className?: string;
}

export function DonutCenterLabel({ primary, label, hint, className = "" }: DonutCenterLabelProps) {
  return (
    <div className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center ${className}`}>
      <span className="font-gt-display text-gt-xl font-extrabold leading-none text-gt-ink">{primary}</span>
      <span className="mt-gt-2 max-w-[70%] truncate text-gt-sm font-medium leading-tight text-gt-ink-3">{label}</span>
      {hint ? <span className="text-gt-xs font-extrabold leading-tight text-gt-ink-2">{hint}</span> : null}
    </div>
  );
}
