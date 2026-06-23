import { useState } from "react";

/**
 * Shared input style for tap-to-edit fields — a primary-bordered, extrabold,
 * surface-filled box (the legacy BoletApp inline editor look). Used by
 * InlineText and by item-editor number inputs.
 */
export const inlineInputClass =
  "rounded-gt-md border-2 border-gt-primary bg-gt-surface px-gt-8 py-gt-2 font-gt-display font-extrabold text-gt-ink shadow-gt-xs focus:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25";

export interface InlineTextProps {
  value: string;
  onChange: (v: string) => void;
  /** maxLength cap. */
  cap?: number;
  className?: string;
  ariaLabel: string;
}

/**
 * InlineText — a tap-to-edit text value: shows text at rest, becomes an input
 * when tapped (commit on blur / Enter). The edit-in-place primitive shared by
 * the scan review and the saved-transaction detail.
 */
export function InlineText({ value, onChange, cap, className = "", ariaLabel }: InlineTextProps) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <input
        autoFocus
        aria-label={ariaLabel}
        className={`${inlineInputClass} ${className}`}
        value={value}
        maxLength={cap}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => { if (e.key === "Enter") setEditing(false); }}
      />
    );
  }
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={() => setEditing(true)}
      className={`rounded-gt-sm text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25 ${className}`}
    >
      {value}
    </button>
  );
}
