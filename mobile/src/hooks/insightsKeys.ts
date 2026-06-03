/**
 * Standalone react-query key factory for insights.
 *
 * Kept dependency-free (no lib/api import) so that `useTransactions` can
 * invalidate insights without transitively loading the api/expo-secure-store
 * chain — which would otherwise break unit tests that only exercise the
 * transaction hooks.
 */
export const insightsKeys = {
  all: ["insights"] as const,
  monthly: (period: string, currency?: string) =>
    [...insightsKeys.all, "monthly", period, currency ?? "default"] as const,
  series: (
    from: string,
    to: string,
    granularity: string,
    currency?: string,
  ) =>
    [
      ...insightsKeys.all,
      "series",
      from,
      to,
      granularity,
      currency ?? "default",
    ] as const,
};
