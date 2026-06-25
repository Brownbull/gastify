import type { ReactNode } from "react";
import { IconTile } from "./IconTile";

/**
 * EmptyState — geometric placeholder for empty lists (ported from design-lab in
 * W3): dashed ink border, a framed HERO IconTile, extrabold title, muted body,
 * optional actions row.
 */
export interface EmptyStateProps {
  iconName?: string;
  icon?: ReactNode;
  title: string;
  message?: string;
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
