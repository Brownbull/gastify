import { PixelIcon } from "@design-system/assets/PixelIcon";
import { SANKEY_LEVEL_META, type LevelRange, type SankeyLevel } from "@lib/analyticsFixtures";

/**
 * LevelRangeBar (DM-24, re-skinned DM-26 to the LevelToggle look) — the
 * L1·L2·L3·L4 taxonomy-level selector for the sankey. VISUALLY identical to
 * `LevelToggle` (icons-only round segments in an ink-bordered overflow-hidden
 * pill, violet selection fill), but instead of marking ONE level it shows a
 * sliding "peel" that always covers a CONTIGUOUS range of ≥2 adjacent levels —
 * the covered levels are the sankey columns. Pressing a chip runs the peel state
 * machine (`pressLevel` in analyticsFixtures): an outside chip extends the peel
 * toward it, the low-end chip retracts it, an inside chip becomes the new low
 * end, never narrowing below 2. The peel slides/grows between ranges.
 *
 * Like LevelToggle the violet fill is slightly oversized so it bleeds into the
 * track's rounded-end corners; the track's `overflow-hidden` clips it back to a
 * clean pill end (no white in the corners).
 */
export interface LevelRangeBarProps {
  range: LevelRange;
  onPressLevel: (level: SankeyLevel) => void;
  className?: string;
}

export function LevelRangeBar({ range, onPressLevel, className = "" }: LevelRangeBarProps) {
  const count = SANKEY_LEVEL_META.length; // 4 equal h-10/w-10 segments
  // peel geometry: each segment is 1/4 of the track; the peel spans lo..hi.
  // grow it ~2px past each covered end so it bleeds into the rounded corners
  // (clipped by overflow-hidden), matching LevelToggle's oversized circle.
  const left = `calc(${((range.lo - 1) / count) * 100}% - 2px)`;
  const width = `calc(${((range.hi - range.lo + 1) / count) * 100}% + 4px)`;

  return (
    <div
      role="group"
      aria-label="Niveles de la jerarquía"
      className={`relative inline-flex items-stretch overflow-hidden rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm ${className}`}
    >
      {/* the sliding peel — covers the contiguous range, slides/grows on change */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 top-1/2 -translate-y-1/2 rounded-gt-pill bg-gt-primary transition-all duration-300 ease-gt-bounce"
        style={{ left, width, height: "calc(100% + 4px)" }}
      />
      {SANKEY_LEVEL_META.map((m) => {
        const inRange = m.level >= range.lo && m.level <= range.hi;
        return (
          <button
            key={m.level}
            type="button"
            aria-pressed={inRange}
            title={m.label}
            onClick={() => onPressLevel(m.level)}
            className="relative grid h-10 w-10 place-items-center rounded-gt-pill transition duration-150 ease-gt-bounce hover:bg-gt-bg-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25"
          >
            <PixelIcon name={m.icon} size={28} className="relative" />
          </button>
        );
      })}
    </div>
  );
}
