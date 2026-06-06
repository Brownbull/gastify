import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import {
  deleteNotification,
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
  type NotificationFilters,
  type NotificationsPage,
} from "../lib/notifications";

/**
 * Notifications are USER-GLOBAL (D78): unlike useItems/useTransactions, the keys
 * and requests deliberately do NOT thread the active group id — the feed is read
 * under the caller's personal scope regardless of any active group, so threading
 * a scope would split the cache for no behavioural difference.
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
    queryFn: ({ pageParam }) => listNotifications({ cursor: pageParam, filters }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? (lastPage.cursor ?? undefined) : undefined,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unread(),
    queryFn: getUnreadCount,
    staleTime: 30_000,
  });
}

type Pages = InfiniteData<NotificationsPage>;
type QC = ReturnType<typeof useQueryClient>;

function patchListCaches(qc: QC, transform: (rows: Notification[]) => Notification[]) {
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
    mutationFn: (id: string) => markNotificationRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const wasUnread = cachedReadAt(queryClient, id) === null;
      const now = new Date().toISOString();
      const snapshots = patchListCaches(queryClient, (rows) =>
        rows.map((n) => (n.id === id ? { ...n, read_at: now } : n)),
      );
      const prevCount = wasUnread ? bumpUnread(queryClient, -1) : undefined;
      return { snapshots, prevCount };
    },
    onError: (_err, _id, context) => {
      context?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
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
    mutationFn: (id: string) => deleteNotification(id),
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
      context?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
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
    mutationFn: markAllNotificationsRead,
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
      context?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
      restoreUnread(queryClient, context?.prevCount);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
