import { DonutCenterLabel } from "@design-system/atoms/DonutCenterLabel";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { tokenTrueSoftColor, OTROS_GREY, type DiagramColorFor } from "@lib/diagramSkin";
import { getCategoryToken } from "@lib/categoryTokens";
import { clpK, type SegmentDatum } from "@lib/analyticsFixtures";

/**
 * SpendingDonut (DM-32) — the STATIC report/PDF donut, ported from legacy
 * `SpendingDonutChart`. Pure-SVG filled `describeArc` WEDGES (not a stroked
 * circle), a faint bg ring, white separation strokes, a center total, and an
 * inline read-only side legend. NON-interactive — a snapshot: no hover, no
 * click, no drill, no entrance animation. (The interactive donut is DonutChart;
 * this is the report variant — different renderer, see REPORTS-SPEC §2.)
 *
 * Palette FIXED to the Token-True 50% skin (DM-13d), like every diagram.
 */
const RING_THICKNESS = 0.42; // ring as a fraction of radius
const SEGMENT_GAP = 2; // degrees between wedges
const MIN_SEGMENT_ANGLE = 8; // degrees — keep a thin wedge visible

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180; // -90 → segment 0 starts at 12 o'clock
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

/** SVG path for one donut wedge (outer arc → in → inner arc → close). */
function describeArc(cx: number, cy: number, rOuter: number, rInner: number, startAngle: number, endAngle: number): string {
  const startOuter = polarToCartesian(cx, cy, rOuter, endAngle);
  const endOuter = polarToCartesian(cx, cy, rOuter, startAngle);
  const startInner = polarToCartesian(cx, cy, rInner, startAngle);
  const endInner = polarToCartesian(cx, cy, rInner, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 1 ${endInner.x} ${endInner.y}`,
    "Z",
  ].join(" ");
}

export interface SpendingDonutProps {
  segments: SegmentDatum[];
  size?: number;
  total?: number;
  periodLabel?: string;
  colorFor?: DiagramColorFor;
  /** hide the inline side legend (donut only). */
  hideLegend?: boolean;
  className?: string;
}

export function SpendingDonut({
  segments,
  size = 120,
  total,
  periodLabel = "Total",
  colorFor = tokenTrueSoftColor,
  hideLegend = false,
  className = "",
}: SpendingDonutProps) {
  const valid = segments.filter((s) => s.pct > 0).slice().sort((a, b) => b.pct - a.pct);
  if (valid.length === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 2;
  const rInner = rOuter * (1 - RING_THICKNESS);
  const ringWidth = rOuter - rInner;
  const rMid = (rOuter + rInner) / 2;

  const availableAngle = 360 - valid.length * SEGMENT_GAP;
  let cursor = 0;
  const wedges = valid.map((s, i) => {
    const angle = Math.max((s.pct / 100) * availableAngle, MIN_SEGMENT_ANGLE);
    const start = cursor;
    const end = cursor + angle;
    cursor = end + SEGMENT_GAP;
    return {
      seg: s,
      d: describeArc(cx, cy, rOuter, rInner, start, end),
      color: s.id === "otros" ? OTROS_GREY : colorFor(s.id, i),
    };
  });

  const grandTotal = total ?? valid.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className={`flex items-center gap-gt-16 ${className}`} data-testid="spending-donut">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          {/* faint background ring */}
          <circle cx={cx} cy={cy} r={rMid} fill="none" stroke="var(--color-gt-line)" strokeWidth={ringWidth} opacity={0.2} />
          {wedges.map((w) => (
            <path key={w.seg.id} d={w.d} fill={w.color} stroke="var(--color-gt-surface)" strokeWidth={1.5}>
              <title>{`${getCategoryToken(w.seg.id).label}: ${w.seg.pct}%`}</title>
            </path>
          ))}
        </svg>
        <DonutCenterLabel primary={clpK(grandTotal)} label={periodLabel} />
      </div>

      {!hideLegend ? (
        <ul className="flex min-w-0 flex-1 flex-col gap-gt-4" data-testid="spending-donut-legend">
          {wedges.map((w) => {
            const t = getCategoryToken(w.seg.id);
            return (
              <li key={w.seg.id} className="flex items-center gap-gt-6 rounded-gt-pill bg-gt-bg-3 py-gt-2 pl-gt-4 pr-gt-8">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-gt-pill" style={{ backgroundColor: w.color }}>
                  <PixelIcon name={w.seg.id === "otros" ? "rubro-otros" : t.icon} size={14} />
                </span>
                <span className="min-w-0 flex-1 truncate font-gt-display text-gt-sm font-extrabold text-gt-ink">{w.seg.id === "otros" ? "Más" : t.label}</span>
                <span className="shrink-0 text-gt-sm font-extrabold text-gt-ink-2">{w.seg.pct}%</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
