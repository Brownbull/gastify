import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export const locationKeys = {
  all: ["locations"] as const,
};

/**
 * Static country + city reference data for the settings location pickers
 * (`/reference/locations`). Long-cached — the dataset only changes on a deploy.
 * Returns `{ countries: [{code, name}], cities: { CODE: [...] } }`.
 */
export function useLocations() {
  return useQuery({
    queryKey: locationKeys.all,
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/reference/locations");
      if (error || !data) {
        throw new Error("Failed to fetch locations");
      }
      return data;
    },
    staleTime: 60 * 60 * 1000,
  });
}
