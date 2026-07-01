import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@/components/shell/icons";

/**
 * Select (atom) — a single-choice dropdown for >3 options that don't fit a
 * SegmentedToggle row (currency, palette, typeface, country/city). Playful-
 * Geometric: an ink-bordered trigger showing the current label + a chevron; an
 * ink-bordered panel of options below (selected marked with a primary dot).
 * Controlled — the host owns `value`.
 *
 * Keyboard (when open): ↑/↓ move the highlight, Home/End jump to ends, Enter
 * picks the highlighted option, Esc closes, and TYPE-AHEAD jumps to the first
 * option whose label starts with what you type (accent-insensitive; pressing the
 * same letter repeatedly cycles through matches). Click-outside also closes.
 *
 * VENDORED from design-lab/src/design-system/atoms/Select.tsx (chevron import
 * re-pointed at web's icon set; keyboard nav + type-ahead added in web).
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

/** Accent- and case-insensitive normalization for type-ahead matching. */
function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function Select({ value, onChange, options, disabled = false, testId, className = "" }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const activeIndexRef = useRef(-1);
  const typeBufferRef = useRef("");
  const typeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setActive = (next: number) => {
    activeIndexRef.current = next;
    setActiveIndex(next);
  };

  const openPanel = () => {
    const i = options.findIndex((o) => o.value === value);
    setActive(i >= 0 ? i : 0);
    setOpen(true);
  };
  const close = () => {
    typeBufferRef.current = "";
    if (typeTimerRef.current) clearTimeout(typeTimerRef.current);
    setActive(-1);
    setOpen(false);
  };
  const pick = (v: string) => {
    onChange(v);
    close();
  };

  // Keep the highlighted option scrolled into view.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  // Click-outside closes.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keyboard: Esc / arrows / Home / End / Enter / type-ahead.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const last = options.length - 1;
      switch (e.key) {
        case "Escape":
          close();
          return;
        case "ArrowDown":
          e.preventDefault();
          setActive(Math.min(last, activeIndexRef.current + 1));
          return;
        case "ArrowUp":
          e.preventDefault();
          setActive(Math.max(0, activeIndexRef.current - 1));
          return;
        case "Home":
          e.preventDefault();
          setActive(0);
          return;
        case "End":
          e.preventDefault();
          setActive(last);
          return;
        case "Enter":
          e.preventDefault();
          {
            const o = options[activeIndexRef.current];
            if (o) pick(o.value);
          }
          return;
      }
      // Type-ahead: printable single characters.
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        typeBufferRef.current += e.key;
        if (typeTimerRef.current) clearTimeout(typeTimerRef.current);
        typeTimerRef.current = setTimeout(() => {
          typeBufferRef.current = "";
        }, 600);

        const buffer = norm(typeBufferRef.current);
        // Repeated same letter ("s", "ss", …) → cycle to the NEXT match.
        const repeat = buffer.length > 1 && [...buffer].every((c) => c === buffer[0]);
        const needle = repeat ? buffer[0] : buffer;
        const from = repeat ? activeIndexRef.current + 1 : 0;
        for (let k = 0; k < options.length; k++) {
          const i = (from + k) % options.length;
          if (norm(options[i].label).startsWith(needle)) {
            setActive(i);
            break;
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, options, onChange]);

  const selected = options.find((o) => o.value === value);
  const listId = testId ? `${testId}-listbox` : undefined;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && activeIndex >= 0 && testId ? `${testId}-option-${options[activeIndex]?.value}` : undefined}
        disabled={disabled}
        data-testid={testId}
        data-value={value}
        onClick={() => (open ? close() : openPanel())}
        className={`flex w-full items-center justify-between gap-gt-8 rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface px-gt-12 py-gt-8 font-gt-display text-gt-md font-extrabold text-gt-ink shadow-gt-xs transition duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25 disabled:cursor-default ${disabled ? "opacity-55" : ""}`}
      >
        <span className="truncate">{selected?.label ?? "—"}</span>
        <ChevronDownIcon className={`h-4 w-4 shrink-0 text-gt-ink-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && !disabled ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-gt-2 max-h-72 overflow-y-auto rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface shadow-gt-md"
        >
          {options.map((o, i) => {
            const sel = o.value === value;
            const active = i === activeIndex;
            return (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  id={testId ? `${testId}-option-${o.value}` : undefined}
                  aria-selected={sel}
                  data-testid={testId ? `${testId}-option-${o.value}` : undefined}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(o.value)}
                  className={`flex w-full items-center justify-between gap-gt-8 px-gt-12 py-gt-8 text-left font-gt-display text-gt-md font-extrabold transition duration-150 ${active ? "bg-gt-bg-3" : ""} ${sel ? "text-gt-primary" : "text-gt-ink"}`}
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
