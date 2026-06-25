import type { ReactNode } from "react";
import { IconTile } from "@design-system/atoms/IconTile";

/**
 * EmptyState (DM-16) — geometric placeholder for empty lists / first-run
 * surfaces. Dashed ink border, a framed HERO IconTile (64px), extrabold title,
 * medium-muted body, and an actions row that stacks on narrow screens and goes
 * side-by-side on wider ones.
 *
 * `iconName` renders the hero IconTile; pass `icon` for a custom node (mascot).
 * `actions` is the action row (one or more Buttons).
 */
export interface EmptyStateProps {
  /** pixel-icon name → framed hero tile. */
  iconName?: string;
  /** custom hero node (overrides iconName). */
  icon?: ReactNode;
  title: string;
  message?: string;
  /** action button(s). */
  actions?: ReactNode;
  className?: string;
}

export function EmptyState({ iconName, icon, title, message, actions, className = "" }: EmptyStateProps) {
  const hero = icon ?? (iconName ? <IconTile icon={iconName} size="hero" /> : null);
  return (
    <div
      className={`flex flex-col items-center gap-gt-10 rounded-gt-3xl border-2 border-dashed border-gt-line-strong bg-gt-surface px-gt-24 py-gt-32 text-center ${className}`}
    >
      {hero ? <div>{hero}</div> : null}
      <h3 className="font-gt-display text-gt-2xl font-extrabold text-gt-ink">{title}</h3>
      {message ? <p className="max-w-xs text-gt-md font-medium text-gt-ink-2">{message}</p> : null}
      {actions ? <div className="mt-gt-4 flex flex-col gap-gt-10 sm:flex-row">{actions}</div> : null}
    </div>
  );
}
