import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Button — Playful Geometric grammar (DM-1): ink border, hard offset shadow,
 * extrabold, bounce-press on hover (lift + deeper shadow), settle on active.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-gt-8 rounded-gt-xl border-2 border-gt-line-strong font-extrabold " +
  "transition duration-150 ease-gt-bounce shadow-gt-sm hover:-translate-y-0.5 hover:shadow-gt-md " +
  "active:translate-y-0 active:shadow-gt-xs focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/30 " +
  "disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-gt-primary text-white",
  secondary: "bg-gt-surface text-gt-ink",
  danger: "bg-gt-error text-white",
  ghost:
    "border-transparent bg-transparent text-gt-ink-2 shadow-none hover:translate-y-0 hover:bg-gt-bg-3 hover:text-gt-ink hover:shadow-none",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-gt-12 py-gt-6 text-gt-sm",
  md: "px-gt-16 py-gt-10 text-gt-md",
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${base} ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
