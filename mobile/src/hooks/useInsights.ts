import { useQuery } from "@tanstack/react-query";
import {
  getInsightsSeries,
  getInsightsTree,
  getMonthlyInsights,
  type InsightDimension,
  type SeriesGranularity,
} from "../lib/insights";
import { insightsKeys } from "./insightsKeys";

export { insightsKeys };

export function useMonthlyInsights(period: string, currency?: string) {
  return useQuery({
    queryKey: insightsKeys.monthly(period, currency),
    queryFn: () => getMonthlyInsights(period, currency),
    staleTime: 60 * 1000,
  });
}

export function useInsightsSeries(
  from: string,
  to: string,
  granularity: SeriesGranularity = "month",
  currency?: string,
) {
  return useQuery({
    queryKey: insightsKeys.series(from, to, granularity, currency),
    queryFn: () => getInsightsSeries(from, to, granularity, currency),
    staleTime: 60 * 1000,
  });
}

export function useInsightsTree(
  period: string,
  dimension: InsightDimension,
  currency?: string,
) {
  return useQuery({
    queryKey: insightsKeys.tree(period, dimension, currency),
    queryFn: () => getInsightsTree(period, dimension, currency),
    staleTime: 60 * 1000,
  });
}
