import { useQuery } from "@tanstack/react-query";
import { getMonthlyInsights } from "../lib/insights";
import { insightsKeys } from "./insightsKeys";

export { insightsKeys };

export function useMonthlyInsights(period: string, currency?: string) {
  return useQuery({
    queryKey: insightsKeys.monthly(period, currency),
    queryFn: () => getMonthlyInsights(period, currency),
    staleTime: 60 * 1000,
  });
}
