import { type InputHTMLAttributes, type ReactNode } from "react";

export interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** trailing slot inside the field (e.g. a show/hide password toggle). */
  trailing?: ReactNode;
}

/**
 * AuthField — a labeled, geometric bordered text field for the auth forms
 * (2px ink border, primary focus ring). Spreads native input attrs (type,
 * placeholder, autoComplete…) onto the input.
 */
export function AuthField({ label, trailing, id, className = "", ...rest }: AuthFieldProps) {
  const fieldId = id ?? `auth-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <label htmlFor={fieldId} className="flex flex-col gap-gt-4">
      <span className="font-gt-display text-gt-sm font-extrabold text-gt-ink">{label}</span>
      <span className="flex items-center gap-gt-8 rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface px-gt-12 shadow-gt-xs transition focus-within:border-gt-primary focus-within:ring-4 focus-within:ring-gt-primary/20">
        <input
          id={fieldId}
          className={`min-w-0 flex-1 bg-transparent py-gt-10 font-gt-display text-gt-md font-bold text-gt-ink placeholder:font-medium placeholder:text-gt-ink-3 focus:outline-none ${className}`}
          {...rest}
        />
        {trailing}
      </span>
    </label>
  );
}
