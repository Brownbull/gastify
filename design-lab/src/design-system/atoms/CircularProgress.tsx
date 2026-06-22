/**
 * CircularProgress (DM-13) — SVG percentage ring: faint background track + a
 * foreground arc whose length encodes `percent`, with a centered "N%" numeral.
 * Used inside treemap cells and as a donut-center fallback. Color + numeral
 * font are passed in so the chart-skin spike can vary them.
 */
export interface CircularProgressProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  /** arc + numeral color. */
  color?: string;
  /** background track color (defaults to a faint version of color via opacity). */
  trackOpacity?: number;
  /** numeral font-family class (e.g. font-gt-display). */
  numeralClassName?: string;
  className?: string;
}

export function CircularProgress({
  percent,
  size = 36,
  strokeWidth = 4,
  color = "var(--text-primary)",
  trackOpacity = 0.2,
  numeralClassName = "font-gt-display",
  className = "",
}: CircularProgressProps) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, percent)) / 100) * c;
  const textSize = Math.round(size * 0.32);
  return (
    <span className={`relative inline-grid shrink-0 place-items-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeOpacity={trackOpacity} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className={`absolute font-extrabold leading-none ${numeralClassName}`} style={{ color, fontSize: textSize }}>
        {Math.round(percent)}%
      </span>
    </span>
  );
}
