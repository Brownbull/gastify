import { useState } from "react";
import { Modal } from "@design-system/atoms/Modal";

/**
 * DatePicker (DM-50) — a full-screen DATE picker over the frame: a real month
 * calendar grid you tap to pick a day. The app stores dates as display strings
 * (e.g. "dom 15 jun" / "hoy"), so this works on a real calendar internally but
 * returns a SHORT SPANISH LABEL like "15 jun" (lowercase month abbrev).
 *
 * Reference "today" is FIXED at 2026-06-16 — we never call Date.now() / new
 * Date() with no args (banned for determinism); every date is constructed with
 * explicit Date.UTC(...) so timezone never shifts the day.
 *
 * Geometric grammar: 2px ink borders, hard offset shadows, Outfit extrabold,
 * ease-gt-bounce, rotated-border chevrons for month nav.
 */
export interface DatePickerProps {
  open: boolean;
  onClose: () => void;
  /** current display string (informational only — the grid drives selection). */
  value: string;
  onSelect: (label: string) => void;
}

/** Fixed "today" — 2026-06-16, never Date.now(). */
const TODAY = { year: 2026, month: 5, day: 16 } as const;

/** Loose navigation bounds (inclusive). */
const MIN_YEAR = 2024;
const MAX_YEAR = 2026;

const MONTH_ABBR = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
] as const;

const MONTH_FULL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
] as const;

/** Monday-first weekday headers. */
const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"] as const;

/** Days in a given month, via explicit UTC (day 0 of next month = last day). */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** Monday-first index (0 = Monday … 6 = Sunday) of the 1st of the month. */
function firstWeekdayMondayFirst(year: number, month: number): number {
  const jsDow = new Date(Date.UTC(year, month, 1)).getUTCDay(); // 0 = Sunday
  return (jsDow + 6) % 7;
}

/** "15 jun" — day number + lowercase Spanish month abbrev. */
function formatLabel(_year: number, month: number, day: number): string {
  return `${day} ${MONTH_ABBR[month]}`;
}

/** A rotated-border chevron (geometric grammar) — no SVG, pure CSS borders. */
function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <span
      aria-hidden
      className="block h-2.5 w-2.5"
      style={{
        borderTop: "2px solid var(--text-primary)",
        borderRight: "2px solid var(--text-primary)",
        transform: dir === "left" ? "rotate(-135deg)" : "rotate(45deg)",
        marginInline: dir === "left" ? "2px -2px" : "-2px 2px",
      }}
    />
  );
}

function NavArrow({
  dir,
  disabled,
  onClick,
  label,
}: {
  dir: "left" | "right";
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-gt-md border-2 border-gt-line-strong bg-gt-surface shadow-gt-xs transition duration-150 ease-gt-bounce hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25"
    >
      <Chevron dir={dir} />
    </button>
  );
}

export function DatePicker({ open, onClose, value, onSelect }: DatePickerProps) {
  const [viewYear, setViewYear] = useState<number>(TODAY.year);
  const [viewMonth, setViewMonth] = useState<number>(TODAY.month);

  const totalDays = daysInMonth(viewYear, viewMonth);
  const leading = firstWeekdayMondayFirst(viewYear, viewMonth);

  const atMinBound = viewYear === MIN_YEAR && viewMonth === 0;
  const atMaxBound = viewYear === MAX_YEAR && viewMonth === 11;

  const goPrev = () => {
    if (atMinBound) return;
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNext = () => {
    if (atMaxBound) return;
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const pick = (day: number) => {
    onSelect(formatLabel(viewYear, viewMonth, day));
    onClose();
  };

  // Build the grid: `leading` blanks, then 1..totalDays.
  const cells: Array<number | null> = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  return (
    <Modal open={open} onClose={onClose} title="Fecha">
      <div className="flex flex-col gap-gt-16">
        {/* month header row: ‹ prev  "Junio 2026"  next › */}
        <div className="flex items-center justify-between gap-gt-12">
          <NavArrow dir="left" label="Mes anterior" disabled={atMinBound} onClick={goPrev} />
          <span className="min-w-0 flex-1 truncate text-center font-gt-display text-gt-lg font-extrabold text-gt-ink">
            {MONTH_FULL[viewMonth]} {viewYear}
          </span>
          <NavArrow dir="right" label="Mes siguiente" disabled={atMaxBound} onClick={goNext} />
        </div>

        {/* weekday header row (Monday-first) */}
        <div className="grid grid-cols-7 gap-gt-4">
          {WEEKDAYS.map((wd, i) => (
            <span
              key={`wd-${i}`}
              className="grid h-7 place-items-center font-gt-display text-gt-xs font-extrabold text-gt-ink-3"
            >
              {wd}
            </span>
          ))}
        </div>

        {/* day cells */}
        <div className="grid grid-cols-7 gap-gt-4">
          {cells.map((day, i) => {
            if (day === null) {
              return <span key={`blank-${i}`} aria-hidden className="aspect-square" />;
            }
            const isSelected = formatLabel(viewYear, viewMonth, day) === value;
            const isToday =
              viewYear === TODAY.year && viewMonth === TODAY.month && day === TODAY.day;
            return (
              <button
                key={`day-${day}`}
                type="button"
                aria-pressed={isSelected}
                aria-label={`${day} de ${MONTH_FULL[viewMonth]} de ${viewYear}`}
                onClick={() => pick(day)}
                className={`grid aspect-square place-items-center rounded-gt-md border-2 font-gt-display text-gt-sm font-extrabold transition duration-150 ease-gt-bounce hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25 ${
                  isSelected
                    ? "border-gt-line-strong bg-gt-primary text-white shadow-gt-xs"
                    : isToday
                      ? "border-gt-line-strong bg-gt-surface text-gt-ink shadow-gt-xs"
                      : "border-gt-line bg-gt-surface text-gt-ink hover:bg-gt-bg-3"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
