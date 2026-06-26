/**
 * Category-distribution donut — hand-built SVG (W7 geometric port, replacing
 * Recharts). Each wedge `fill` reads the slice's `--chart-N` colorVar directly
 * (SVG fill resolves CSS vars). The center total counts up; clicking a wedge
 * pops it out and dims the rest; the HTML legend below is the assertable
 * rendered-data surface for the runtime proof. No charting library.
 */
import { useEffect, useState } from "react";
import type { ChartSlice } from "@/lib/chartData";
import { useI18n } from "@/hooks/useI18n";
import { useCountUp } from "@/lib/useCountUp";
import { formatMinorAmount } from "@/lib/format";

interface CategoryDonutProps {
  slices: ChartSlice[];
  currency: string;
  /** Fires for real (non-"Other") slices — used to drill into the filtered list. */
  onSliceClick?: (slice: ChartSlice) => void;
}

// Geometry (ported from design-lab DonutRing): 132×132 user units, 6-unit bleed.
const CX = 60;
const CY = 60;
const R_OUTER = 58;
const RING = 14;
const R_INNER = R_OUTER - RING; // 44
const POP_OUT = 3; // selected wedge grows outward
const GAP_DEG = (0.6 / 100) * 360; // 2.16° gap carved off each wedge's trailing edge

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

interface Wedge {
  slice: ChartSlice;
  i: number;
  d: string;
  isSel: boolean;
}

/** Pure layout — cumulative angles into wedge paths (plain fn: mutable acc is fine). */
function buildWedges(painted: ChartSlice[], selected: string | null): Wedge[] {
  let acc = 0;
  return painted.map((slice, i) => {
    const sweep = (slice.percent / 100) * 360;
    const a0 = acc;
    const a1 = acc + Math.max(0.5, sweep - GAP_DEG);
    acc += sweep;
    const isSel = selected === slice.categoryKey;
    return { slice, i, d: segPath(isSel ? R_OUTER + POP_OUT : R_OUTER, R_INNER, a0, a1), isSel };
  });
}

/** The SVG ring — keyed by the parent so it remounts (re-staggers) on data change. */
function DonutRing({
  painted,
  selected,
  label,
  onSlice,
}: {
  painted: ChartSlice[];
  selected: string | null;
  label: string;
  onSlice: (slice: ChartSlice) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <svg viewBox="-6 -6 132 132" className="h-full w-full" role="img" aria-label={label}>
      {buildWedges(painted, selected).map(({ slice, i, d, isSel }) => (
        <path
          key={slice.categoryKey}
          d={d}
          fill={slice.colorVar}
          data-testid={`donut-segment-${slice.categoryKey}`}
          onClick={() => onSlice(slice)}
          style={{
            opacity: !mounted ? 0 : selected != null && !isSel ? 0.4 : 1,
            transition: "opacity 280ms ease-out, d 200ms ease-out",
            transitionDelay: mounted ? `${i * 60}ms` : "0ms",
            cursor: "pointer",
          }}
        />
      ))}
    </svg>
  );
}

export default function CategoryDonut({ slices, currency, onSliceClick }: CategoryDonutProps) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<string | null>(null);

  const total = slices.reduce((sum, slice) => sum + slice.valueMinor, 0);
  const animatedTotal = useCountUp(total, { animKey: slices.length });
  const painted = slices.filter((s) => s.percent > 0);
  const ringKey = painted.map((s) => s.categoryKey).join("|");

  function handleSlice(slice: ChartSlice) {
    setSelected((cur) => (cur === slice.categoryKey ? null : slice.categoryKey));
    if (!slice.isOther && onSliceClick && slice.drillable !== false) onSliceClick(slice);
  }

  return (
    <div data-testid="category-donut">
      <div className="relative mx-auto" style={{ height: 240, maxWidth: 320 }}>
        <DonutRing
          key={ringKey}
          painted={painted}
          selected={selected}
          label={t("trends.distribution")}
          onSlice={handleSlice}
        />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">
            {t("dashboard.totalSpend")}
          </span>
          <span
            className="font-gt-display text-gt-lg font-extrabold tabular-nums text-gt-ink"
            data-testid="donut-total"
          >
            {formatMinorAmount(animatedTotal, currency)}
          </span>
        </div>
      </div>

      <ul className="mt-gt-12 space-y-gt-2" data-testid="donut-legend">
        {slices.map((slice) => {
          const interactive = !slice.isOther && Boolean(onSliceClick) && slice.drillable !== false;
          const name = slice.isOther ? t("chart.other") : slice.label;
          return (
            <li key={slice.categoryKey} data-testid="donut-legend-item">
              <button
                type="button"
                disabled={!interactive}
                onClick={() => interactive && handleSlice(slice)}
                className="flex w-full items-center gap-gt-8 rounded-gt-md px-gt-4 py-gt-2 text-left text-gt-sm transition enabled:hover:bg-gt-bg-3"
                style={{ cursor: interactive ? "pointer" : "default" }}
              >
                <span
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 rounded-gt-md border-2 border-gt-line-strong"
                  style={{ backgroundColor: slice.colorVar }}
                />
                <span className="min-w-0 flex-1 truncate font-bold text-gt-ink">{name}</span>
                <span className="shrink-0 font-bold tabular-nums text-gt-ink">
                  {formatMinorAmount(slice.valueMinor, currency)}
                </span>
                <span className="w-12 shrink-0 text-right text-gt-xs font-bold tabular-nums text-gt-ink-3">
                  {slice.percent.toFixed(1)}%
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
