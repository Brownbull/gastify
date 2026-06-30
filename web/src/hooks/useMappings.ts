import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export const mappingKeys = {
  all: ["mappings"] as const,
};

/**
 * The user's learned categorization rules (`/mappings`) — merchant→store-category
 * and item→item-category mappings that auto-apply to future scans. Powers
 * Settings · Mi memoria. Short staleTime so deletions reflect promptly.
 */
export function useMappings() {
  return useQuery({
    queryKey: mappingKeys.all,
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/mappings");
      if (error || !data) {
        throw new Error("Failed to fetch mappings");
      }
      return data;
    },
    staleTime: 60 * 1000,
  });
}
