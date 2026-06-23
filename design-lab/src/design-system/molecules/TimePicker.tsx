import { useState } from "react";
import { Modal } from "@design-system/atoms/Modal";

/**
 * TimePicker — full-screen TIME picker (DM-clock). A Modal titled "Hora" with a
 * clock-style selector: two vertical wheels (HOUR 00–23, MINUTE 00–59 / step 5)
 * separated by a colon. Each wheel is an up-chevron / big numeral / down-chevron
 * stack. Stepping wraps at the bounds. An "Aceptar" primary button commits the
 * formatted "HH:MM" via onSelect then closes.
 *
 * Presentational: the parent owns `open` and persistence; internal [hour, minute]
 * is seeded from `value` and lives only while the picker is mounted.
 */
export interface TimePickerProps {
  open: boolean;
  onClose: () => void;
  /** current value as "HH:MM". */
  value: string;
  /** called with the committed "HH:MM" on Aceptar. */
  onSelect: (hhmm: string) => void;
}

const MINUTE_STEP = 5;
const MINUTE_MAX = 55; // last valid step (00,05,…,55)
const QUICK_PRESETS = ["08:00", "12:00", "13:00", "19:00", "21:00"] as const;

const pad2 = (n: number): string => n.toString().padStart(2, "0");

/** Parse "HH:MM" → [hour 0..23, minute snapped to step 0..55]; defaults on bad input. */
function parseValue(value: string): [number, number] {
  const [rawH, rawM] = value.split(":");
  const h = Number.parseInt(rawH ?? "", 10);
  const m = Number.parseInt(rawM ?? "", 10);
  const hour = Number.isFinite(h) ? Math.min(Math.max(h, 0), 23) : 0;
  const minuteRaw = Number.isFinite(m) ? Math.min(Math.max(m, 0), 59) : 0;
  const minute = Math.min(Math.round(minuteRaw / MINUTE_STEP) * MINUTE_STEP, MINUTE_MAX);
  return [hour, minute];
}

const wrap = (value: number, span: number): number => ((value % span) + span) % span;

type WheelDirection = "up" | "down";

/** Geometric rotated-border chevron tile — square ink button, no stroke icon. */
function WheelChevron({ direction, label, onClick }: { direction: WheelDirection; label: string; onClick: () => void }) {
  // rotate-45 border draws an L; keep two adjacent sides to form a chevron.
  const corner = direction === "up" ? "border-t-2 border-l-2 -mb-1" : "border-b-2 border-r-2 -mt-1";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-10 w-12 place-items-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface text-gt-ink shadow-gt-xs transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:shadow-gt-sm active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25"
    >
      <span className={`h-2.5 w-2.5 rotate-45 border-current ${corner}`} aria-hidden="true" />
    </button>
  );
}

function Wheel({
  label,
  value,
  onIncrement,
  onDecrement,
}: {
  label: string;
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-gt-8" role="group" aria-label={label}>
      <WheelChevron direction="up" label={`Subir ${label}`} onClick={onIncrement} />
      <span
        className="grid h-16 w-20 place-items-center rounded-gt-xl border-2 border-gt-line-strong bg-gt-bg-2 font-gt-display text-gt-4xl font-extrabold tabular-nums text-gt-ink shadow-gt-xs"
        aria-live="polite"
      >
        {pad2(value)}
      </span>
      <WheelChevron direction="down" label={`Bajar ${label}`} onClick={onDecrement} />
    </div>
  );
}

export function TimePicker({ open, onClose, value, onSelect }: TimePickerProps) {
  const [[hour, minute], setTime] = useState<[number, number]>(() => parseValue(value));

  const stepHour = (delta: number) => setTime(([h, m]) => [wrap(h + delta, 24), m]);
  const stepMinute = (delta: number) =>
    setTime(([h, m]) => [h, wrap(m / MINUTE_STEP + delta, MINUTE_MAX / MINUTE_STEP + 1) * MINUTE_STEP]);

  const applyPreset = (preset: string) => setTime(parseValue(preset));

  const formatted = `${pad2(hour)}:${pad2(minute)}`;

  const commit = () => {
    onSelect(formatted);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Hora">
      <div className="flex flex-col items-center gap-gt-16">
        {/* clock-style steppers */}
        <div className="flex items-center justify-center gap-gt-12">
          <Wheel
            label="hora"
            value={hour}
            onIncrement={() => stepHour(1)}
            onDecrement={() => stepHour(-1)}
          />
          <span className="font-gt-display text-gt-4xl font-extrabold leading-none text-gt-ink-2" aria-hidden="true">
            :
          </span>
          <Wheel
            label="minutos"
            value={minute}
            onIncrement={() => stepMinute(1)}
            onDecrement={() => stepMinute(-1)}
          />
        </div>

        {/* quick presets (optional nicety) */}
        <div className="flex flex-wrap items-center justify-center gap-gt-8">
          {QUICK_PRESETS.map((preset) => {
            const active = preset === formatted;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => applyPreset(preset)}
                aria-pressed={active}
                className={`rounded-gt-pill border-2 px-gt-12 py-gt-4 text-gt-sm font-extrabold tabular-nums transition duration-150 ease-gt-bounce ${
                  active
                    ? "border-gt-line-strong bg-gt-primary text-white shadow-gt-xs"
                    : "border-gt-line-strong bg-gt-surface text-gt-ink hover:-translate-y-0.5 hover:shadow-gt-sm"
                }`}
              >
                {preset}
              </button>
            );
          })}
        </div>

        {/* commit */}
        <button
          type="button"
          onClick={commit}
          className="flex w-full items-center justify-center gap-gt-8 rounded-gt-xl border-2 border-gt-line-strong bg-gt-primary py-gt-12 font-gt-display text-gt-md font-extrabold text-white shadow-gt-sm transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:shadow-gt-md active:translate-y-0"
        >
          Aceptar
        </button>
      </div>
    </Modal>
  );
}
