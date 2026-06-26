import { useScanStore } from "@/stores/scanStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, type BadgeTone } from "@/components/ui/Badge";

const LOW_CONFIDENCE_THRESHOLD = 0.6;

function formatMinorAmount(amount: number, currency: string): string {
  const exponent = currency === "CLP" || currency === "JPY" ? 0 : 2;
  const majorAmount = amount / 10 ** exponent;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: exponent,
      maximumFractionDigits: exponent,
    }).format(majorAmount);
  } catch {
    return `${currency} ${majorAmount.toFixed(exponent)}`;
  }
}

export function ScanResult() {
  const phase = useScanStore((s) => s.phase);
  const result = useScanStore((s) => s.result);
  const reset = useScanStore((s) => s.reset);

  if (phase !== "complete") return null;

  const hasDetailedResult = result != null && result.merchant_name != null;
  const isLowConfidence =
    result?.confidence_score != null &&
    result.confidence_score < LOW_CONFIDENCE_THRESHOLD;
  const hasMajorReconciliationWarning =
    result?.reconciliation_severity === "major_warning";
  const isNewMerchant = result?.is_new_merchant === true;

  if (!hasDetailedResult) {
    return (
      <Card className="space-y-gt-12 !border-gt-positive">
        <div className="flex items-center gap-gt-8">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-gt-pill border-2 border-gt-line-strong bg-gt-positive text-gt-lg font-extrabold text-gt-ink">
            ✓
          </span>
          <div>
            <h3 className="font-gt-display text-gt-lg font-extrabold text-gt-ink">Scan Complete</h3>
            <p className="text-gt-sm font-medium text-gt-ink-2">
              Your receipt has been processed. View it in the transaction ledger.
            </p>
          </div>
        </div>
        <Button onClick={reset}>Scan Another</Button>
      </Card>
    );
  }

  return (
    <Card className={`space-y-gt-12 ${isLowConfidence ? "!border-gt-warning" : "!border-gt-positive"}`}>
      <div className="flex items-start justify-between gap-gt-8">
        <h3 className="font-gt-display text-gt-lg font-extrabold text-gt-ink">Scan Complete</h3>
        <ConfidenceBadge score={result?.confidence_score} />
      </div>

      {isLowConfidence && (
        <div className="rounded-gt-lg border-2 border-gt-warning bg-gt-warning/10 p-gt-10" role="alert">
          <p className="text-gt-sm font-extrabold text-gt-ink">
            Low confidence scan — please review the extracted data carefully
          </p>
          <p className="mt-gt-2 text-gt-xs font-medium text-gt-ink-2">
            Some fields may be inaccurate. Edit any incorrect values before saving.
          </p>
        </div>
      )}

      {hasMajorReconciliationWarning && (
        <div className="rounded-gt-lg border-2 border-gt-warning bg-gt-warning/10 p-gt-10" role="alert">
          <p className="text-gt-sm font-extrabold text-gt-ink">Receipt math needs review</p>
        </div>
      )}

      {isNewMerchant && (
        <div className="rounded-gt-lg border-2 border-gt-primary bg-gt-primary-soft p-gt-10">
          <p className="text-gt-sm font-extrabold text-gt-primary">First scan at this merchant</p>
          <p className="mt-gt-2 text-gt-xs font-medium text-gt-ink-2">
            Confirm the merchant name and category — they'll be remembered for future scans.
          </p>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-x-gt-12 gap-y-gt-8">
        {result!.merchant_name && (
          <ResultField label="Merchant" value={result!.merchant_name} />
        )}
        {result!.transaction_date && (
          <ResultField label="Date" value={result!.transaction_date} />
        )}
        {result!.total_amount != null && result!.currency_code && (
          <ResultField
            label="Total"
            value={formatMinorAmount(result!.total_amount, result!.currency_code)}
          />
        )}
        {result!.gross_total_amount != null && result!.currency_code && (
          <ResultField
            label="Before discount"
            value={formatMinorAmount(result!.gross_total_amount, result!.currency_code)}
          />
        )}
        {result!.discount_amount != null && result!.currency_code && (
          <ResultField
            label="Discount"
            value={`-${formatMinorAmount(result!.discount_amount, result!.currency_code)}`}
          />
        )}
        {result!.reconstructed_total != null &&
          result!.status === "needs_review" &&
          result!.currency_code && (
            <ResultField
              label="Reconstructed"
              value={formatMinorAmount(result!.reconstructed_total, result!.currency_code)}
            />
          )}
        {result!.currency_code && (
          <ResultField label="Currency" value={result!.currency_code} />
        )}
      </dl>

      {result!.line_items && result!.line_items.length > 0 && (
        <div>
          <h4 className="mb-gt-6 text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">
            Line Items ({result!.line_items.length})
          </h4>
          <div className="space-y-gt-2">
            {result!.line_items.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between gap-gt-12 rounded-gt-lg border-2 border-gt-line bg-gt-bg-3 px-gt-10 py-gt-6 text-gt-sm"
              >
                <span className="font-bold text-gt-ink">
                  {item.qty != null && item.qty > 1 ? `${item.qty}× ` : ""}
                  {item.name}
                </span>
                <span className="shrink-0 font-extrabold tabular-nums text-gt-ink">
                  {result!.currency_code
                    ? formatMinorAmount(item.total_price, result!.currency_code)
                    : item.total_price.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-gt-8">
        <Button variant="success" onClick={() => reset()}>
          Save Transaction
        </Button>
        <Button variant="secondary" onClick={reset}>
          Discard
        </Button>
      </div>
    </Card>
  );
}

function ConfidenceBadge({ score }: { score?: number }) {
  if (score == null) return null;

  const pct = Math.round(score * 100);
  const isLow = score < LOW_CONFIDENCE_THRESHOLD;
  const isMedium = score >= LOW_CONFIDENCE_THRESHOLD && score < 0.85;

  const tone: BadgeTone = isLow ? "negative" : isMedium ? "warning" : "positive";

  return (
    <span title={`Scan confidence: ${pct}%`} className="shrink-0">
      <Badge tone={tone}>{pct}% confidence</Badge>
    </span>
  );
}

function ResultField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">{label}</dt>
      <dd className="text-gt-sm font-bold text-gt-ink">{value}</dd>
    </div>
  );
}
