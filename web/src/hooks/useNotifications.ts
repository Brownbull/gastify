import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { components } from "@/lib/api-types";

export type NotificationRow = components["schemas"]["NotificationRow"];
type NotificationsPage = components["schemas"]["PaginatedResponse_NotificationRow_"];

export interface NotificationFilters {
  unreadOnly?: boolean;
}

/**
 * Notifications are USER-GLOBAL (D78): a bell independent of the active
 * personal/group scope. Unlike useItems/useTransactions, the query keys and the
 * request deliberately do NOT thread the active group id — the backend reads the
 * feed under the caller's personal scope regardless of any active group, so
 * threading a scope would split the cache for no behavioural difference.
 */
export const notificationKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationKeys.all, "list"] as const,
  list: (filters: NotificationFilters) =>
    [...notificationKeys.lists(), filters] as const,
  unread: () => [...notificationKeys.all, "unread-count"] as const,
};

export function useNotifications(filters: NotificationFilters = {}) {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(filters),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET("/api/v1/notifications", {
        params: {
          query: {
            cursor: pageParam ?? undefined,
            limit: 50,
            unread: filters.unreadOnly || undefined,
          },
        },
      });
      if (error || !data) throw new Error("Failed to fetch notifications");
      return data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? (lastPage.cursor ?? undefined) : undefined,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationKeys.unread(),
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        "/api/v1/notifications/unread-count",
      );
      if (error || !data) throw new Error("Failed to fetch unread count");
      return data.count;
    },
  });
}

type Pages = InfiniteData<NotificationsPage, string | null>;
type QC = ReturnType<typeof useQueryClient>;

/** Apply a per-row transform across every cached notification list page. */
function patchListCaches(qc: QC, transform: (rows: NotificationRow[]) => NotificationRow[]) {
  const snapshots = qc.getQueriesData<Pages>({ queryKey: notificationKeys.lists() });
  for (const [key, previous] of snapshots) {
    if (!previous) continue;
    qc.setQueryData<Pages>(key, {
      ...previous,
      pages: previous.pages.map((page) => ({ ...page, data: transform(page.data) })),
    });
  }
  return snapshots;
}

/** The cached read_at for a notification id (undefined if not in any list cache). */
function cachedReadAt(qc: QC, id: string): string | null | undefined {
  for (const [, previous] of qc.getQueriesData<Pages>({
    queryKey: notificationKeys.lists(),
  })) {
    for (const page of previous?.pages ?? []) {
      const row = page.data.find((n) => n.id === id);
      if (row) return row.read_at;
    }
  }
  return undefined;
}

/** Optimistically shift the unread-count cache; returns the prior value to restore. */
function bumpUnread(qc: QC, delta: number): number | undefined {
  const previous = qc.getQueryData<number>(notificationKeys.unread());
  qc.setQueryData<number>(notificationKeys.unread(), (c = 0) => Math.max(0, c + delta));
  return previous;
}

function restoreUnread(qc: QC, prevCount: number | undefined) {
  if (prevCount !== undefined) {
    qc.setQueryData(notificationKeys.unread(), prevCount);
  }
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.PATCH(
        "/api/v1/notifications/{notification_id}/read",
        { params: { path: { notification_id: id } } },
      );
      if (error) throw new Error("Failed to mark notification read");
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const wasUnread = cachedReadAt(queryClient, id) === null;
      const now = new Date().toISOString();
      const snapshots = patchListCaches(queryClient, (rows) =>
        rows.map((n) => (n.id === id ? { ...n, read_at: now } : n)),
      );
      // Only an unread row moves the badge.
      const prevCount = wasUnread ? bumpUnread(queryClient, -1) : undefined;
      return { snapshots, prevCount };
    },
    onError: (_err, _id, context) => {
      for (const [key, previous] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, previous);
      }
      restoreUnread(queryClient, context?.prevCount);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE(
        "/api/v1/notifications/{notification_id}",
        { params: { path: { notification_id: id } } },
      );
      if (error) throw new Error("Failed to delete notification");
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const wasUnread = cachedReadAt(queryClient, id) === null;
      const snapshots = patchListCaches(queryClient, (rows) =>
        rows.filter((n) => n.id !== id),
      );
      // Deleting an unread row drops the badge; deleting an already-read one must not.
      const prevCount = wasUnread ? bumpUnread(queryClient, -1) : undefined;
      return { snapshots, prevCount };
    },
    onError: (_err, _id, context) => {
      for (const [key, previous] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, previous);
      }
      restoreUnread(queryClient, context?.prevCount);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await apiClient.POST(
        "/api/v1/notifications/mark-all-read",
        {},
      );
      if (error || !data) throw new Error("Failed to mark all read");
      return data.count;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const now = new Date().toISOString();
      const snapshots = patchListCaches(queryClient, (rows) =>
        rows.map((n) => ({ ...n, read_at: n.read_at ?? now })),
      );
      const prevCount = queryClient.getQueryData<number>(notificationKeys.unread());
      queryClient.setQueryData<number>(notificationKeys.unread(), 0);
      return { snapshots, prevCount };
    },
    onError: (_err, _vars, context) => {
      for (const [key, previous] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, previous);
      }
      restoreUnread(queryClient, context?.prevCount);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
