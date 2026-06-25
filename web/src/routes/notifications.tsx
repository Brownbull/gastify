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
import { Button } from "@/components/ui/Button";
import { IconTile } from "@/components/ui/IconTile";
import { EmptyState } from "@/components/ui/EmptyState";

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
    <div className="space-y-gt-16" data-testid="notifications-screen">
      <div className="flex items-start justify-between gap-gt-12">
        <div>
          <h1 className="font-gt-display text-gt-4xl font-extrabold text-gt-ink">
            {t("notifications.title")}
          </h1>
          <p className="mt-gt-2 text-gt-sm font-medium text-gt-ink-2">{t("notifications.subtitle")}</p>
        </div>
        {(unreadCount ?? 0) > 0 && (
          <Button
            variant="ghost"
            size="sm"
            data-testid="notifications-mark-all"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="text-gt-primary"
          >
            {t("notifications.markAll")}
          </Button>
        )}
      </div>

      {error && (
        <div
          className="rounded-gt-xl border-2 border-gt-error bg-gt-error/5 px-gt-16 py-gt-12"
          role="alert"
        >
          <p className="text-gt-sm font-bold text-gt-error">{t("notifications.loadError")}</p>
        </div>
      )}

      {isLoading ? (
        <NotificationsSkeleton />
      ) : notifications.length === 0 ? (
        <div data-testid="notifications-empty">
          <EmptyState iconName="nav-alerts" title={t("notifications.empty")} />
        </div>
      ) : (
        <>
          <ul className="flex flex-col divide-y-2 divide-gt-line overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm">
            {notifications.map((n) => (
              <NotificationCard key={n.id} notification={n} />
            ))}
          </ul>
          {hasNextPage && (
            <div className="flex justify-center pt-gt-2">
              <Button
                variant="secondary"
                size="sm"
                data-testid="notifications-load-more"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? t("notifications.loading") : t("notifications.loadMore")}
              </Button>
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

  const titleClass = `truncate font-gt-display text-gt-md ${
    isUnread ? "font-extrabold text-gt-ink" : "font-bold text-gt-ink-2"
  }`;
  const titleNode = transactionId ? (
    <Link
      to="/transactions/$transactionId"
      params={{ transactionId }}
      onClick={() => isUnread && markRead.mutate(notification.id)}
      className={`${titleClass} hover:underline`}
    >
      {notification.title}
    </Link>
  ) : (
    <span className={titleClass}>{notification.title}</span>
  );

  return (
    <li
      data-testid="notifications-row"
      data-unread={isUnread ? "true" : "false"}
      className={`flex items-start gap-gt-10 px-gt-12 py-gt-12 ${isUnread ? "bg-gt-primary-soft" : ""}`}
    >
      <IconTile icon="nav-alerts" size="md" />
      <div className="flex min-w-0 flex-1 flex-col gap-gt-2">
        <div className="flex items-center gap-gt-6">
          {isUnread && (
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-gt-pill bg-gt-primary" />
          )}
          {titleNode}
        </div>
        {notification.body && (
          <p className="truncate text-gt-sm font-medium text-gt-ink-2">{notification.body}</p>
        )}
        <p className="text-gt-xs font-bold text-gt-ink-3">
          {formatTimestamp(notification.created_at)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-gt-8">
        {isUnread && (
          <button
            type="button"
            data-testid="notifications-mark-read"
            onClick={() => markRead.mutate(notification.id)}
            className="text-gt-xs font-extrabold text-gt-primary"
          >
            {t("notifications.markRead")}
          </button>
        )}
        <button
          type="button"
          data-testid="notifications-delete"
          onClick={() => remove.mutate(notification.id)}
          aria-label={t("notifications.delete")}
          className="grid h-7 w-7 place-items-center rounded-gt-md text-gt-ink-3 transition hover:bg-gt-bg-3 hover:text-gt-ink"
        >
          ×
        </button>
      </div>
    </li>
  );
}

function NotificationsSkeleton() {
  return (
    <ul
      className="flex flex-col divide-y-2 divide-gt-line overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm"
      aria-busy="true"
      aria-label="Loading notifications"
    >
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="flex items-center gap-gt-10 px-gt-12 py-gt-12">
          <span className="h-11 w-11 shrink-0 animate-pulse rounded-gt-lg bg-gt-bg-3" />
          <span className="h-4 w-48 animate-pulse rounded-gt-md bg-gt-bg-3" />
        </li>
      ))}
    </ul>
  );
}
