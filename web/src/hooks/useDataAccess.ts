import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export const dataAccessKeys = {
  all: ["data-access"] as const,
};

/**
 * The data-access summary (Ley 21.719 / GDPR Art 15) — transactions count,
 * consents, and account-since date. Powers the "Tus datos" summary tiles in
 * Settings · Datos y privacidad.
 */
export function useDataAccess() {
  return useQuery({
    queryKey: dataAccessKeys.all,
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/privacy/data-access");
      if (error || !data) {
        throw new Error("Failed to fetch data access summary");
      }
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
