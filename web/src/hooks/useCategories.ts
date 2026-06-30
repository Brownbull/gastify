import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export const categoryKeys = {
  all: ["categories"] as const,
  store: () => [...categoryKeys.all, "store"] as const,
  item: () => [...categoryKeys.all, "item"] as const,
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

/**
 * The item-category taxonomy (`/reference/item-categories`) — used to resolve a
 * learned item mapping's target_category_id into a human label + pixel icon
 * (Mi memoria · Productos).
 */
export function useItemCategories() {
  return useQuery({
    queryKey: categoryKeys.item(),
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        "/api/v1/reference/item-categories",
      );

      if (error || !data) {
        throw new Error("Failed to fetch item categories");
      }

      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
