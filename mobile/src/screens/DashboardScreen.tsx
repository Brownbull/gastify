import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Button,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ScreenShell } from "../components/ScreenShell";
import { CategoryDonut } from "../components/charts/CategoryDonut";
import { useDonutDrill } from "../hooks/useDonutDrill";
import { useInsightsTree, useMonthlyInsights } from "../hooks/useInsights";
import { treeNodesToSlices } from "../lib/chartData";
import {
  currentPeriod,
  shiftPeriod,
  type InsightDimension,
  type InsightExcludedItem,
  type InsightGravityCenter,
  type MonthlyInsights,
} from "../lib/insights";
import { formatMinorAmount } from "../lib/format";
import type { RootStackParamList } from "../types/navigation";

type DashboardScreenProps = NativeStackScreenProps<RootStackParamList, "Dashboard">;

export function DashboardScreen({ navigation }: Partial<DashboardScreenProps> = {}) {
  const [period, setPeriod] = useState(() => currentPeriod());
  const { data, error, isLoading, refetch } = useMonthlyInsights(period);

  return (
    <ScreenShell>
      <View style={styles.header} testID="dashboard-screen">
        <View style={styles.headerTop}>
          <Button title="Back" onPress={() => navigation?.goBack()} />
          <Pressable
            testID="dashboard-open-trends"
            accessibilityRole="button"
            onPress={() => navigation?.navigate("Trends")}
          >
            <Text style={styles.linkText}>Trends ›</Text>
          </Pressable>
        </View>
        <Text style={styles.title}>Dashboard</Text>
        <View style={styles.periodNav}>
          <Button title="‹ Prev" onPress={() => setPeriod((p) => shiftPeriod(p, -1))} />
          <Text style={styles.periodLabel} testID="dashboard-period">
            {period}
          </Text>
          <Button title="Next ›" onPress={() => setPeriod((p) => shiftPeriod(p, 1))} />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered} testID="dashboard-loading">
          <ActivityIndicator color="#2563eb" />
          <Text style={styles.mutedText}>Loading dashboard</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorPanel} testID="dashboard-error">
          <Text style={styles.errorTitle}>Could not load your data</Text>
          <Text style={styles.errorBody}>{error.message}</Text>
          <Button title="Retry" onPress={() => void refetch()} />
        </View>
      ) : null}

      {!isLoading && !error && data ? <DashboardContent data={data} period={period} /> : null}
    </ScreenShell>
  );
}

function DashboardContent({ data, period }: { data: MonthlyInsights; period: string }) {
  const [dimension, setDimension] = useState<InsightDimension>("transaction_category");
  const tree = useInsightsTree(period, dimension);
  const drill = useDonutDrill(
    tree.data?.roots ?? [],
    tree.data?.total_spend_minor ?? 0,
    `${period}:${dimension}`,
  );

  // Android hardware back pops the drill path before leaving the screen.
  const drillRef = useRef(drill);
  drillRef.current = drill;
  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (drillRef.current.path.length > 0) {
          drillRef.current.back();
          return true;
        }
        return false;
      };
      const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
      return () => sub.remove();
    }, []),
  );

  if (data.transaction_count === 0) {
    return (
      <View style={styles.panel} testID="dashboard-empty">
        <Text style={styles.mutedText}>
          No transactions this month yet. Scan a receipt to get started.
        </Text>
      </View>
    );
  }

  // The donut renders the current drill level: roots (L1 industries / L3
  // families) by default, a tapped node's children after drilling. Percentages
  // are within-parent so each level sums to 100%.
  const slices = tree.data
    ? treeNodesToSlices(drill.visibleNodes, drill.parentTotalMinor)
    : [];

  return (
    <View>
      <View style={styles.statRow} testID="dashboard-summary">
        <Stat label="Total spend" value={formatMinorAmount(data.total_spend_minor, data.currency)} />
        <Stat label="Transactions" value={String(data.transaction_count)} />
        <Stat label="Items" value={String(data.item_count)} />
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Top categories</Text>
        <DimensionToggle dimension={dimension} onChange={setDimension} />
        {drill.path.length > 0 ? (
          <DrillBreadcrumb
            trail={drill.path.map((node) => ({ key: node.key, label: node.label }))}
            onCrumb={drill.jumpTo}
            onBack={drill.back}
          />
        ) : null}
        {tree.isLoading ? (
          <View style={styles.centered} testID="dashboard-tree-loading">
            <ActivityIndicator color="#2563eb" />
          </View>
        ) : tree.isError ? (
          <Text style={styles.errorBody} testID="dashboard-tree-error">
            Could not load your categories.
          </Text>
        ) : slices.length === 0 ? (
          <Text style={styles.mutedText} testID="dashboard-tree-empty">
            No categories this month yet.
          </Text>
        ) : (
          <CategoryDonut
            slices={slices}
            currency={tree.data?.currency ?? data.currency}
            onSlicePress={(slice) => drill.drillInto(slice.categoryKey)}
          />
        )}
      </View>

      {(data.gravity_centers ?? []).length > 0 ? (
        <View style={styles.panel} testID="dashboard-gravity">
          <Text style={styles.panelTitle}>What's shifting</Text>
          {(data.gravity_centers ?? []).map((center) => (
            <GravityRow key={`${center.dimension}:${center.category_key}`} center={center} />
          ))}
        </View>
      ) : null}

      {(data.excluded_items ?? []).length > 0 ? (
        <View style={styles.panel} testID="dashboard-excluded">
          <Text style={styles.panelTitle}>Excluded by your flags</Text>
          {(data.excluded_items ?? []).map((item) => (
            <ExcludedRow key={item.flag_kind} item={item} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export function DimensionToggle({
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
            testID={`dashboard-dimension-${option.value}`}
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

function DrillBreadcrumb({
  trail,
  onCrumb,
  onBack,
}: {
  trail: { key: string; label: string }[];
  onCrumb: (depth: number) => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.breadcrumb} testID="drill-breadcrumb">
      <Pressable
        testID="drill-back"
        accessibilityRole="button"
        accessibilityLabel="Back one level"
        onPress={onBack}
        style={styles.crumbBack}
      >
        <Text style={styles.linkText}>‹ Back</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="All categories"
        onPress={() => onCrumb(-1)}
      >
        <Text style={styles.crumbText}>All</Text>
      </Pressable>
      {trail.map((crumb, index) => (
        <View key={crumb.key} style={styles.crumbWrap}>
          <Text style={styles.crumbSep}>›</Text>
          <Pressable accessibilityRole="button" onPress={() => onCrumb(index)}>
            <Text
              style={[styles.crumbText, index === trail.length - 1 ? styles.crumbCurrent : null]}
            >
              {crumb.label}
            </Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function GravityRow({ center }: { center: InsightGravityCenter }) {
  const growing = center.direction === "growth";
  return (
    <View style={styles.gravityRow}>
      <Text style={[styles.gravityArrow, { color: growing ? "#dc2626" : "#16a34a" }]}>
        {growing ? "▲" : "▼"}
      </Text>
      <View style={styles.gravityBody}>
        <Text style={styles.categoryLabel}>
          {center.label} · {growing ? "Growth" : "Shrink"}
        </Text>
        <Text style={styles.mutedText}>{center.explanation}</Text>
      </View>
    </View>
  );
}

function ExcludedRow({ item }: { item: InsightExcludedItem }) {
  const label = item.flag_kind.replace("_", " ");
  return (
    <View style={styles.excludedRow}>
      <Text style={styles.excludedLabel}>
        {label} ({item.item_count})
      </Text>
      <Text style={styles.categoryAmount}>
        {formatMinorAmount(item.total_minor, item.currency)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  breadcrumb: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  categoryAmount: {
    color: "#0f172a",
    fontVariant: ["tabular-nums"],
  },
  categoryLabel: {
    color: "#0f172a",
    fontWeight: "600",
  },
  centered: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 32,
  },
  crumbBack: {
    marginRight: 4,
  },
  crumbCurrent: {
    color: "#0f172a",
    fontWeight: "700",
  },
  crumbSep: {
    color: "#94a3b8",
    marginRight: 4,
  },
  crumbText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "600",
  },
  crumbWrap: {
    alignItems: "center",
    flexDirection: "row",
  },
  errorBody: {
    color: "#7f1d1d",
  },
  errorPanel: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  errorTitle: {
    color: "#b91c1c",
    fontWeight: "700",
  },
  excludedLabel: {
    color: "#334155",
    textTransform: "capitalize",
  },
  excludedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  gravityArrow: {
    fontSize: 16,
    marginRight: 8,
  },
  gravityBody: {
    flex: 1,
  },
  gravityRow: {
    borderTopColor: "#e2e8f0",
    borderTopWidth: 1,
    flexDirection: "row",
    paddingVertical: 8,
  },
  header: {
    gap: 8,
    marginBottom: 12,
  },
  headerTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  linkText: {
    color: "#2563eb",
    fontWeight: "600",
  },
  mutedText: {
    color: "#64748b",
    fontSize: 13,
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
  stat: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  statLabel: {
    color: "#64748b",
    fontSize: 12,
  },
  statRow: {
    flexDirection: "row",
    gap: 8,
  },
  statValue: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
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
