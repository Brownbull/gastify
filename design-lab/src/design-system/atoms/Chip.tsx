import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Filter chip — Playful Geometric grammar, "Amber" active treatment (DM-3,
 * spike B): active fills amber + ink text (matches the Gustify filled-active
 * nav tile); pending pulses amber; default is surface + ink border. Carries the
 * legacy 3-state filter convention (docs/mockups AUDIT.md §8: original /
 * pending / active, commit-on-label).
 *
 * NOTE (DM-4): this is the GENERIC filter chip (date / location / generic
 * labels — standard surface/amber styling). TAXONOMY category chips (L1–L4
 * rubro/giro/familia/categoría) get a per-category color + pixel icon from a
 * config file — that's a separate `CategoryChip` molecule, not this atom.
 */
export type ChipState = "default" | "pending" | "active";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  state?: ChipState;
  children: ReactNode;
}

// Selection = depth (DM-16): UNSELECTED recedes (soft border, no shadow);
// SELECTED/active pops (ink border + hard shadow). The border lives in the
// state class so the rule reads explicitly.
const base =
  "inline-flex items-center gap-gt-6 rounded-gt-pill border-2 px-gt-14 py-gt-4 text-gt-sm font-extrabold " +
  "transition duration-150 ease-gt-bounce focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25";

const stateClasses: Record<ChipState, string> = {
  default: "border-gt-line bg-gt-surface text-gt-ink-2 hover:-translate-y-0.5 hover:border-gt-line-strong hover:text-gt-ink hover:shadow-gt-xs",
  pending: "animate-pulse border-gt-line-strong bg-gt-accent/60 text-gt-ink shadow-gt-xs",
  active: "border-gt-line-strong bg-gt-accent text-gt-ink shadow-gt-sm",
};

export function Chip({ state = "default", className = "", children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={state === "active" ? true : state === "default" ? false : undefined}
      aria-busy={state === "pending" ? true : undefined}
      className={`${base} ${stateClasses[state]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
