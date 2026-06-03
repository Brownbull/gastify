/**
 * Spend time-series bar chart (react-native-gifted-charts, D68). Bars = spend
 * per period over the /insights/series buckets. A plain-Text caption row echoes
 * the latest period + amount so the Maestro proof has an assertable data node.
 */
import { View, Text, StyleSheet } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { useTheme } from "../../providers/ThemeProvider";
import { formatMinorAmount } from "../../lib/format";
import type { InsightsSeriesPoint } from "../../lib/insights";

interface SpendTimeSeriesProps {
  points: InsightsSeriesPoint[];
  currency: string;
}

export function SpendTimeSeries({ points, currency }: SpendTimeSeriesProps) {
  const { colors } = useTheme();
  const barData = points.map((point) => ({
    value: point.total_spend_minor,
    // Shorten YYYY-MM -> MM, keep YYYY-Q# / YYYY as-is.
    label: point.period.length === 7 ? point.period.slice(5) : point.period,
    frontColor: colors.chart1,
  }));
  const latest = points.at(-1);

  return (
    <View testID="spend-timeseries">
      <BarChart
        data={barData}
        frontColor={colors.chart1}
        barWidth={20}
        spacing={16}
        initialSpacing={12}
        roundedTop
        noOfSections={3}
        yAxisThickness={1}
        xAxisThickness={1}
        yAxisColor={colors.borderMedium}
        xAxisColor={colors.borderMedium}
        rulesColor={colors.borderLight}
        yAxisTextStyle={{ color: colors.textTertiary, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: colors.textTertiary, fontSize: 10 }}
        hideYAxisText={false}
        disableScroll
      />
      {latest ? (
        <Text
          testID="timeseries-latest"
          style={[styles.caption, { color: colors.textSecondary }]}
        >
          {latest.period}: {formatMinorAmount(latest.total_spend_minor, currency)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    marginTop: 8,
    textAlign: "center",
  },
});
