import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export type InsightDimension = "transaction_category" | "item_category";

export const insightsKeys = {
  all: ["insights"] as const,
  monthly: (period: string, currency?: string) =>
    [...insightsKeys.all, "monthly", period, currency ?? "default"] as const,
};

/** Current month in the `YYYY-MM` period format the insights API expects. */
export function currentPeriod(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
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
