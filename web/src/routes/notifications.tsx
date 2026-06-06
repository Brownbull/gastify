import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useDeleteNotification,
  useMarkAllNotificationsRead,
  type NotificationRow,
} from "@/hooks/useNotifications";
import { useI18n } from "@/hooks/useI18n";
import { formatTimestamp } from "@/lib/format";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
});

/** Pull a transaction deep-link out of the JSONB `data` payload, if present. */
function deepLinkTransactionId(data: NotificationRow["data"]): string | undefined {
  if (data && typeof data === "object" && "transaction_id" in data) {
    const value = (data as Record<string, unknown>).transaction_id;
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}

function NotificationsPage() {
  const { t } = useI18n();
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error } =
    useNotifications();
  const { data: unreadCount } = useUnreadNotificationCount();
  const markAll = useMarkAllNotificationsRead();

  const notifications = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div className="space-y-6" data-testid="notifications-screen">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text)" }}>
            {t("notifications.title")}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            {t("notifications.subtitle")}
          </p>
        </div>
        {(unreadCount ?? 0) > 0 && (
          <button
            data-testid="notifications-mark-all"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            style={{ color: "var(--primary)", backgroundColor: "var(--primary-light)" }}
          >
            {t("notifications.markAll")}
          </button>
        )}
      </div>

      {error && (
        <div
          className="rounded-lg border p-4"
          style={{
            borderColor: "var(--error)",
            backgroundColor: "color-mix(in srgb, var(--error) 10%, transparent)",
          }}
          role="alert"
        >
          <p className="text-sm font-medium" style={{ color: "var(--error)" }}>
            {t("notifications.loadError")}
          </p>
        </div>
      )}

      {isLoading ? (
        <NotificationsSkeleton />
      ) : notifications.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <ul className="space-y-2">
            {notifications.map((n) => (
              <NotificationCard key={n.id} notification={n} />
            ))}
          </ul>
          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <button
                data-testid="notifications-load-more"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
                className="rounded-lg px-6 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                style={{ color: "var(--primary)", backgroundColor: "var(--primary-light)" }}
              >
                {isFetchingNextPage ? t("notifications.loading") : t("notifications.loadMore")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NotificationCard({ notification }: { notification: NotificationRow }) {
  const { t } = useI18n();
  const markRead = useMarkNotificationRead();
  const remove = useDeleteNotification();
  const isUnread = !notification.read_at;
  const transactionId = deepLinkTransactionId(notification.data);

  const titleNode = transactionId ? (
    <Link
      to="/transactions/$transactionId"
      params={{ transactionId }}
      onClick={() => isUnread && markRead.mutate(notification.id)}
      className="font-medium hover:underline"
      style={{ color: "var(--text)" }}
    >
      {notification.title}
    </Link>
  ) : (
    <span className="font-medium" style={{ color: "var(--text)" }}>
      {notification.title}
    </span>
  );

  return (
    <li
      data-testid="notifications-row"
      data-unread={isUnread ? "true" : "false"}
      className="flex items-start justify-between gap-3 rounded-lg border p-3"
      style={{
        backgroundColor: isUnread ? "var(--primary-light)" : "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {isUnread && (
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: "var(--primary)" }}
            />
          )}
          {titleNode}
        </div>
        {notification.body && (
          <p className="mt-0.5 truncate text-sm" style={{ color: "var(--text-secondary)" }}>
            {notification.body}
          </p>
        )}
        <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
          {formatTimestamp(notification.created_at)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isUnread && (
          <button
            data-testid="notifications-mark-read"
            onClick={() => markRead.mutate(notification.id)}
            className="text-xs font-medium"
            style={{ color: "var(--primary)" }}
          >
            {t("notifications.markRead")}
          </button>
        )}
        <button
          data-testid="notifications-delete"
          onClick={() => remove.mutate(notification.id)}
          aria-label={t("notifications.delete")}
          className="text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          ×
        </button>
      </div>
    </li>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading notifications">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-lg border p-3"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div
            className="h-4 w-48 animate-pulse rounded"
            style={{ backgroundColor: "var(--border)" }}
          />
          <div
            className="h-4 w-16 animate-pulse rounded"
            style={{ backgroundColor: "var(--border)" }}
          />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  const { t } = useI18n();
  return (
    <div
      className="rounded-lg border p-12 text-center"
      data-testid="notifications-empty"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
    >
      <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
        {t("notifications.empty")}
      </p>
    </div>
  );
}
