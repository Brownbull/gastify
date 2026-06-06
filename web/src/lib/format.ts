const exponentCache = new Map<string, number>();

function getExponent(currency: string): number {
  const cached = exponentCache.get(currency);
  if (cached !== undefined) return cached;

  try {
    const fmt = new Intl.NumberFormat("en", { style: "currency", currency });
    const exp = fmt.resolvedOptions().minimumFractionDigits ?? 2;
    exponentCache.set(currency, exp);
    return exp;
  } catch {
    return 2;
  }
}

export function formatMinorAmount(
  minorAmount: number,
  currency: string,
): string {
  const exponent = getExponent(currency);
  const majorAmount = minorAmount / 10 ** exponent;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(majorAmount);
  } catch {
    return `${currency} ${majorAmount.toFixed(exponent)}`;
  }
}

export function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/** Format a full ISO timestamp (e.g. a notification created_at) — date + time. */
export function formatTimestamp(timestamp: string): string {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return timestamp;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
