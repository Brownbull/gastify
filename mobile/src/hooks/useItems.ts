import { useInfiniteQuery } from "@tanstack/react-query";
import { listItems, type ItemFilters } from "../lib/items";
import { activeGroupId, useScopeStore } from "../stores/scopeStore";

/** Active group id (undefined = personal) that scopes every items query (D70). */
function useActiveGroupId(): string | undefined {
  return useScopeStore((s) => activeGroupId(s.activeScope));
}

const scopeKey = (groupId?: string) => groupId ?? "personal";

export const itemKeys = {
  all: ["items"] as const,
  lists: () => [...itemKeys.all, "list"] as const,
  list: (filters: ItemFilters, groupId?: string) =>
    [...itemKeys.lists(), scopeKey(groupId), filters] as const,
};

/**
 * Cross-transaction line-item list (Phase 6 T5), cursor-paginated + scope-aware:
 * the active group id is threaded into BOTH the query key and the `group_id`
 * param (via lib/items) so the list follows the global personal/group switch — a
 * missing thread would silently show personal items in group mode. Mirrors
 * `web/src/hooks/useItems` and the mobile `useTransactions` infinite-query shape.
 */
export function useItems(filters: ItemFilters = {}) {
  const groupId = useActiveGroupId();
  return useInfiniteQuery({
    queryKey: itemKeys.list(filters, groupId),
    queryFn: ({ pageParam }) =>
      listItems({ cursor: pageParam, filters, groupId }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? (lastPage.cursor ?? undefined) : undefined,
  });
}
