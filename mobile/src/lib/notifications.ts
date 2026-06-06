import { apiClient } from "./api";
import { readApiError } from "./apiError";
import type { components } from "./api-types";

export type Notification = components["schemas"]["NotificationRow"];
export type NotificationsPage =
  components["schemas"]["PaginatedResponse_NotificationRow_"];
export type UnreadCount = components["schemas"]["UnreadCountResponse"];

export interface NotificationFilters {
  unreadOnly?: boolean;
}

/**
 * User-global notification feed (Phase 7, D78). Unlike `listItems`, the request
 * deliberately threads NO `group_id` — notifications are account-level and read
 * under the caller's personal scope regardless of any active group.
 */
export async function listNotifications({
  cursor,
  filters = {},
  limit = 25,
}: {
  cursor?: string | null;
  filters?: NotificationFilters;
  limit?: number;
} = {}): Promise<NotificationsPage> {
  const { data, error } = await apiClient.GET("/api/v1/notifications", {
    params: {
      query: {
        cursor: cursor ?? undefined,
        limit,
        unread: filters.unreadOnly || undefined,
      },
    },
  });
  if (error || !data) {
    throw new Error(readApiError(error, "Failed to fetch notifications"));
  }
  return data;
}

export async function getUnreadCount(): Promise<number> {
  const { data, error } = await apiClient.GET("/api/v1/notifications/unread-count");
  if (error || !data) {
    throw new Error(readApiError(error, "Failed to fetch unread count"));
  }
  return data.count;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await apiClient.PATCH(
    "/api/v1/notifications/{notification_id}/read",
    { params: { path: { notification_id: id } } },
  );
  if (error) {
    throw new Error(readApiError(error, "Failed to mark notification read"));
  }
}

export async function markAllNotificationsRead(): Promise<number> {
  const { data, error } = await apiClient.POST(
    "/api/v1/notifications/mark-all-read",
    {},
  );
  if (error || !data) {
    throw new Error(readApiError(error, "Failed to mark all read"));
  }
  return data.count;
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await apiClient.DELETE(
    "/api/v1/notifications/{notification_id}",
    { params: { path: { notification_id: id } } },
  );
  if (error) {
    throw new Error(readApiError(error, "Failed to delete notification"));
  }
}
