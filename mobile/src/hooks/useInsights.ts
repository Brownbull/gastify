import { useQuery } from "@tanstack/react-query";
import {
  getInsightsSeries,
  getInsightsTree,
  getMonthlyInsights,
  type InsightDimension,
  type SeriesGranularity,
} from "../lib/insights";
import { activeGroupId, useScopeStore } from "../stores/scopeStore";
import { insightsKeys } from "./insightsKeys";

export { insightsKeys };

/** Active group id (undefined = personal) that scopes every insights query. */
function useActiveGroupId(): string | undefined {
  return useScopeStore((s) => activeGroupId(s.activeScope));
}

export function useMonthlyInsights(period: string, currency?: string) {
  const groupId = useActiveGroupId();
  return useQuery({
    queryKey: insightsKeys.monthly(period, currency, groupId),
    queryFn: () => getMonthlyInsights(period, currency, groupId),
    staleTime: 60 * 1000,
  });
}

export function useInsightsSeries(
  from: string,
  to: string,
  granularity: SeriesGranularity = "month",
  currency?: string,
) {
  const groupId = useActiveGroupId();
  return useQuery({
    queryKey: insightsKeys.series(from, to, granularity, currency, groupId),
    queryFn: () => getInsightsSeries(from, to, granularity, currency, groupId),
    staleTime: 60 * 1000,
  });
}

export function useInsightsTree(
  period: string,
  dimension: InsightDimension,
  currency?: string,
) {
  const groupId = useActiveGroupId();
  return useQuery({
    queryKey: insightsKeys.tree(period, dimension, currency, groupId),
    queryFn: () => getInsightsTree(period, dimension, currency, groupId),
    staleTime: 60 * 1000,
  });
}
