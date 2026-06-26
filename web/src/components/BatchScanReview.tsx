import { Link } from "@tanstack/react-router";
import { useI18n } from "@/hooks/useI18n";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
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

const STATUS_TONE: Record<BatchItemStatus, BadgeTone> = {
  uploading: "primary",
  processing: "primary",
  completed: "positive",
  needs_review: "warning",
  failed: "negative",
  discarded: "neutral",
};

const STAT_CLASS: Record<"completed" | "review" | "failed", string> = {
  completed: "text-gt-positive",
  review: "text-gt-warning",
  failed: "text-gt-negative",
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
    <div className="space-y-gt-12" data-testid="batch-review">
      <div
        className="grid grid-cols-3 gap-gt-8 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-gt-16 shadow-gt-sm"
        data-testid="batch-summary"
      >
        <SummaryStat
          testId="batch-summary-completed"
          label={t("batch.status.completed")}
          value={completed}
          colorClass={STAT_CLASS.completed}
        />
        <SummaryStat
          testId="batch-summary-review"
          label={t("batch.status.needsReview")}
          value={needsReview}
          colorClass={STAT_CLASS.review}
        />
        <SummaryStat
          testId="batch-summary-failed"
          label={t("batch.status.failed")}
          value={failed}
          colorClass={STAT_CLASS.failed}
        />
      </div>

      <ul className="space-y-gt-8" data-testid="batch-items">
        {items.map((item) => (
          <li
            key={item.localId}
            data-testid="batch-item"
            data-status={item.status}
            className="rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-gt-16 shadow-gt-sm"
          >
            <div className="flex items-start justify-between gap-gt-8">
              <div className="min-w-0">
                <p className="truncate text-gt-sm font-extrabold text-gt-ink">{item.fileName}</p>
                {item.status === "failed" && item.errorMessage && (
                  <p className="mt-gt-2 text-gt-xs font-bold text-gt-error">{item.errorMessage}</p>
                )}
              </div>
              <span data-testid="batch-item-status" className="shrink-0">
                <Badge tone={STATUS_TONE[item.status]}>{statusLabel[item.status]}</Badge>
              </span>
            </div>

            {(item.status === "uploading" || item.status === "processing") && (
              <div className="mt-gt-8 h-2 w-full overflow-hidden rounded-gt-pill border-2 border-gt-line-strong bg-gt-bg-3">
                <div
                  className="h-full rounded-gt-pill bg-gt-primary transition-all"
                  style={{ width: `${item.progressPct}%` }}
                />
              </div>
            )}

            {isReview && (
              <div className="mt-gt-8 flex gap-gt-10">
                {item.transactionId && item.status !== "discarded" && (
                  <Link
                    to="/transactions/$transactionId"
                    params={{ transactionId: item.transactionId }}
                    data-testid="batch-item-view"
                    className="text-gt-xs font-extrabold text-gt-primary underline"
                  >
                    {t("batch.viewTransaction")}
                  </Link>
                )}
                {item.transactionId && item.status !== "discarded" && (
                  <button
                    type="button"
                    onClick={() => onDiscard(item.localId)}
                    data-testid="batch-item-discard"
                    className="text-gt-xs font-extrabold text-gt-error underline"
                  >
                    {t("batch.discard")}
                  </button>
                )}
                {item.status === "failed" && item.scanId && (
                  <button
                    type="button"
                    onClick={() => onRetry(item.localId)}
                    data-testid="batch-item-retry"
                    className="text-gt-xs font-extrabold text-gt-primary underline"
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
          className="w-full rounded-gt-xl border-2 border-gt-line-strong bg-gt-primary px-gt-16 py-gt-12 font-gt-display text-gt-sm font-extrabold text-white shadow-gt-sm transition duration-150 ease-gt-bounce hover:-translate-y-0.5"
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
  colorClass: string;
}

function SummaryStat({ testId, label, value, colorClass }: SummaryStatProps) {
  return (
    <div className="text-center">
      <p className={`font-gt-display text-gt-2xl font-extrabold ${colorClass}`} data-testid={testId}>
        {value}
      </p>
      <p className="text-gt-xs font-bold uppercase tracking-wide text-gt-ink-3">{label}</p>
    </div>
  );
}
