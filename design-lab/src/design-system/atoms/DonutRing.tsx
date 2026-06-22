import { useEffect, useState, type ReactNode } from "react";
import { tokenTrueSoftColor, type DiagramColorFor } from "@lib/diagramSkin";
import type { SegmentDatum } from "@lib/analyticsFixtures";

/**
 * DonutRing (DM-20) — the interactive multi-segment donut. Each segment is a
 * closed donut-wedge PATH (outer arc → radial end → inner arc → radial end →
 * close) filled with its color and outlined with a thin ink stroke, so EVERY
 * edge — including the radial "finishing edges" between sections — is drawn (the
 * old stroke-dasharray ring could only outline the arcs, never the ends).
 *
 * Selecting a wedge pops it outward and dims the rest to 0.4; segments fade in
 * clockwise, staggered. `colorFor`/`inkBorder` are the density/treatment knobs.
 * The center is a slot. Geometry centered at (60,60); 0° = 12 o'clock.
 */
export interface DonutRingProps {
  segments: SegmentDatum[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  /** rendered box size in px (viewBox stays 132). */
  size?: number;
  /** resting band thickness (outer − inner radius). */
  ring?: number;
  /** band thickness when selected — the extra is how far the wedge pops out. */
  selectedRing?: number;
  /** angular gap between wedges, as a % of the full circle. */
  gapPercent?: number;
  colorFor?: DiagramColorFor;
  /** draw a thin ink edge around each wedge (the "geometric" treatment). */
  inkBorder?: boolean;
  /** bump to replay the clockwise reveal. */
  animKey?: number;
  /** center overlay (DonutCenterLabel). */
  children?: ReactNode;
}

const CX = 60;
const CY = 60;
const R_OUTER = 58;
const INK = "#1E293B";

/** point on a circle of radius r at `deg` (0° = 12 o'clock, clockwise). */
function polar(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

/** closed donut-wedge path between two angles. */
function segPath(rO: number, rI: number, a0: number, a1: number): string {
  const [x0o, y0o] = polar(rO, a0);
  const [x1o, y1o] = polar(rO, a1);
  const [x1i, y1i] = polar(rI, a1);
  const [x0i, y0i] = polar(rI, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0o} ${y0o} A ${rO} ${rO} 0 ${large} 1 ${x1o} ${y1o} L ${x1i} ${y1i} A ${rI} ${rI} 0 ${large} 0 ${x0i} ${y0i} Z`;
}

export function DonutRing({
  segments,
  selected,
  onSelect,
  size = 180,
  ring = 14,
  selectedRing = 17,
  gapPercent = 0.6,
  colorFor = tokenTrueSoftColor,
  inkBorder = false,
  animKey = 0,
  children,
}: DonutRingProps) {
  const painted = segments.filter((s) => s.pct > 0);
  const [visible, setVisible] = useState<Set<number>>(new Set());
  useEffect(() => {
    setVisible(new Set());
    const timers = painted.map((_, i) => setTimeout(() => setVisible((s) => new Set([...s, i])), i * 70));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animKey, painted.length]);

  const rI = R_OUTER - ring;
  const popOut = Math.max(2, selectedRing - ring);
  const gapDeg = (gapPercent / 100) * 360;
  let acc = 0;
  const paths = painted.map((seg, i) => {
    const sweep = (seg.pct / 100) * 360;
    const a0 = acc;
    const a1 = acc + Math.max(0.5, sweep - gapDeg);
    acc += sweep;
    const isSel = seg.id === selected;
    const color = colorFor(seg.id, i);
    const dimmed = selected != null && !isSel ? 0.4 : 1;
    const d = segPath(isSel ? R_OUTER + popOut : R_OUTER, rI, a0, a1);
    return (
      <path
        key={`${seg.id}-${animKey}`}
        d={d}
        fill={color}
        stroke={inkBorder ? INK : "none"}
        strokeWidth={inkBorder ? 0.75 : 0}
        strokeLinejoin="round"
        onClick={() => onSelect(isSel ? null : seg.id)}
        data-testid={`donut-segment-${seg.id}`}
        style={{
          opacity: visible.has(i) ? dimmed : 0,
          transition: "opacity 280ms ease-out",
          cursor: "pointer",
        }}
      />
    );
  });

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="-6 -6 132 132" className="h-full w-full" aria-hidden="true">
        {paths}
      </svg>
      {children}
    </div>
  );
}
