import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Button, StyleSheet, Text, View } from "react-native";
import { ScreenShell } from "../components/ScreenShell";
import { useBatchScan } from "../hooks/useBatchScan";
import {
  consumeBatchInputs,
  useBatchScanStore,
  type BatchItemStatus,
} from "../stores/batchScanStore";
import type { RootStackParamList } from "../types/navigation";

const STATUS_LABEL: Record<BatchItemStatus, string> = {
  uploading: "Uploading",
  processing: "Processing",
  completed: "Saved",
  needs_review: "Review",
  failed: "Failed",
  discarded: "Discarded",
};

const STATUS_COLOR: Record<BatchItemStatus, string> = {
  uploading: "#2563eb",
  processing: "#2563eb",
  completed: "#166534",
  needs_review: "#92400e",
  failed: "#991b1b",
  discarded: "#64748b",
};

type BatchReviewProps = Partial<
  NativeStackScreenProps<RootStackParamList, "BatchReview">
>;

export function BatchReviewScreen({ navigation }: BatchReviewProps = {}) {
  const phase = useBatchScanStore((s) => s.phase);
  const items = useBatchScanStore((s) => s.items);
  const { start, discard, retry, reset } = useBatchScan();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const inputs = consumeBatchInputs();
    if (inputs.length > 0) {
      void start(inputs);
    }
  }, [start]);

  const completed = items.filter((i) => i.status === "completed").length;
  const needsReview = items.filter((i) => i.status === "needs_review").length;
  const failed = items.filter((i) => i.status === "failed").length;
  const isReview = phase === "review";

  const handleDone = () => {
    reset();
    navigation?.navigate("Home");
  };

  return (
    <ScreenShell>
      <View style={styles.header} testID="batch-review-screen">
        <Text style={styles.eyebrow}>Gastify mobile</Text>
        <Text style={styles.title}>Batch review</Text>
        <Text style={styles.body}>
          {isReview
            ? "Each receipt below is its own transaction. Open to edit or discard."
            : "Processing receipts. This updates as each scan completes."}
        </Text>
      </View>

      <View style={styles.summary} testID="batch-summary">
        <SummaryStat testID="batch-summary-completed" label="Saved" value={completed} color="#166534" />
        <SummaryStat testID="batch-summary-review" label="Review" value={needsReview} color="#92400e" />
        <SummaryStat testID="batch-summary-failed" label="Failed" value={failed} color="#991b1b" />
      </View>

      {items.length === 0 ? (
        <View style={styles.panel} testID="batch-empty">
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : null}

      {items.map((item) => (
        <View key={item.localId} style={styles.panel} testID="batch-item">
          <View style={styles.itemHeader}>
            <Text style={styles.itemLabel} numberOfLines={1}>
              {item.label}
            </Text>
            <Text
              testID="batch-item-status"
              style={[styles.statusBadge, { color: STATUS_COLOR[item.status] }]}
            >
              {STATUS_LABEL[item.status]}
            </Text>
          </View>

          {item.status === "failed" && item.errorMessage ? (
            <Text style={styles.errorText}>{item.errorMessage}</Text>
          ) : null}

          {(item.status === "uploading" || item.status === "processing") && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${item.progressPct}%` }]} />
            </View>
          )}

          {isReview ? (
            <View style={styles.itemActions}>
              {item.transactionId && item.status !== "discarded" ? (
                <View style={styles.itemActionCell}>
                  <Button
                    title="Open"
                    testID="batch-item-view"
                    onPress={() =>
                      navigation?.navigate("TransactionDetail", {
                        transactionId: item.transactionId as string,
                      })
                    }
                  />
                </View>
              ) : null}
              {item.transactionId && item.status !== "discarded" ? (
                <View style={styles.itemActionCell}>
                  <Button
                    title="Discard"
                    testID="batch-item-discard"
                    color="#b91c1c"
                    onPress={() => void discard(item.localId)}
                  />
                </View>
              ) : null}
              {item.status === "failed" && item.scanId ? (
                <View style={styles.itemActionCell}>
                  <Button
                    title="Retry"
                    testID="batch-item-retry"
                    onPress={() => void retry(item.localId)}
                  />
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      ))}

      {isReview ? (
        <Button title="Done" testID="batch-done-button" onPress={handleDone} />
      ) : null}
    </ScreenShell>
  );
}

function SummaryStat({
  testID,
  label,
  value,
  color,
}: {
  testID: string;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.summaryStat}>
      <Text testID={testID} style={[styles.summaryValue, { color }]}>
        {value}
      </Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: "#475569",
    fontSize: 15,
    lineHeight: 22,
  },
  errorText: {
    color: "#991b1b",
    fontSize: 13,
    marginTop: 8,
  },
  eyebrow: {
    color: "#2563eb",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  header: {
    gap: 10,
    marginBottom: 20,
  },
  itemActionCell: {
    flex: 1,
  },
  itemActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  itemHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemLabel: {
    color: "#0f172a",
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    paddingRight: 12,
  },
  panel: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  progressBar: {
    backgroundColor: "#e2e8f0",
    borderRadius: 999,
    height: 6,
    marginTop: 12,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: "#2563eb",
    borderRadius: 999,
    height: 6,
  },
  statusBadge: {
    fontSize: 13,
    fontWeight: "800",
  },
  summary: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 16,
    padding: 16,
  },
  summaryLabel: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 4,
  },
  summaryStat: {
    alignItems: "center",
    flex: 1,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "800",
  },
  title: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: "800",
  },
});
