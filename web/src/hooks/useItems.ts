import { useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useUiStore } from "@/stores/uiStore";
import type { components } from "@/lib/api-types";

export type ItemListRow = components["schemas"]["ItemListRow"];

export interface ItemFilters {
  search?: string;
  merchant?: string;
  itemCategoryId?: string;
  storeCategoryId?: string;
  dateFrom?: string;
  dateTo?: string;
}

/** The active group id when the whole-app scope is a group, else personal (D70). */
function useActiveGroupId(): string | undefined {
  return useUiStore((s) =>
    s.activeScope.kind === "group" ? s.activeScope.id : undefined,
  );
}

const scopeKey = (groupId?: string) => groupId ?? "personal";

export const itemKeys = {
  all: ["items"] as const,
  lists: () => [...itemKeys.all, "list"] as const,
  list: (filters: ItemFilters, groupId?: string) =>
    [...itemKeys.lists(), scopeKey(groupId), filters] as const,
};

/**
 * Cross-transaction line-item list (Phase 6), cursor-paginated + scope-aware: the
 * active group id is threaded into BOTH the query key and the `group_id` param so
 * the list follows the global personal/group switch (a missing thread would
 * silently show personal items in group mode).
 */
export function useItems(filters: ItemFilters = {}) {
  const groupId = useActiveGroupId();
  return useInfiniteQuery({
    queryKey: itemKeys.list(filters, groupId),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET("/api/v1/items", {
        params: {
          query: {
            cursor: pageParam ?? undefined,
            limit: 50,
            search: filters.search || undefined,
            merchant: filters.merchant || undefined,
            item_category_id: filters.itemCategoryId || undefined,
            store_category_id: filters.storeCategoryId || undefined,
            date_from: filters.dateFrom || undefined,
            date_to: filters.dateTo || undefined,
            group_id: groupId,
          },
        },
      });
      if (error || !data) throw new Error("Failed to fetch items");
      return data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? (lastPage.cursor ?? undefined) : undefined,
  });
}
