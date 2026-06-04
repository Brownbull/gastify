import { apiClient } from "./api";
import { readApiError } from "./apiError";
import type { components } from "./api-types";

export type ItemListRow = components["schemas"]["ItemListRow"];
export type ItemsPage = components["schemas"]["PaginatedResponse_ItemListRow_"];

export interface ItemFilters {
  search?: string;
  merchant?: string;
  itemCategoryId?: string;
  storeCategoryId?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Cross-transaction line-item list (Phase 6 T5), cursor-paginated + scope-aware:
 * `groupId` is threaded into the `group_id` param so the list follows the global
 * personal/group switch (a missing thread would silently show personal items in
 * group mode — a correctness bug). Mirrors `web/src/hooks/useItems` and the
 * mobile `listTransactions` client shape.
 */
export async function listItems({
  cursor,
  filters = {},
  limit = 25,
  groupId,
}: {
  cursor?: string | null;
  filters?: ItemFilters;
  limit?: number;
  groupId?: string;
} = {}): Promise<ItemsPage> {
  const { data, error } = await apiClient.GET("/api/v1/items", {
    params: {
      query: {
        cursor: cursor ?? undefined,
        date_from: filters.dateFrom || undefined,
        date_to: filters.dateTo || undefined,
        group_id: groupId,
        item_category_id: filters.itemCategoryId || undefined,
        limit,
        merchant: filters.merchant || undefined,
        search: filters.search || undefined,
        store_category_id: filters.storeCategoryId || undefined,
      },
    },
  });

  if (error || !data) {
    throw new Error(readApiError(error, "Failed to fetch items"));
  }

  return data;
}
