import { useCreateStatementTransaction } from "@/hooks/useStatements";
import { formatDate, formatMinorAmount } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
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
      <Card>
        <p className="text-gt-sm font-medium text-gt-ink-2">Loading reconciliation...</p>
      </Card>
    );
  }

  if (errorMessage || !reconciliation) {
    return (
      <Card className="space-y-gt-10">
        <p className="text-gt-sm font-medium text-gt-ink-2">Reconciliation is not available yet.</p>
        <Button onClick={onReconcile} disabled={reconcilePending}>
          Run reconciliation
        </Button>
      </Card>
    );
  }

  const run = reconciliation.run;
  const coveragePct =
    run.coverage_ratio == null ? null : Math.round(run.coverage_ratio * 100);

  return (
    <Card className="space-y-gt-16">
      <div className="grid gap-gt-8 sm:grid-cols-5">
        <Metric label="Coverage" value={coveragePct == null ? "--" : `${coveragePct}%`} />
        <Metric label="Matched" value={run.matched_count} />
        <Metric label="Statement only" value={run.statement_only_count} />
        <Metric label="App only" value={run.receipt_only_count} />
        <Metric label="Ambiguous" value={run.ambiguous_count} />
      </div>

      <div className="flex flex-wrap gap-gt-6" role="tablist" aria-label="Reconciliation buckets">
        {BUCKETS.map((bucket) => {
          const selected = activeBucket === bucket.key;
          return (
            <button
              key={bucket.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onBucketChange(bucket.key)}
              className={`rounded-gt-pill border-2 px-gt-12 py-gt-6 text-gt-sm font-extrabold transition ${
                selected
                  ? "border-gt-line-strong bg-gt-primary text-white"
                  : "border-gt-line bg-gt-surface text-gt-ink-2 hover:border-gt-line-strong"
              }`}
            >
              {bucket.label} ({reconciliation[bucket.key]?.length ?? 0})
            </button>
          );
        })}
      </div>

      <BucketTable items={activeItems} bucket={activeBucket} />
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-gt-lg border-2 border-gt-line bg-gt-bg-3 p-gt-10">
      <p className="text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">{label}</p>
      <p className="font-gt-display text-gt-lg font-extrabold text-gt-ink">{value}</p>
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
    return <p className="text-gt-sm font-medium text-gt-ink-3">No rows in this bucket.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-gt-xl border-2 border-gt-line">
      <table className="min-w-full text-left text-gt-sm">
        <thead>
          <tr className="border-b-2 border-gt-line">
            <th className="px-gt-10 py-gt-8 text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">Statement line</th>
            <th className="px-gt-10 py-gt-8 text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">App transaction</th>
            <th className="px-gt-10 py-gt-8 text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">Decision</th>
            <th className="px-gt-10 py-gt-8 text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y-2 divide-gt-line">
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
    <tr>
      <td className="max-w-[280px] px-gt-10 py-gt-8 align-top">
        {statementLine ? (
          <LineSummary
            date={statementLine.line_date}
            description={statementLine.description}
            amountMinor={statementLine.amount_minor}
            currency={statementLine.currency}
            warningCount={statementLine.warnings?.length ?? 0}
          />
        ) : (
          <span className="text-gt-sm font-medium text-gt-ink-3">No statement row</span>
        )}
      </td>
      <td className="max-w-[280px] px-gt-10 py-gt-8 align-top">
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
          <span className="text-gt-sm font-medium text-gt-ink-3">No candidate</span>
        )}
      </td>
      <td className="px-gt-10 py-gt-8 align-top">
        <p className="font-bold text-gt-ink">{item.verdict.verdict.replaceAll("_", " ")}</p>
        {item.verdict.score != null && (
          <p className="text-gt-xs font-medium text-gt-ink-3">
            Score {Math.round(item.verdict.score * 100)}%
          </p>
        )}
        {(item.verdict.reasons ?? []).slice(0, 2).map((reason) => (
          <p key={reason} className="text-gt-xs font-medium text-gt-ink-3">
            {reason.replaceAll("_", " ")}
          </p>
        ))}
      </td>
      <td className="px-gt-10 py-gt-8 align-top">
        {bucket === "statement_only" && candidate ? (
          <Button size="sm" onClick={() => void createCandidate(candidate)} disabled={createTransaction.isPending}>
            Add transaction
          </Button>
        ) : (
          <span className="text-gt-xs font-bold text-gt-ink-3">Review</span>
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
      <p className="truncate font-bold text-gt-ink">{description}</p>
      <p className="text-gt-xs font-medium text-gt-ink-3">
        {date ? formatDate(date) : "No date"} · {formatMinorAmount(amountMinor, currency)}
      </p>
      <div className="mt-gt-2 flex flex-wrap gap-gt-4">
        {warningCount > 0 && (
          <Badge tone="warning">
            {warningCount} warning{warningCount === 1 ? "" : "s"}
          </Badge>
        )}
        {edited && <Badge tone="primary">user edited</Badge>}
      </div>
    </div>
  );
}
