import { PixelIcon } from "@design-system/assets/PixelIcon";
import { COUNT_MODES, type CountMode } from "@lib/analyticsFixtures";

/**
 * CountModeToggle (DM-9 pick A, refined) — transactions vs items as a compact
 * SWITCH: bigger icons, a tight outer track hugging the two segments (minimal
 * padding) so it reads like a toggle switch rather than a wide segmented bar.
 * The active segment fills primary.
 */
export interface CountModeToggleProps {
  value: CountMode;
  onChange: (mode: CountMode) => void;
  className?: string;
}

export function CountModeToggle({ value, onChange, className = "" }: CountModeToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Modo de conteo"
      // No padding/gap: the segment circles butt directly against the track
      // border and each other (switch look). h-10 segments → matches LevelToggle
      // so the two control bars are the same height, different options inside.
      className={`inline-flex items-center overflow-hidden rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm ${className}`}
    >
      {COUNT_MODES.map((m) => {
        const isActive = m.id === value;
        return (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            title={m.label}
            onClick={() => onChange(m.id)}
            className="relative grid h-10 w-10 place-items-center rounded-gt-pill transition duration-150 ease-gt-bounce hover:bg-gt-bg-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25"
          >
            {/* Circular selection fill, slightly oversized so it bleeds into the
                track's rounded-end corners; the track's overflow-hidden clips it
                back to a clean end — no white in the corners. */}
            {isActive ? <span aria-hidden="true" className="absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-gt-pill bg-gt-primary" /> : null}
            <PixelIcon name={m.icon} size={30} className="relative" />
          </button>
        );
      })}
    </div>
  );
}
