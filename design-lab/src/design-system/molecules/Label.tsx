import type { ReactNode } from "react";

/**
 * Label — STANDARD metadata label for non-category attributes (date, location,
 * count, etc.) (DM-4). Unlike CategoryChip, it does NOT vary color by value: it
 * uses one standard geometric surface (surface fill + ink border) with an icon.
 * Pass a PixelIcon for meaningful glyphs (location pin, calendar) or a stroke
 * icon for utility ones. Use this for date/location; use CategoryChip for L1–L4
 * taxonomy categories.
 */
export type LabelTone = "standard" | "muted";

export interface LabelProps {
  icon?: ReactNode;
  tone?: LabelTone;
  className?: string;
  children: ReactNode;
}

const toneClasses: Record<LabelTone, string> = {
  standard: "bg-gt-surface text-gt-ink",
  muted: "bg-gt-bg-3 text-gt-ink-2",
};

export function Label({ icon, tone = "standard", className = "", children }: LabelProps) {
  return (
    <span
      className={`inline-flex items-center gap-gt-6 rounded-gt-pill border-2 border-gt-line-strong px-gt-12 py-gt-4 text-gt-sm font-extrabold leading-none ${toneClasses[tone]} ${className}`}
    >
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}
