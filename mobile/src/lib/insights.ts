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
export type SeriesGranularity = "month" | "quarter" | "year";
export type InsightsSeries = components["schemas"]["InsightsSeriesResponse"];
export type InsightsSeriesPoint = components["schemas"]["InsightsSeriesPoint"];
export type InsightsTree = components["schemas"]["InsightsTreeResponse"];
export type InsightsTreeNode = components["schemas"]["InsightsTreeNode"];

/** Current month in the `YYYY-MM` period format the insights API expects. */
export function currentPeriod(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** Shift a `YYYY-MM` period by a whole number of months (negative = earlier). */
export function shiftPeriod(period: string, deltaMonths: number): string {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(year, month - 1 + deltaMonths, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Inclusive `{ from, to }` window ending at `period`, spanning `months`
 * months. `to` never exceeds the current month.
 */
export function periodWindow(
  period: string,
  months: number,
  now: Date = new Date(),
): { from: string; to: string } {
  const today = currentPeriod(now);
  const to = period > today ? today : period;
  const from = shiftPeriod(to, -(months - 1));
  return { from, to };
}

export async function getMonthlyInsights(
  period: string,
  currency?: string,
  groupId?: string,
): Promise<MonthlyInsights> {
  const { data, error } = await apiClient.GET("/api/v1/insights/monthly", {
    params: { query: { period, currency: currency || undefined, group_id: groupId } },
  });

  if (error || !data) {
    throw new Error(readApiError(error, "Failed to load insights"));
  }

  return data;
}

export async function getInsightsSeries(
  from: string,
  to: string,
  granularity: SeriesGranularity = "month",
  currency?: string,
  groupId?: string,
): Promise<InsightsSeries> {
  const { data, error } = await apiClient.GET("/api/v1/insights/series", {
    params: {
      query: { from, to, granularity, currency: currency || undefined, group_id: groupId },
    },
  });

  if (error || !data) {
    throw new Error(readApiError(error, "Failed to load spend trend"));
  }

  return data;
}

/**
 * Full drill-down category tree for one period + dimension (D69). One fetch per
 * (period, dimension); the client expands the nested tree in memory. The store
 * dimension returns the 4-level Industry/Store-type/Item-family/Item cross-walk;
 * the item dimension returns the 2-level Family/Item tree.
 */
export async function getInsightsTree(
  period: string,
  dimension: InsightDimension,
  currency?: string,
  groupId?: string,
): Promise<InsightsTree> {
  const { data, error } = await apiClient.GET("/api/v1/insights/tree", {
    params: { query: { period, dimension, currency: currency || undefined, group_id: groupId } },
  });

  if (error || !data) {
    throw new Error(readApiError(error, "Failed to load category tree"));
  }

  return data;
}
