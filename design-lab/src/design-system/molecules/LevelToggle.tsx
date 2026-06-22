import { useEffect, useRef, useState } from "react";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { LEVELS, type TaxLevel } from "@lib/analyticsFixtures";

/**
 * LevelToggle (DM-9 pick A, refined) — the L1–L4 taxonomy switch as an
 * icons-only pill. On selection, a label overlay slides across the WHOLE pill
 * (covering the options) showing the level's title, holds, then fades out over
 * ~3s and reveals the options again. This both confirms the pick and rate-
 * limits spamming through levels.
 *
 * Self-contained: it owns the reveal timer. `value`/`onChange` are controlled.
 * h-8 segments → the shared narrow analytics-control height.
 */
export interface LevelToggleProps {
  value: TaxLevel;
  onChange: (level: TaxLevel) => void;
  className?: string;
}

const REVEAL_MS = 3000;

export function LevelToggle({ value, onChange, className = "" }: LevelToggleProps) {
  const [revealLabel, setRevealLabel] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const select = (l: { id: TaxLevel; label: string }) => {
    onChange(l.id);
    // restart the reveal each time so rapid taps re-show the new label
    if (timer.current) clearTimeout(timer.current);
    setRevealLabel(l.label);
    timer.current = setTimeout(() => setRevealLabel(null), REVEAL_MS);
  };

  return (
    <div
      role="tablist"
      aria-label="Nivel de taxonomía"
      className={`relative inline-flex items-stretch overflow-hidden rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm ${className}`}
    >
      {LEVELS.map((l) => {
        const isActive = l.id === value;
        return (
          <button
            key={l.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            title={l.label}
            onClick={() => select(l)}
            className="group relative grid h-10 w-10 place-items-center rounded-gt-pill transition duration-150 ease-gt-bounce hover:bg-gt-bg-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25"
          >
            {/* Circular selection fill, slightly oversized so it bleeds into the
                track's rounded-end corners; the track's overflow-hidden clips it
                back to a clean circle/pill end — no white in the corners. */}
            {isActive ? <span aria-hidden="true" className="absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-gt-pill bg-gt-primary" /> : null}
            <PixelIcon name={l.icon} size={30} className="relative" />
          </button>
        );
      })}

      {/* Label-reveal overlay — covers the whole pill, fades over REVEAL_MS. */}
      {revealLabel ? (
        <span
          // keyed by label so re-selecting restarts the animation
          key={revealLabel + value}
          aria-hidden="true"
          className="gt-label-reveal pointer-events-none absolute inset-0 flex items-center justify-center gap-gt-8 rounded-gt-pill bg-gt-primary px-gt-16 text-white"
        >
          <PixelIcon name={LEVELS.find((l) => l.id === value)!.icon} size={28} />
          <span className="text-gt-md font-extrabold">{revealLabel}</span>
        </span>
      ) : null}
    </div>
  );
}
