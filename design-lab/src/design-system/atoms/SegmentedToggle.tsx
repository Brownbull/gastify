import type { ReactNode } from "react";

/**
 * SegmentedToggle — the shared 2..n segment selector (DM-9). One atom behind
 * every "pick one of a small set" control: Por Grupo/Original, transactions/
 * items count mode, L1–L4 level switch, showcase state tabs.
 *
 * Playful Geometric grammar: ink-bordered pill (or square) track; the active
 * segment fills with the chosen tone. Segments can carry an icon, a label, or
 * both. `fill` controls whether the track stretches full width.
 */
export type SegmentTone = "amber" | "primary" | "ink";
export type SegmentSize = "sm" | "md" | "tall";
export type SegmentShape = "pill" | "square";

export interface ToggleSegment<T extends string = string> {
  id: T;
  label?: string;
  icon?: ReactNode;
  /** accessible name when the segment is icon-only. */
  title?: string;
}

export interface SegmentedToggleProps<T extends string = string> {
  segments: ToggleSegment<T>[];
  value: T;
  onChange: (id: T) => void;
  tone?: SegmentTone;
  size?: SegmentSize;
  shape?: SegmentShape;
  /** stretch the track + segments to full width (equal flex). */
  fill?: boolean;
  /** greys the whole control + blocks interaction (coming-soon placeholders, D101). */
  disabled?: boolean;
  /**
   * fill style: the same rounded active pill, but it expands to fill the track
   * to its border — drops the inset padding that leaves white around the pill.
   * No dividers, no square edges; just the pill covering its cell. Use for
   * primary tab/period toggles where the selected fill should reach the border.
   */
  flush?: boolean;
  /** aria-label for the group (tablist). */
  label?: string;
  className?: string;
}

const activeTone: Record<SegmentTone, string> = {
  amber: "bg-gt-accent text-gt-ink shadow-gt-xs",
  primary: "bg-gt-primary text-white shadow-gt-xs",
  ink: "bg-gt-ink text-white shadow-gt-xs",
};

const sizeClasses: Record<SegmentSize, { seg: string; gap: string; pad: string }> = {
  sm: { seg: "px-gt-10 py-gt-4 text-gt-xs", gap: "gap-gt-4", pad: "p-gt-2" },
  md: { seg: "px-gt-14 py-gt-8 text-gt-md", gap: "gap-gt-6", pad: "p-gt-4" },
  // taller + narrower — more vertical pad, tighter horizontal (e.g. scan review tabs)
  tall: { seg: "px-gt-8 py-gt-12 text-gt-sm", gap: "gap-gt-4", pad: "p-gt-2" },
};

export function SegmentedToggle<T extends string = string>({
  segments,
  value,
  onChange,
  tone = "amber",
  size = "md",
  shape = "pill",
  fill = false,
  flush = false,
  disabled = false,
  label,
  className = "",
}: SegmentedToggleProps<T>) {
  const s = sizeClasses[size];
  const trackRadius = shape === "pill" ? "rounded-gt-pill" : "rounded-gt-xl";
  const segRadius = shape === "pill" ? "rounded-gt-pill" : "rounded-gt-lg";
  // flush: drop the inset padding so the rounded active pill fills the track to
  // its border (concentric with the track's own rounded border — no white gap).
  const trackExtra = flush ? "" : s.pad;
  return (
    <div
      role="tablist"
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={`inline-flex ${fill ? "w-full" : ""} items-stretch border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm ${trackRadius} ${trackExtra} ${disabled ? "opacity-55" : ""} ${className}`}
    >
      {segments.map((seg) => {
        const isActive = seg.id === value;
        return (
          <button
            key={seg.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={disabled}
            title={seg.title ?? seg.label}
            onClick={() => onChange(seg.id)}
            className={`inline-flex items-center justify-center font-gt-display font-extrabold leading-none transition duration-150 ease-gt-bounce focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25 disabled:cursor-default ${s.seg} ${s.gap} ${segRadius} ${
              fill ? "flex-1" : ""
            } ${isActive ? activeTone[tone] : "text-gt-ink-2"} ${!disabled && !isActive ? "hover:bg-gt-bg-3 hover:text-gt-ink" : ""}`}
          >
            {seg.icon}
            {seg.label ? <span className="truncate">{seg.label}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
