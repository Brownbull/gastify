import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@/components/shell/icons";

/**
 * Select (atom) — a single-choice dropdown for >3 options that don't fit a
 * SegmentedToggle row (currency, palette, typeface). Playful-Geometric: an
 * ink-bordered trigger showing the current label + a chevron; an ink-bordered
 * panel of options below (selected marked with a primary dot). Click-outside +
 * Esc close. Controlled — the host owns `value`.
 *
 * VENDORED from design-lab/src/design-system/atoms/Select.tsx (chevron import
 * re-pointed at web's icon set). See SegmentedToggle for why we vendor rather
 * than import the external design-lab path. Keep in sync with the source.
 */
export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** greys the trigger + blocks opening (coming-soon placeholders, D101). */
  disabled?: boolean;
  /** test hook: sets data-testid on the trigger + `${testId}-option-${value}` per option. */
  testId?: string;
  className?: string;
}

export function Select({ value, onChange, options, disabled = false, testId, className = "" }: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        data-testid={testId}
        data-value={value}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-gt-8 rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface px-gt-12 py-gt-8 font-gt-display text-gt-md font-extrabold text-gt-ink shadow-gt-xs transition duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25 disabled:cursor-default ${disabled ? "opacity-55" : ""}`}
      >
        <span className="truncate">{selected?.label ?? "—"}</span>
        <ChevronDownIcon className={`h-4 w-4 shrink-0 text-gt-ink-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && !disabled ? (
        <ul
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-gt-2 overflow-hidden rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface shadow-gt-md"
        >
          {options.map((o) => {
            const sel = o.value === value;
            return (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={sel}
                  data-testid={testId ? `${testId}-option-${o.value}` : undefined}
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  className={`flex w-full items-center justify-between gap-gt-8 px-gt-12 py-gt-8 text-left font-gt-display text-gt-md font-extrabold transition duration-150 hover:bg-gt-bg-3 ${sel ? "text-gt-primary" : "text-gt-ink"}`}
                >
                  <span className="truncate">{o.label}</span>
                  {sel ? <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-gt-primary" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
