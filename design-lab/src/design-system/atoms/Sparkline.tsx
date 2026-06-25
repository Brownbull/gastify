/**
 * Sparkline (DM-13) — inline SVG line of a series (e.g. cumulative daily spend).
 * Stroke color is passed in (semantic by trend direction in callers). Flat-line
 * fallback for <2 points. Pure presentational; no axes.
 */
export interface SparklineProps {
  points: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  /** optional dashed reference line value (previous period). */
  className?: string;
}

export function Sparkline({ points, width = 64, height = 24, color = "var(--primary)", strokeWidth = 2, className = "" }: SparklineProps) {
  const w = width;
  const h = height;
  const pad = strokeWidth;
  if (points.length < 2) {
    const y = h / 2;
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden="true">
        <line x1={pad} y1={y} x2={w - pad} y2={y} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray="2 3" />
      </svg>
    );
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const stepX = (w - pad * 2) / (points.length - 1);
  const d = points
    .map((p, i) => {
      const x = pad + i * stepX;
      const y = h - pad - ((p - min) / span) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
