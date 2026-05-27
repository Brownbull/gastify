import { useCreateStatementTransaction } from "@/hooks/useStatements";
import { formatDate, formatMinorAmount } from "@/lib/format";
import type { components } from "@/lib/api-types";

type StatementBucketItem =
  components["schemas"]["StatementReconciliationBucketItem"];
type StatementReconciliationResponse =
  components["schemas"]["StatementReconciliationResponse"];
type StatementTransactionCandidate =
  components["schemas"]["StatementTransactionCandidate"];
type TransactionCreate = components["schemas"]["TransactionCreate"];

const BUCKETS = [
  { key: "matched", label: "Matched" },
  { key: "statement_only", label: "Statement only" },
  { key: "receipt_only", label: "App only" },
  { key: "ambiguous", label: "Ambiguous" },
  { key: "failed", label: "Failed" },
] as const satisfies readonly {
  key: keyof Pick<
    StatementReconciliationResponse,
    "matched" | "statement_only" | "receipt_only" | "ambiguous" | "failed"
  >;
  label: string;
}[];

export type BucketKey = (typeof BUCKETS)[number]["key"];

interface ReconciliationPanelProps {
  reconciliation: StatementReconciliationResponse | undefined;
  isLoading: boolean;
  errorMessage: string | null;
  activeBucket: BucketKey;
  activeItems: readonly StatementBucketItem[];
  reconcilePending: boolean;
  onBucketChange: (bucket: BucketKey) => void;
  onReconcile: () => void;
}

export function ReconciliationPanel({
  reconciliation,
  isLoading,
  errorMessage,
  activeBucket,
  activeItems,
  reconcilePending,
  onBucketChange,
  onReconcile,
}: ReconciliationPanelProps) {
  if (isLoading) {
    return (
      <section
        className="rounded-lg border p-5"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Loading reconciliation...
        </p>
      </section>
    );
  }

  if (errorMessage || !reconciliation) {
    return (
      <section
        className="space-y-3 rounded-lg border p-5"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Reconciliation is not available yet.
        </p>
        <button
          type="button"
          onClick={onReconcile}
          disabled={reconcilePending}
          className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--primary)" }}
        >
          Run reconciliation
        </button>
      </section>
    );
  }

  const run = reconciliation.run;
  const coveragePct =
    run.coverage_ratio == null ? null : Math.round(run.coverage_ratio * 100);

  return (
    <section
      className="space-y-5 rounded-lg border p-5"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="grid gap-3 sm:grid-cols-5">
        <Metric
          label="Coverage"
          value={coveragePct == null ? "--" : `${coveragePct}%`}
        />
        <Metric label="Matched" value={run.matched_count} />
        <Metric label="Statement only" value={run.statement_only_count} />
        <Metric label="App only" value={run.receipt_only_count} />
        <Metric label="Ambiguous" value={run.ambiguous_count} />
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Reconciliation buckets"
      >
        {BUCKETS.map((bucket) => (
          <button
            key={bucket.key}
            type="button"
            role="tab"
            aria-selected={activeBucket === bucket.key}
            onClick={() => onBucketChange(bucket.key)}
            className="rounded-md border px-3 py-2 text-sm"
            style={{
              borderColor:
                activeBucket === bucket.key ? "var(--primary)" : "var(--border)",
              backgroundColor:
                activeBucket === bucket.key
                  ? "var(--primary-light)"
                  : "transparent",
              color:
                activeBucket === bucket.key ? "var(--primary)" : "var(--text)",
            }}
          >
            {bucket.label} ({reconciliation[bucket.key]?.length ?? 0})
          </button>
        ))}
      </div>

      <BucketTable items={activeItems} bucket={activeBucket} />
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="rounded-md border p-3"
      style={{ borderColor: "var(--border)" }}
    >
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p className="text-lg font-semibold" style={{ color: "var(--text)" }}>
        {value}
      </p>
    </div>
  );
}

function BucketTable({
  items,
  bucket,
}: {
  items: readonly StatementBucketItem[];
  bucket: BucketKey;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        No rows in this bucket.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr style={{ color: "var(--text-muted)" }}>
            <th className="px-3 py-2 font-medium">Statement line</th>
            <th className="px-3 py-2 font-medium">App transaction</th>
            <th className="px-3 py-2 font-medium">Decision</th>
            <th className="px-3 py-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <BucketRow key={item.verdict.id} item={item} bucket={bucket} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BucketRow({
  item,
  bucket,
}: {
  item: StatementBucketItem;
  bucket: BucketKey;
}) {
  const createTransaction = useCreateStatementTransaction();
  const statementLine = item.statement_line;
  const receiptTransaction = item.receipt_transaction;
  const candidate = item.candidate_transaction;

  async function createCandidate(candidate: StatementTransactionCandidate) {
    await createTransaction.mutateAsync(candidate as TransactionCreate);
  }

  return (
    <tr className="border-t" style={{ borderColor: "var(--border)" }}>
      <td className="max-w-[280px] px-3 py-3 align-top">
        {statementLine ? (
          <LineSummary
            date={statementLine.line_date}
            description={statementLine.description}
            amountMinor={statementLine.amount_minor}
            currency={statementLine.currency}
            warningCount={statementLine.warnings?.length ?? 0}
          />
        ) : (
          <span style={{ color: "var(--text-muted)" }}>No statement row</span>
        )}
      </td>
      <td className="max-w-[280px] px-3 py-3 align-top">
        {receiptTransaction ? (
          <LineSummary
            date={receiptTransaction.transaction_date}
            description={receiptTransaction.merchant}
            amountMinor={receiptTransaction.total_minor}
            currency={receiptTransaction.currency}
            edited={Boolean(receiptTransaction.merchant_user_edited_at)}
          />
        ) : candidate ? (
          <LineSummary
            date={candidate.transaction_date}
            description={candidate.merchant}
            amountMinor={candidate.total_minor}
            currency={candidate.currency}
            warningCount={candidate.items.filter((entry) => entry.is_flagged).length}
          />
        ) : (
          <span style={{ color: "var(--text-muted)" }}>No candidate</span>
        )}
      </td>
      <td className="px-3 py-3 align-top">
        <p className="font-medium" style={{ color: "var(--text)" }}>
          {item.verdict.verdict.replaceAll("_", " ")}
        </p>
        {item.verdict.score != null && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Score {Math.round(item.verdict.score * 100)}%
          </p>
        )}
        {(item.verdict.reasons ?? []).slice(0, 2).map((reason) => (
          <p
            key={reason}
            className="text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            {reason.replaceAll("_", " ")}
          </p>
        ))}
      </td>
      <td className="px-3 py-3 align-top">
        {bucket === "statement_only" && candidate ? (
          <button
            type="button"
            onClick={() => void createCandidate(candidate)}
            disabled={createTransaction.isPending}
            className="rounded-md px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--primary)" }}
          >
            Add transaction
          </button>
        ) : (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Review
          </span>
        )}
      </td>
    </tr>
  );
}

interface LineSummaryProps {
  date?: string | null;
  description: string;
  amountMinor: number;
  currency: string;
  warningCount?: number;
  edited?: boolean;
}

function LineSummary({
  date,
  description,
  amountMinor,
  currency,
  warningCount = 0,
  edited = false,
}: LineSummaryProps) {
  return (
    <div>
      <p className="truncate font-medium" style={{ color: "var(--text)" }}>
        {description}
      </p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {date ? formatDate(date) : "No date"} ·{" "}
        {formatMinorAmount(amountMinor, currency)}
      </p>
      <div className="mt-1 flex flex-wrap gap-1">
        {warningCount > 0 && (
          <span
            className="rounded-sm px-1.5 py-0.5 text-xs"
            style={{ backgroundColor: "var(--warning)", color: "var(--text)" }}
          >
            {warningCount} warning{warningCount === 1 ? "" : "s"}
          </span>
        )}
        {edited && (
          <span
            className="rounded-sm px-1.5 py-0.5 text-xs"
            style={{
              backgroundColor: "var(--primary-light)",
              color: "var(--primary)",
            }}
          >
            user edited
          </span>
        )}
      </div>
    </div>
  );
}
