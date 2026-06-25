import type { InputHTMLAttributes } from "react";
import { useId } from "react";

/**
 * Input — "Underline" treatment (DM-3, spike D): bottom 2px ink border only,
 * bold label, transparent field. Minimal — reads best for inline edits. On
 * focus the underline turns primary; error turns it danger.
 */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, className = "", id, ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-message`;
  return (
    <div className={`flex w-full flex-col gap-gt-6 ${className}`}>
      {label ? (
        <label htmlFor={inputId} className="text-gt-sm font-extrabold text-gt-ink">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={`w-full rounded-none border-0 border-b-2 bg-transparent px-gt-4 py-gt-8 text-gt-md font-semibold text-gt-ink placeholder:font-medium placeholder:text-gt-ink-3 focus-visible:outline-none ${
          error ? "border-gt-error" : "border-gt-line-strong focus-visible:border-gt-primary"
        }`}
        {...rest}
      />
      {error ? (
        <p id={messageId} className="text-gt-sm font-bold text-gt-error">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-gt-sm text-gt-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
