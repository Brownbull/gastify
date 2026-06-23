import type { ReactNode } from "react";

/**
 * MetaPill — outlined metadata tag (date / time / currency / location). Read-
 * only display pill in the Playful Geometric grammar: ink border, surface fill,
 * extrabold. The legacy outlined date/time/currency tags map to this atom.
 *
 * For TAXONOMY categories use CategoryChip; for payment use PaymentChip; for
 * an interactive filter use Chip. This is the neutral metadata tag.
 */
export type MetaPillSize = "sm" | "md";

export interface MetaPillProps {
  icon?: ReactNode;
  size?: MetaPillSize;
  /** render as a button (tappable to edit) instead of a static span. */
  onClick?: () => void;
  /** accessible name for the tappable variant (visible text is the value). */
  ariaLabel?: string;
  className?: string;
  children: ReactNode;
}

const sizeClasses: Record<MetaPillSize, string> = {
  sm: "gap-gt-6 px-gt-10 py-gt-4 text-gt-sm",
  md: "gap-gt-8 px-gt-12 py-gt-6 text-gt-md",
};

export function MetaPill({ icon, size = "sm", onClick, ariaLabel, className = "", children }: MetaPillProps) {
  const base = `inline-flex items-center rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface font-extrabold leading-none text-gt-ink ${sizeClasses[size]} ${className}`;
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={`${base} transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:shadow-gt-xs focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25`}
      >
        {icon}
        <span className="truncate">{children}</span>
      </button>
    );
  }
  return (
    <span className={base}>
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}
