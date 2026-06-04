import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ActivityIndicator, Button, Pressable, StyleSheet, Text, View } from "react-native";
import { ScopeBanner } from "../components/ScopeBanner";
import { ScreenShell } from "../components/ScreenShell";
import { CategoryDonut } from "../components/charts/CategoryDonut";
import { SpendTimeSeries } from "../components/charts/SpendTimeSeries";
import { DimensionToggle } from "./DashboardScreen";
import { useInsightsSeries, useMonthlyInsights } from "../hooks/useInsights";
import { rollupToSlices } from "../lib/chartData";
import {
  currentPeriod,
  periodWindow,
  shiftPeriod,
  type InsightDimension,
  type SeriesGranularity,
} from "../lib/insights";
import type { RootStackParamList } from "../types/navigation";

type TrendsScreenProps = NativeStackScreenProps<RootStackParamList, "Trends">;

const WINDOW_MONTHS: Record<SeriesGranularity, number> = {
  month: 6,
  quarter: 12,
  year: 24,
};

export function TrendsScreen({ navigation }: Partial<TrendsScreenProps> = {}) {
  const [period, setPeriod] = useState(() => currentPeriod());
  const [dimension, setDimension] = useState<InsightDimension>("transaction_category");
  const [granularity, setGranularity] = useState<SeriesGranularity>("month");

  const monthly = useMonthlyInsights(period);
  const window = periodWindow(period, WINDOW_MONTHS[granularity]);
  const series = useInsightsSeries(window.from, window.to, granularity);

  const rows =
    dimension === "transaction_category"
      ? (monthly.data?.top_transaction_categories ?? [])
      : (monthly.data?.top_item_categories ?? []);
  const slices = monthly.data
    ? rollupToSlices(rows, monthly.data.total_spend_minor)
    : [];
  const seriesPoints = series.data?.points ?? [];
  const hasSeriesSpend = seriesPoints.some((point) => point.total_spend_minor > 0);

  return (
    <ScreenShell>
      <View style={styles.header} testID="trends-screen">
        <Button title="Back" onPress={() => navigation?.goBack()} />
        <Text style={styles.title}>Trends</Text>
        <ScopeBanner />
        <View style={styles.periodNav}>
          <Button title="‹ Prev" onPress={() => setPeriod((p) => shiftPeriod(p, -1))} />
          <Text style={styles.periodLabel} testID="trends-period">
            {period}
          </Text>
          <Button title="Next ›" onPress={() => setPeriod((p) => shiftPeriod(p, 1))} />
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Distribution</Text>
        <DimensionToggle dimension={dimension} onChange={setDimension} />
        {monthly.isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#2563eb" />
          </View>
        ) : slices.length > 0 && monthly.data ? (
          <CategoryDonut slices={slices} currency={monthly.data.currency} />
        ) : (
          <Text style={styles.mutedText}>No transactions for this month yet.</Text>
        )}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Spend by period</Text>
        <GranularityToggle value={granularity} onChange={setGranularity} />
        {series.isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#2563eb" />
          </View>
        ) : hasSeriesSpend && series.data ? (
          <SpendTimeSeries points={seriesPoints} currency={series.data.currency} />
        ) : (
          <Text style={styles.mutedText} testID="trends-no-series">
            Not enough data to show trends yet.
          </Text>
        )}
      </View>
    </ScreenShell>
  );
}

function GranularityToggle({
  value,
  onChange,
}: {
  value: SeriesGranularity;
  onChange: (value: SeriesGranularity) => void;
}) {
  const options: { value: SeriesGranularity; label: string }[] = [
    { value: "month", label: "Month" },
    { value: "quarter", label: "Quarter" },
    { value: "year", label: "Year" },
  ];
  return (
    <View style={styles.toggleRow} accessibilityRole="tablist">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[styles.toggle, active && styles.toggleActive]}
            testID={`trends-granularity-${option.value}`}
          >
            <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    paddingVertical: 24,
  },
  header: {
    gap: 8,
    marginBottom: 12,
  },
  mutedText: {
    color: "#64748b",
    fontSize: 13,
    paddingVertical: 12,
  },
  panel: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    padding: 16,
  },
  panelTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  periodLabel: {
    color: "#0f172a",
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
  },
  periodNav: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  title: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: "700",
  },
  toggle: {
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  toggleActive: {
    backgroundColor: "#dbeafe",
    borderColor: "#2563eb",
  },
  toggleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  toggleText: {
    color: "#64748b",
    fontWeight: "600",
  },
  toggleTextActive: {
    color: "#2563eb",
  },
});
