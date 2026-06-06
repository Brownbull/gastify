/**
 * Tiny inline-SVG trend sparkline for the report-detail group cards (Reports v2 P66).
 *
 * Renders the within-period spend shape of a category (per-root `series` from
 * `/insights/tree?include_series=true`) as a small polyline. The line is the signal —
 * the stroke colour just echoes the report's trend convention (last vs first bucket):
 * up = `--error` (more spend), down = `--success` (less spend), flat = `--text-muted`.
 * Lightweight on purpose (no Recharts/Suspense) since it renders once per group row.
 */

interface SparklineProps {
  /** Spend per sub-period bucket, in minor units, oldest → newest. */
  points: number[];
  width?: number;
  height?: number;
  ariaLabel?: string;
}

type TrendDirection = "up" | "down" | "neutral";

function trendDirection(points: number[]): TrendDirection {
  const first = points[0];
  const last = points[points.length - 1];
  if (last > first) return "up";
  if (last < first) return "down";
  return "neutral";
}

const TREND_STROKE: Record<TrendDirection, string> = {
  up: "var(--error)",
  down: "var(--success)",
  neutral: "var(--text-muted)",
};

export function Sparkline({ points, width = 64, height = 20, ariaLabel }: SparklineProps) {
  // A line needs ≥2 points; a single bucket has no shape to show.
  if (points.length < 2) return null;

  const max = Math.max(...points);
  const min = Math.min(...points);
  const flat = max === min; // all-equal (incl. all-zero) → a centred horizontal line
  const range = max - min || 1;
  const pad = 2;
  const usableHeight = height - pad * 2;
  const stepX = width / (points.length - 1);

  const coords = points.map((value, index) => {
    const x = index * stepX;
    const y = flat ? height / 2 : pad + usableHeight - ((value - min) / range) * usableHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const direction = trendDirection(points);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel ?? "spend trend over the period"}
      data-testid="report-detail-sparkline"
      data-trend={direction}
      className="shrink-0"
      preserveAspectRatio="none"
    >
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke={TREND_STROKE[direction]}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
