import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * IconButton — "Circle" treatment (DM-3, spike C): a round geometric tile that
 * holds an icon. Used for action options inside app content (size `lg`, bigger
 * icon) and the scan FAB. Per the icon convention (DM-1): the icon child is
 * normally a PixelIcon (meaningful glyph); utility actions (close/back/submit/
 * cancel) may pass a stroke icon. `label` is required for accessibility.
 *
 * NOTE: bottom-nav destinations do NOT use IconButton — navigation is the
 * Gustify 4-tab BottomNav, with scan moved to a floating FAB (DM-5).
 */
export type IconButtonVariant = "default" | "primary" | "accent" | "soft";
export type IconButtonSize = "md" | "lg" | "fab";

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  active?: boolean;
  children: ReactNode;
}

const base =
  "grid shrink-0 place-items-center rounded-gt-pill transition duration-150 ease-gt-bounce " +
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/30 disabled:pointer-events-none disabled:opacity-50";

const sizeClasses: Record<IconButtonSize, string> = {
  md: "h-10 w-10", // toolbar / header actions
  lg: "h-12 w-12", // content action options (bigger icon)
  fab: "h-14 w-14", // floating scan FAB
};

const variantClasses: Record<IconButtonVariant, string> = {
  default:
    "border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm hover:-translate-y-0.5 hover:shadow-gt-md active:translate-y-0 active:shadow-gt-xs",
  primary:
    "border-2 border-gt-line-strong bg-gt-primary text-white shadow-gt-sm hover:-translate-y-0.5 hover:shadow-gt-md active:translate-y-0 active:shadow-gt-xs",
  accent:
    "border-2 border-gt-line-strong bg-gt-accent shadow-gt-sm hover:-translate-y-0.5 hover:shadow-gt-md active:translate-y-0 active:shadow-gt-xs",
  soft: "border-2 border-transparent bg-gt-bg-3 hover:border-gt-line-strong",
};

export function IconButton({
  label,
  variant = "default",
  size = "md",
  active = false,
  className = "",
  type = "button",
  children,
  ...rest
}: IconButtonProps) {
  const resolved = active ? "primary" : variant;
  return (
    <button
      type={type}
      aria-label={label}
      aria-pressed={active || undefined}
      title={label}
      className={`${base} ${sizeClasses[size]} ${variantClasses[resolved]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
