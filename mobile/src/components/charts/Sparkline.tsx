import { Polyline, Svg } from "react-native-svg";
import { useTheme } from "../../providers/ThemeProvider";

/**
 * Tiny SVG trend sparkline for the report-detail group cards (Reports v2 P66).
 *
 * Renders the within-period spend shape of a category (per-root `series` from
 * /insights/tree?include_series=true) as a small polyline. The line is the signal; the
 * stroke colour echoes the report's trend convention (last vs first bucket): up = error
 * (more spend), down = success (less spend), flat = textTertiary. Mirrors the web
 * Sparkline; no animation, no extra deps beyond react-native-svg (already installed).
 */

interface SparklineProps {
  /** Spend per sub-period bucket, in minor units, oldest -> newest. */
  points: number[];
  width?: number;
  height?: number;
  testID?: string;
}

type TrendDirection = "up" | "down" | "neutral";

function trendDirection(points: number[]): TrendDirection {
  const first = points[0];
  const last = points[points.length - 1];
  if (last > first) return "up";
  if (last < first) return "down";
  return "neutral";
}

export function Sparkline({ points, width = 56, height = 18, testID }: SparklineProps) {
  const { colors } = useTheme();

  // A line needs >=2 points; a single bucket has no shape to show.
  if (points.length < 2) return null;

  const max = Math.max(...points);
  const min = Math.min(...points);
  const flat = max === min; // all-equal (incl. all-zero) -> a centred horizontal line
  const range = max - min || 1;
  const pad = 2;
  const usableHeight = height - pad * 2;
  const stepX = width / (points.length - 1);

  const coords = points
    .map((value, index) => {
      const x = index * stepX;
      const y = flat ? height / 2 : pad + usableHeight - ((value - min) / range) * usableHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const direction = trendDirection(points);
  const stroke =
    direction === "up" ? colors.error : direction === "down" ? colors.success : colors.textTertiary;

  return (
    <Svg
      width={width}
      height={height}
      testID={testID ?? "report-detail-sparkline"}
      accessibilityRole="image"
      accessibilityLabel="spend trend over the period"
    >
      <Polyline
        points={coords}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
