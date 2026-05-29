import { apiClient } from "./api";
import { readApiError } from "./apiError";
import type { components } from "./api-types";

export type MonthlyInsights = components["schemas"]["MonthlyInsightsResponse"];
export type InsightCategoryRollup =
  components["schemas"]["InsightCategoryRollup"];
export type InsightGravityCenter =
  components["schemas"]["InsightGravityCenter"];
export type InsightExcludedItem =
  components["schemas"]["InsightExcludedItemSummary"];
export type InsightDimension = "transaction_category" | "item_category";

/** Current month in the `YYYY-MM` period format the insights API expects. */
export function currentPeriod(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export async function getMonthlyInsights(
  period: string,
  currency?: string,
): Promise<MonthlyInsights> {
  const { data, error } = await apiClient.GET("/api/v1/insights/monthly", {
    params: { query: { period, currency: currency || undefined } },
  });

  if (error || !data) {
    throw new Error(readApiError(error, "Failed to load insights"));
  }

  return data;
}
