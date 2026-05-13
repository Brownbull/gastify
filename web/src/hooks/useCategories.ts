import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export const categoryKeys = {
  all: ["categories"] as const,
  store: () => [...categoryKeys.all, "store"] as const,
};

export function useStoreCategories() {
  return useQuery({
    queryKey: categoryKeys.store(),
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        "/api/v1/reference/store-categories",
      );

      if (error || !data) {
        throw new Error("Failed to fetch categories");
      }

      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
