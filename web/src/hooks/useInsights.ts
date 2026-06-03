import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export type InsightDimension = "transaction_category" | "item_category";
export type SeriesGranularity = "month" | "quarter" | "year";

export const insightsKeys = {
  all: ["insights"] as const,
  monthly: (period: string, currency?: string) =>
    [...insightsKeys.all, "monthly", period, currency ?? "default"] as const,
  series: (
    from: string,
    to: string,
    granularity: SeriesGranularity,
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

/** Current month in the `YYYY-MM` period format the insights API expects. */
export function currentPeriod(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** Shift a `YYYY-MM` period by a whole number of months (negative = earlier). */
export function shiftPeriod(period: string, deltaMonths: number): string {
  const [yearText, monthText] = period.split("-");
  const monthIndex = Number(yearText) * 12 + (Number(monthText) - 1) + deltaMonths;
  const year = Math.floor(monthIndex / 12);
  const month = (monthIndex % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

/**
 * Inclusive `{ from, to }` window ending at `period`, spanning `months` months
 * (e.g. months=6 → the period plus the 5 prior). `to` never exceeds the
 * current month, mirroring the legacy "next clamped to today" rule.
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

export function useMonthlyInsights(period: string, currency?: string) {
  return useQuery({
    queryKey: insightsKeys.monthly(period, currency),
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/insights/monthly", {
        params: { query: { period, currency: currency ?? undefined } },
      });

      if (error || !data) {
        throw new Error("Failed to load insights");
      }

      return data;
    },
    staleTime: 60 * 1000,
  });
}

/** Multi-period spend series for the Trends bar/line chart (D68). */
export function useInsightsSeries(
  from: string,
  to: string,
  granularity: SeriesGranularity = "month",
  currency?: string,
) {
  return useQuery({
    queryKey: insightsKeys.series(from, to, granularity, currency),
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/insights/series", {
        params: { query: { from, to, granularity, currency: currency ?? undefined } },
      });

      if (error || !data) {
        throw new Error("Failed to load spend trend");
      }

      return data;
    },
    staleTime: 60 * 1000,
  });
}
