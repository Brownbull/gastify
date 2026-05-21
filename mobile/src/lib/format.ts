const exponentCache = new Map<string, number>();

export function getCurrencyExponent(currency: string): number {
  const normalized = currency.toUpperCase();
  const cached = exponentCache.get(normalized);
  if (cached !== undefined) return cached;

  try {
    const fmt = new Intl.NumberFormat("en", {
      currency: normalized,
      style: "currency",
    });
    const exponent = fmt.resolvedOptions().minimumFractionDigits ?? 2;
    exponentCache.set(normalized, exponent);
    return exponent;
  } catch {
    exponentCache.set(normalized, 2);
    return 2;
  }
}

export function formatMinorAmount(
  minorAmount: number,
  currency = "CLP",
): string {
  const normalized = currency.toUpperCase();
  const exponent = getCurrencyExponent(normalized);
  const majorAmount = minorAmount / 10 ** exponent;

  try {
    return new Intl.NumberFormat(undefined, {
      currency: normalized,
      maximumFractionDigits: exponent,
      minimumFractionDigits: exponent,
      style: "currency",
    }).format(majorAmount);
  } catch {
    return `${normalized} ${majorAmount.toFixed(exponent)}`;
  }
}

export function minorToMajorInput(
  minorAmount: number,
  currency = "CLP",
): string {
  const exponent = getCurrencyExponent(currency);
  return (minorAmount / 10 ** exponent).toFixed(exponent);
}

export function majorInputToMinor(
  input: string,
  currency = "CLP",
): number | null {
  const normalized = input.trim().replace(",", ".");
  if (!normalized) return null;

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;

  const exponent = getCurrencyExponent(currency);
  return Math.round(parsed * 10 ** exponent);
}

export function formatDate(dateStr: string): string {
  try {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function formatTimestamp(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleString(undefined, {
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return timestamp;
  }
}
