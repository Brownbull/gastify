import { useScanStore } from "@/stores/scanStore";

const LOW_CONFIDENCE_THRESHOLD = 0.6;

function formatAmount(minorOrDecimal: number, currency: string): string {
  const amount = minorOrDecimal > 1000 ? minorOrDecimal / 100 : minorOrDecimal;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function ScanResult() {
  const phase = useScanStore((s) => s.phase);
  const result = useScanStore((s) => s.result);
  const reset = useScanStore((s) => s.reset);

  if (phase !== "complete" || !result) return null;

  const isLowConfidence =
    result.confidence_score != null &&
    result.confidence_score < LOW_CONFIDENCE_THRESHOLD;
  const isNewMerchant = result.is_new_merchant === true;

  return (
    <div
      className="space-y-4 rounded-xl border p-6"
      style={{
        backgroundColor: "var(--surface)",
        borderColor: isLowConfidence
          ? "var(--warning, #f59e0b)"
          : "var(--success, #22c55e)",
      }}
    >
      <div className="flex items-start justify-between">
        <h3
          className="text-lg font-semibold"
          style={{ color: "var(--text)" }}
        >
          Scan Complete
        </h3>
        <ConfidenceBadge score={result.confidence_score} />
      </div>

      {isLowConfidence && (
        <div
          className="rounded-lg border p-3"
          style={{
            backgroundColor: "color-mix(in srgb, var(--warning, #f59e0b) 10%, transparent)",
            borderColor: "var(--warning, #f59e0b)",
          }}
          role="alert"
        >
          <p
            className="text-sm font-medium"
            style={{ color: "var(--warning, #f59e0b)" }}
          >
            Low confidence scan — please review the extracted data carefully
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Some fields may be inaccurate. Edit any incorrect values before saving.
          </p>
        </div>
      )}

      {isNewMerchant && (
        <div
          className="rounded-lg border p-3"
          style={{
            backgroundColor: "var(--primary-light)",
            borderColor: "var(--primary)",
          }}
        >
          <p
            className="text-sm font-medium"
            style={{ color: "var(--primary)" }}
          >
            First scan at this merchant
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Confirm the merchant name and category — they'll be remembered for future scans.
          </p>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
        {result.merchant_name && (
          <ResultField label="Merchant" value={result.merchant_name} />
        )}
        {result.transaction_date && (
          <ResultField label="Date" value={result.transaction_date} />
        )}
        {result.total_amount != null && result.currency_code && (
          <ResultField
            label="Total"
            value={formatAmount(result.total_amount, result.currency_code)}
          />
        )}
        {result.currency_code && (
          <ResultField label="Currency" value={result.currency_code} />
        )}
      </dl>

      {result.line_items && result.line_items.length > 0 && (
        <div>
          <h4
            className="mb-2 text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            Line Items ({result.line_items.length})
          </h4>
          <div className="space-y-1">
            {result.line_items.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: "var(--background, #f9fafb)" }}
              >
                <span style={{ color: "var(--text)" }}>
                  {item.qty != null && item.qty > 1 ? `${item.qty}× ` : ""}
                  {item.name}
                </span>
                <span
                  className="font-medium"
                  style={{ color: "var(--text)" }}
                >
                  {result.currency_code
                    ? formatAmount(item.total_price, result.currency_code)
                    : item.total_price.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={() => {
            // TODO: Phase 3 will add "save as transaction" flow
            reset();
          }}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: "var(--primary)" }}
        >
          Save Transaction
        </button>
        <button
          onClick={reset}
          className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          style={{
            color: "var(--text-secondary)",
            backgroundColor: "var(--border)",
          }}
        >
          Discard
        </button>
      </div>
    </div>
  );
}

function ConfidenceBadge({ score }: { score?: number }) {
  if (score == null) return null;

  const pct = Math.round(score * 100);
  const isLow = score < LOW_CONFIDENCE_THRESHOLD;
  const isMedium = score >= LOW_CONFIDENCE_THRESHOLD && score < 0.85;

  const color = isLow
    ? "var(--error, #ef4444)"
    : isMedium
      ? "var(--warning, #f59e0b)"
      : "var(--success, #22c55e)";

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        color,
        backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
      }}
      title={`Scan confidence: ${pct}%`}
    >
      {pct}% confidence
    </span>
  );
}

function ResultField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs" style={{ color: "var(--text-muted)" }}>
        {label}
      </dt>
      <dd
        className="text-sm font-medium"
        style={{ color: "var(--text)" }}
      >
        {value}
      </dd>
    </div>
  );
}
