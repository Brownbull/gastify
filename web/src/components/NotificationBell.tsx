import { Link } from "@tanstack/react-router";
import { useUnreadNotificationCount } from "@/hooks/useNotifications";
import { useI18n } from "@/hooks/useI18n";

/**
 * The notification bell + unread-count badge. User-global (D78): the count comes
 * from GET /notifications/unread-count, independent of the active scope.
 */
export function NotificationBell() {
  const { t } = useI18n();
  const { data: count = 0 } = useUnreadNotificationCount();

  return (
    <Link
      to="/notifications"
      data-testid="notifications-bell"
      aria-label={t("notifications.title")}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-colors hover:bg-(--primary-light)"
      style={{ color: "var(--text-secondary)" }}
    >
      <span aria-hidden>🔔</span>
      {count > 0 && (
        <span
          data-testid="notifications-badge"
          className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-4 text-white"
          style={{ backgroundColor: "var(--error)" }}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
