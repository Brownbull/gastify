import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ScreenShell } from "../components/ScreenShell";
import { CategoryDonut } from "../components/charts/CategoryDonut";
import { useInsightsTree } from "../hooks/useInsights";
import { treeNodesToSlices } from "../lib/chartData";
import { formatMinorAmount } from "../lib/format";
import type { InsightDimension, InsightsTreeNode } from "../lib/insights";
import type { RootStackParamList } from "../types/navigation";

type Props = Partial<NativeStackScreenProps<RootStackParamList, "ReportDetail">>;

const TREND = {
  up: { color: "#b91c1c", glyph: "▲" },
  down: { color: "#15803d", glyph: "▼" },
  flat: { color: "#64748b", glyph: "▬" },
} as const;

/** A month period (YYYY-MM) → first/last calendar day, for the txn drill. */
function monthRange(period: string): { from: string; to: string } {
  const [y, m] = period.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return { from: `${period}-01`, to: `${period}-${String(lastDay).padStart(2, "0")}` };
}

/**
 * Legacy "Resumen" report detail (mobile) — a month report's hierarchical grouped
 * breakdown by store AND by product/item, each a donut + group cards, reusing the
 * shared `/insights/tree` (D69) + the mobile `CategoryDonut`. Insight/highlights
 * (Phase 2) and quarter/year + sparklines (Phase 3) layer on.
 */
export function ReportDetailScreen({ route, navigation }: Props = {}) {
  const params = route?.params ?? {
    period: "",
    label: "",
    totalMinor: 0,
    count: 0,
    currency: "CLP",
    trendDirection: "flat" as const,
    trendPercent: 0,
    hasBaseline: false,
  };
  const { period, label, totalMinor, count, currency } = params;
  const trend = TREND[params.trendDirection];

  return (
    <ScreenShell>
      <View testID="report-detail-screen">
        <View style={styles.header}>
          <Button title="Back" onPress={() => navigation?.goBack()} />
          <Text style={styles.title}>{label}</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroAmount}>{formatMinorAmount(totalMinor, currency)}</Text>
          <Text style={styles.heroMeta}>{count} transactions</Text>
          {params.hasBaseline ? (
            <Text style={[styles.heroTrend, { color: trend.color }]}>
              {trend.glyph} {Math.abs(params.trendPercent).toFixed(1)}%
            </Text>
          ) : null}
        </View>

        <Button
          title="View transactions"
          testID="report-detail-view-transactions"
          onPress={() => {
            const { from, to } = monthRange(period);
            navigation?.navigate("Transactions", { dateFrom: from, dateTo: to });
          }}
        />

        <GroupBreakdown period={period} dimension="transaction_category" title="By store" testID="report-detail-store" />
        <GroupBreakdown period={period} dimension="item_category" title="By item" testID="report-detail-item" />
      </View>
    </ScreenShell>
  );
}

function GroupBreakdown({
  period,
  dimension,
  title,
  testID,
}: {
  period: string;
  dimension: InsightDimension;
  title: string;
  testID: string;
}) {
  const tree = useInsightsTree(period, dimension);
  const roots = tree.data?.roots ?? [];
  const total = tree.data?.total_spend_minor ?? 0;
  const currency = tree.data?.currency ?? "CLP";
  const slices = treeNodesToSlices(roots, total);

  return (
    <View style={styles.section} testID={testID}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {tree.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : tree.error ? (
        <Text style={styles.mutedText}>Could not load the breakdown.</Text>
      ) : roots.length === 0 ? (
        <Text style={styles.mutedText}>No categories in this period.</Text>
      ) : (
        <>
          <CategoryDonut slices={slices} currency={currency} />
          {roots.map((node) => (
            <GroupCard key={node.key} node={node} parentTotal={total} currency={currency} />
          ))}
        </>
      )}
    </View>
  );
}

function GroupCard({
  node,
  parentTotal,
  currency,
}: {
  node: InsightsTreeNode;
  parentTotal: number;
  currency: string;
}) {
  const pct = parentTotal > 0 ? (node.total_minor / parentTotal) * 100 : 0;
  const children = node.children ?? [];
  return (
    <View style={styles.groupCard} testID="report-detail-group">
      <View style={styles.groupHeader}>
        <Text numberOfLines={1} style={styles.groupLabel}>
          {node.label}
        </Text>
        <Text style={styles.groupAmount}>
          {formatMinorAmount(node.total_minor, currency)}
          <Text style={styles.groupPct}> {pct.toFixed(0)}%</Text>
        </Text>
      </View>
      {children.map((child) => (
        <View key={child.key} style={styles.childRow}>
          <Text numberOfLines={1} style={styles.childLabel}>
            {child.label}
          </Text>
          <Text style={styles.childAmount}>{formatMinorAmount(child.total_minor, currency)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: "center", padding: 24 },
  childAmount: { color: "#0f172a", fontSize: 13 },
  childLabel: { color: "#475569", flex: 1, fontSize: 13, paddingRight: 8 },
  childRow: {
    alignItems: "center",
    borderTopColor: "#e2e8f0",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
  },
  groupAmount: { color: "#0f172a", fontSize: 14, fontWeight: "800" },
  groupCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    marginTop: 8,
    padding: 12,
  },
  groupHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  groupLabel: { color: "#0f172a", flex: 1, fontSize: 15, fontWeight: "800", paddingRight: 8 },
  groupPct: { color: "#64748b", fontSize: 12, fontWeight: "400" },
  header: { gap: 8, marginBottom: 16 },
  hero: {
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    marginBottom: 12,
    padding: 20,
  },
  heroAmount: { color: "#0f172a", fontSize: 28, fontWeight: "800" },
  heroMeta: { color: "#64748b", fontSize: 13, marginTop: 4 },
  heroTrend: { fontSize: 14, fontWeight: "700", marginTop: 8 },
  mutedText: { color: "#64748b", fontSize: 14, padding: 16, textAlign: "center" },
  section: { marginTop: 16 },
  sectionTitle: { color: "#0f172a", fontSize: 16, fontWeight: "800", marginBottom: 8 },
  title: { color: "#0f172a", fontSize: 24, fontWeight: "800" },
});
