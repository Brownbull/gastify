import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ActivityIndicator, Button, Pressable, StyleSheet, Text, View } from "react-native";
import { ScopeBanner } from "../components/ScopeBanner";
import { ScreenShell } from "../components/ScreenShell";
import { CategoryDonut } from "../components/charts/CategoryDonut";
import { useInsightsSeries, useMonthlyInsights } from "../hooks/useInsights";
import { rollupToSlices } from "../lib/chartData";
import {
  currentPeriod,
  periodWindow,
  shiftPeriod,
  type InsightDimension,
} from "../lib/insights";
import {
  seriesHasNoSpend,
  seriesToReportCards,
  type ReportCard,
} from "../lib/reports";
import type { RootStackParamList } from "../types/navigation";

type ReportsScreenProps = NativeStackScreenProps<RootStackParamList, "Reports">;

/** Months of history the monthly report list spans, ending at the active period. */
const REPORT_WINDOW_MONTHS = 6;

export function ReportsScreen({ navigation }: Partial<ReportsScreenProps> = {}) {
  const [period, setPeriod] = useState(() => currentPeriod());
  const window = periodWindow(period, REPORT_WINDOW_MONTHS);
  const series = useInsightsSeries(window.from, window.to, "month");

  const points = series.data?.points ?? [];
  const cards = seriesToReportCards(points);
  const currency = series.data?.currency ?? "CLP";
  const hasNoSpend = series.data ? seriesHasNoSpend(points) : false;

  // The newest point in the window is the "current month so far" summary; it is
  // the same data the first monthly card carries, surfaced separately because
  // /insights/series has no week granularity (D-Phase6 weekly note).
  const currentCard = cards.length > 0 ? cards[0] : null;

  return (
    <ScreenShell>
      <View style={styles.header} testID="reports-screen">
        <Button title="Back" onPress={() => navigation?.goBack()} />
        <Text style={styles.title}>Reports</Text>
        <ScopeBanner />
        <View style={styles.periodNav}>
          <Button title="‹ Prev" onPress={() => setPeriod((p) => shiftPeriod(p, -1))} />
          <Text style={styles.periodLabel} testID="reports-period">
            {period}
          </Text>
          <Button title="Next ›" onPress={() => setPeriod((p) => shiftPeriod(p, 1))} />
        </View>
      </View>

      {series.isLoading ? (
        <View style={styles.centered} testID="reports-loading">
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : null}

      {series.error ? (
        <View style={styles.errorPanel} testID="reports-error">
          <Text style={styles.errorTitle}>Reports could not load</Text>
          <Text style={styles.errorBody}>{series.error.message}</Text>
          <Button title="Retry" onPress={() => void series.refetch()} />
        </View>
      ) : null}

      {!series.isLoading && !series.error && hasNoSpend ? (
        <View style={styles.emptyPanel} testID="reports-empty">
          <Text style={styles.emptyTitle}>No spending to report</Text>
          <Text style={styles.mutedText}>
            Scan a receipt to start building period reports.
          </Text>
        </View>
      ) : null}

      {!series.isLoading && !series.error && !hasNoSpend && currentCard ? (
        <View style={styles.weeklyPanel} testID="reports-current-month">
          <Text style={styles.sectionEyebrow}>This month so far</Text>
          <Text style={styles.weeklyLabel}>{currentCard.label}</Text>
          <Text style={styles.weeklyAmount}>
            {formatMinorAmount(currentCard.totalSpendMinor, currency)}
          </Text>
          <Text style={styles.mutedText}>
            {currentCard.transactionCount} transactions
          </Text>
        </View>
      ) : null}

      {!series.isLoading && !series.error && !hasNoSpend ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly</Text>
          {cards.map((card, index) => (
            <PeriodReportCard
              key={card.period}
              card={card}
              currency={currency}
              index={index}
            />
          ))}
        </View>
      ) : null}
    </ScreenShell>
  );
}

function PeriodReportCard({
  card,
  currency,
  index,
}: {
  card: ReportCard;
  currency: string;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={styles.card} testID={`reports-card-${index}`}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setExpanded((value) => !value)}
        style={styles.cardHeader}
      >
        <View style={styles.cardHeaderMain}>
          <Text style={styles.cardLabel}>{card.label}</Text>
          <Text style={styles.cardCount}>{card.transactionCount} transactions</Text>
        </View>
        <View style={styles.cardHeaderRight}>
          <Text style={styles.cardAmount}>
            {formatMinorAmount(card.totalSpendMinor, currency)}
          </Text>
          <TrendIndicator card={card} index={index} />
        </View>
      </Pressable>

      {expanded ? <PeriodBreakdown period={card.period} /> : null}
    </View>
  );
}

const TREND_STYLE: Record<string, { color: string; glyph: string }> = {
  up: { color: "#b91c1c", glyph: "▲" },
  down: { color: "#15803d", glyph: "▼" },
  flat: { color: "#64748b", glyph: "▬" },
};

function TrendIndicator({ card, index }: { card: ReportCard; index: number }) {
  const { direction, percent, hasBaseline } = card.trend;
  const style = TREND_STYLE[direction];
  const label = !hasBaseline
    ? "—"
    : direction === "flat"
      ? "0%"
      : `${Math.abs(percent).toFixed(1)}%`;
  return (
    <Text
      style={[styles.trend, { color: style.color }]}
      testID={`reports-trend-${index}`}
    >
      {style.glyph} {label}
    </Text>
  );
}

function PeriodBreakdown({ period }: { period: string }) {
  const [dimension, setDimension] = useState<InsightDimension>(
    "transaction_category",
  );
  const monthly = useMonthlyInsights(period);

  const rows =
    dimension === "transaction_category"
      ? (monthly.data?.top_transaction_categories ?? [])
      : (monthly.data?.top_item_categories ?? []);
  const slices = monthly.data
    ? rollupToSlices(rows, monthly.data.total_spend_minor)
    : [];

  return (
    <View style={styles.breakdown}>
      <BreakdownToggle dimension={dimension} onChange={setDimension} />
      {monthly.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : slices.length > 0 && monthly.data ? (
        <CategoryDonut slices={slices} currency={monthly.data.currency} />
      ) : (
        <Text style={styles.mutedText}>No category breakdown for this month.</Text>
      )}
    </View>
  );
}

function BreakdownToggle({
  dimension,
  onChange,
}: {
  dimension: InsightDimension;
  onChange: (value: InsightDimension) => void;
}) {
  const options: { value: InsightDimension; label: string }[] = [
    { value: "transaction_category", label: "By store" },
    { value: "item_category", label: "By item" },
  ];
  return (
    <View style={styles.toggleRow} accessibilityRole="tablist">
      {options.map((option) => {
        const active = option.value === dimension;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[styles.toggle, active && styles.toggleActive]}
            testID={`reports-dimension-${option.value}`}
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

// Local minor-amount formatter mirroring TrendsScreen/DashboardScreen so the
// CLP/JPY zero-exponent currencies render without decimals in tests + device.
function formatMinorAmount(amount: number, currency = "CLP"): string {
  const exponent = currency === "CLP" || currency === "JPY" ? 0 : 2;
  const majorAmount = amount / 10 ** exponent;
  try {
    return new Intl.NumberFormat(undefined, {
      currency,
      maximumFractionDigits: exponent,
      minimumFractionDigits: exponent,
      style: "currency",
    }).format(majorAmount);
  } catch {
    return `${currency} ${majorAmount.toFixed(exponent)}`;
  }
}

const styles = StyleSheet.create({
  breakdown: {
    borderTopColor: "#e2e8f0",
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    padding: 16,
  },
  cardAmount: {
    color: "#0f172a",
    fontSize: 16,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    textAlign: "right",
  },
  cardCount: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 3,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardHeaderMain: {
    flex: 1,
    paddingRight: 12,
  },
  cardHeaderRight: {
    alignItems: "flex-end",
  },
  cardLabel: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800",
  },
  centered: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyPanel: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    padding: 24,
  },
  emptyTitle: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 6,
  },
  errorBody: {
    color: "#7f1d1d",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  errorPanel: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    padding: 16,
  },
  errorTitle: {
    color: "#991b1b",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  header: {
    gap: 8,
    marginBottom: 12,
  },
  mutedText: {
    color: "#64748b",
    fontSize: 13,
    paddingVertical: 4,
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
  section: {
    marginTop: 16,
  },
  sectionEyebrow: {
    color: "#2563eb",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
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
    marginBottom: 12,
  },
  toggleText: {
    color: "#64748b",
    fontWeight: "600",
  },
  toggleTextActive: {
    color: "#2563eb",
  },
  trend: {
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
    marginTop: 4,
  },
  weeklyAmount: {
    color: "#0f172a",
    fontSize: 22,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    marginTop: 4,
  },
  weeklyLabel: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 4,
  },
  weeklyPanel: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    padding: 16,
  },
});
