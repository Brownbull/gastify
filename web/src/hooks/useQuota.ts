import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { components } from "@/lib/api-types";

export type QuotaResponse = components["schemas"]["QuotaResponse"];

/** D96 tier/quota snapshot — drives "X of Y this month" lines and gates
 * premium-only UI (batch, statements) when `enforced` is true. */
export function useQuota() {
  return useQuery({
    queryKey: ["billing", "quota"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/billing/quota");
      if (error || !data) throw new Error("Failed to load quota");
      return data;
    },
    staleTime: 60 * 1000,
  });
}
