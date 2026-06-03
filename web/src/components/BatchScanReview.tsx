import { Link } from "@tanstack/react-router";
import { useI18n } from "@/hooks/useI18n";
import {
  type BatchItemStatus,
  type BatchPhase,
  type BatchScanItem,
} from "@/stores/batchScanStore";

interface BatchScanReviewProps {
  items: readonly BatchScanItem[];
  phase: BatchPhase;
  onDiscard: (localId: string) => void;
  onRetry: (localId: string) => void;
  onReset: () => void;
}

const STATUS_COLOR: Record<BatchItemStatus, string> = {
  uploading: "var(--primary)",
  processing: "var(--primary)",
  completed: "var(--success, #22c55e)",
  needs_review: "var(--warning, #f59e0b)",
  failed: "var(--error, #ef4444)",
  discarded: "var(--text-muted)",
};

export function BatchScanReview({
  items,
  phase,
  onDiscard,
  onRetry,
  onReset,
}: BatchScanReviewProps) {
  const { t } = useI18n();

  const completed = items.filter((i) => i.status === "completed").length;
  const needsReview = items.filter((i) => i.status === "needs_review").length;
  const failed = items.filter((i) => i.status === "failed").length;
  const isReview = phase === "review";

  const statusLabel: Record<BatchItemStatus, string> = {
    uploading: t("batch.status.uploading"),
    processing: t("batch.status.processing"),
    completed: t("batch.status.completed"),
    needs_review: t("batch.status.needsReview"),
    failed: t("batch.status.failed"),
    discarded: t("batch.status.discarded"),
  };

  return (
    <div className="space-y-4" data-testid="batch-review">
      <div
        className="grid grid-cols-3 gap-3 rounded-xl border p-4"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
        data-testid="batch-summary"
      >
        <SummaryStat
          testId="batch-summary-completed"
          label={t("batch.status.completed")}
          value={completed}
          color="var(--success, #22c55e)"
        />
        <SummaryStat
          testId="batch-summary-review"
          label={t("batch.status.needsReview")}
          value={needsReview}
          color="var(--warning, #f59e0b)"
        />
        <SummaryStat
          testId="batch-summary-failed"
          label={t("batch.status.failed")}
          value={failed}
          color="var(--error, #ef4444)"
        />
      </div>

      <ul className="space-y-3" data-testid="batch-items">
        {items.map((item) => (
          <li
            key={item.localId}
            data-testid="batch-item"
            data-status={item.status}
            className="rounded-xl border p-4"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  className="truncate text-sm font-medium"
                  style={{ color: "var(--text)" }}
                >
                  {item.fileName}
                </p>
                {item.status === "failed" && item.errorMessage && (
                  <p
                    className="mt-1 text-xs"
                    style={{ color: "var(--error, #ef4444)" }}
                  >
                    {item.errorMessage}
                  </p>
                )}
              </div>
              <span
                data-testid="batch-item-status"
                className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  color: STATUS_COLOR[item.status],
                  backgroundColor: `color-mix(in srgb, ${STATUS_COLOR[item.status]} 15%, transparent)`,
                }}
              >
                {statusLabel[item.status]}
              </span>
            </div>

            {(item.status === "uploading" || item.status === "processing") && (
              <div
                className="mt-3 h-1.5 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: "var(--border)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${item.progressPct}%`,
                    backgroundColor: "var(--primary)",
                  }}
                />
              </div>
            )}

            {isReview && (
              <div className="mt-3 flex gap-3">
                {item.transactionId && item.status !== "discarded" && (
                  <Link
                    to="/transactions/$transactionId"
                    params={{ transactionId: item.transactionId }}
                    data-testid="batch-item-view"
                    className="text-xs font-medium underline"
                    style={{ color: "var(--primary)" }}
                  >
                    {t("batch.viewTransaction")}
                  </Link>
                )}
                {item.transactionId && item.status !== "discarded" && (
                  <button
                    type="button"
                    onClick={() => onDiscard(item.localId)}
                    data-testid="batch-item-discard"
                    className="text-xs font-medium underline"
                    style={{ color: "var(--error, #ef4444)" }}
                  >
                    {t("batch.discard")}
                  </button>
                )}
                {item.status === "failed" && item.scanId && (
                  <button
                    type="button"
                    onClick={() => onRetry(item.localId)}
                    data-testid="batch-item-retry"
                    className="text-xs font-medium underline"
                    style={{ color: "var(--primary)" }}
                  >
                    {t("batch.retry")}
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {isReview && (
        <button
          type="button"
          onClick={onReset}
          data-testid="batch-scan-more"
          className="w-full rounded-lg px-4 py-3 text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: "var(--primary)" }}
        >
          {t("batch.scanMore")}
        </button>
      )}
    </div>
  );
}

interface SummaryStatProps {
  testId: string;
  label: string;
  value: number;
  color: string;
}

function SummaryStat({ testId, label, value, color }: SummaryStatProps) {
  return (
    <div className="text-center">
      <p className="text-2xl font-semibold" data-testid={testId} style={{ color }}>
        {value}
      </p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
    </div>
  );
}
