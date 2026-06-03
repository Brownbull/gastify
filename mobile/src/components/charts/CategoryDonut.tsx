/**
 * Category-distribution donut (react-native-gifted-charts, D68). Renders an SVG
 * donut whose slice colors come from the active theme's chartN palette, plus a
 * plain-Text legend (category label + amount + share) — the legend is the
 * assertable rendered-data surface for the Maestro proof (Maestro reads Text
 * nodes, not SVG arcs).
 */
import { View, Text, StyleSheet } from "react-native";
import { PieChart } from "react-native-gifted-charts";
import { useTheme } from "../../providers/ThemeProvider";
import { formatMinorAmount } from "../../lib/format";
import type { ChartSlice } from "../../lib/chartData";

interface CategoryDonutProps {
  slices: ChartSlice[];
  currency: string;
}

export function CategoryDonut({ slices, currency }: CategoryDonutProps) {
  const { colors } = useTheme();
  const palette = [
    colors.chart1,
    colors.chart2,
    colors.chart3,
    colors.chart4,
    colors.chart5,
    colors.chart6,
  ];
  const colorFor = (slice: ChartSlice) =>
    slice.isOther ? colors.textTertiary : palette[slice.colorIndex % palette.length];

  const total = slices.reduce((sum, slice) => sum + slice.valueMinor, 0);
  const pieData = slices.map((slice) => ({
    value: slice.valueMinor,
    color: colorFor(slice),
  }));

  return (
    <View testID="category-donut">
      <View style={styles.donutWrap}>
        <PieChart
          data={pieData}
          donut
          radius={92}
          innerRadius={58}
          innerCircleColor={colors.surface}
          centerLabelComponent={() => (
            <View style={styles.center}>
              <Text style={[styles.centerLabel, { color: colors.textTertiary }]}>
                Total spend
              </Text>
              <Text
                testID="donut-total"
                style={[styles.centerValue, { color: colors.textPrimary }]}
              >
                {formatMinorAmount(total, currency)}
              </Text>
            </View>
          )}
        />
      </View>

      <View testID="donut-legend" style={styles.legend}>
        {slices.map((slice) => (
          <View key={slice.categoryKey} testID="donut-legend-item" style={styles.legendRow}>
            <View style={[styles.swatch, { backgroundColor: colorFor(slice) }]} />
            <Text
              style={[styles.legendLabel, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {slice.isOther ? "Other" : slice.label}
            </Text>
            <Text style={[styles.legendAmount, { color: colors.textPrimary }]}>
              {formatMinorAmount(slice.valueMinor, currency)}
            </Text>
            <Text style={[styles.legendPct, { color: colors.textTertiary }]}>
              {slice.percent.toFixed(1)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
  },
  centerLabel: {
    fontSize: 11,
  },
  centerValue: {
    fontSize: 15,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  donutWrap: {
    alignItems: "center",
    paddingVertical: 8,
  },
  legend: {
    gap: 6,
    marginTop: 12,
  },
  legendAmount: {
    fontVariant: ["tabular-nums"],
  },
  legendLabel: {
    flex: 1,
    fontWeight: "500",
  },
  legendPct: {
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    textAlign: "right",
    width: 48,
  },
  legendRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  swatch: {
    borderRadius: 3,
    height: 12,
    width: 12,
  },
});
