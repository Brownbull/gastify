import { useQuery } from "@tanstack/react-query";
import { listItemCategories, listStoreCategories } from "../lib/categories";

export const categoryKeys = {
  all: ["categories"] as const,
  item: () => [...categoryKeys.all, "item"] as const,
  store: () => [...categoryKeys.all, "store"] as const,
};

export function useStoreCategories() {
  return useQuery({
    queryKey: categoryKeys.store(),
    queryFn: listStoreCategories,
    staleTime: 5 * 60 * 1000,
  });
}

export function useItemCategories() {
  return useQuery({
    queryKey: categoryKeys.item(),
    queryFn: listItemCategories,
    staleTime: 5 * 60 * 1000,
  });
}
