/**
 * Standalone react-query key factory for insights.
 *
 * Kept dependency-free (no lib/api import) so that `useTransactions` can
 * invalidate insights without transitively loading the api/expo-secure-store
 * chain — which would otherwise break unit tests that only exercise the
 * transaction hooks.
 */
const scopeKey = (groupId?: string) => groupId ?? "personal";

export const insightsKeys = {
  all: ["insights"] as const,
  monthly: (period: string, currency?: string, groupId?: string) =>
    [...insightsKeys.all, "monthly", scopeKey(groupId), period, currency ?? "default"] as const,
  series: (
    from: string,
    to: string,
    granularity: string,
    currency?: string,
    groupId?: string,
  ) =>
    [
      ...insightsKeys.all,
      "series",
      scopeKey(groupId),
      from,
      to,
      granularity,
      currency ?? "default",
    ] as const,
  tree: (period: string, dimension: string, currency?: string, groupId?: string) =>
    [
      ...insightsKeys.all,
      "tree",
      scopeKey(groupId),
      period,
      dimension,
      currency ?? "default",
    ] as const,
};
