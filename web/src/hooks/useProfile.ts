import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export const profileKeys = {
  all: ["profile"] as const,
};

/**
 * The settings-screen profile read — default currency / country / city, date
 * format, locale (`/privacy/profile`). Cached; used wherever the home location is
 * needed (e.g. the foreign-country indicator on the transaction detail).
 */
export function useProfile() {
  return useQuery({
    queryKey: profileKeys.all,
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/privacy/profile");
      if (error || !data) {
        throw new Error("Failed to fetch profile");
      }
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
