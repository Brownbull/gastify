import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Button,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ScreenShell } from "../components/ScreenShell";
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from "../hooks/useNotifications";
import { formatTimestamp } from "../lib/format";
import type { Notification } from "../lib/notifications";
import type { RootStackParamList } from "../types/navigation";

type NotificationsScreenProps = Partial<
  NativeStackScreenProps<RootStackParamList, "Notifications">
>;

/** Pull a transaction deep-link out of the JSONB `data` payload, if present. */
function deepLinkTransactionId(data: Notification["data"]): string | undefined {
  if (data && typeof data === "object" && "transaction_id" in data) {
    const value = (data as Record<string, unknown>).transaction_id;
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}

export function NotificationsScreen({ navigation }: NotificationsScreenProps = {}) {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefetching,
    refetch,
  } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const remove = useDeleteNotification();
  const markAll = useMarkAllNotificationsRead();

  const notifications = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <ScreenShell>
      <FlatList
        testID="notifications-screen"
        data={notifications}
        keyExtractor={(n) => n.id}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.eyebrow}>Account</Text>
              <Text style={styles.title}>Notifications</Text>
              <Text style={styles.body}>
                Updates from your receipts and statements.
              </Text>
              {unreadCount > 0 ? (
                <Button
                  title="Mark all read"
                  testID="notifications-mark-all"
                  onPress={() => markAll.mutate()}
                  disabled={markAll.isPending}
                />
              ) : null}
            </View>

            {error ? (
              <View style={styles.errorPanel} testID="notifications-error">
                <Text style={styles.errorTitle}>Notifications could not load</Text>
                <Text style={styles.errorBody}>{error.message}</Text>
                <Button title="Retry" onPress={() => void refetch()} />
              </View>
            ) : null}

            {isLoading ? (
              <View style={styles.loadingPanel} testID="notifications-loading">
                <ActivityIndicator color="#2563eb" />
                <Text style={styles.mutedText}>Loading notifications</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.emptyPanel} testID="notifications-empty">
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.mutedText}>
                Scan a receipt or reconcile a statement to get updates here.
              </Text>
            </View>
          )
        }
        renderItem={({ index, item }) => (
          <NotificationRow
            index={index}
            notification={item}
            onPress={() => {
              if (!item.read_at) markRead.mutate(item.id);
              const transactionId = deepLinkTransactionId(item.data);
              if (transactionId) {
                navigation?.navigate("TransactionDetail", { transactionId });
              }
            }}
            onDelete={() => remove.mutate(item.id)}
          />
        )}
        ListFooterComponent={
          hasNextPage ? (
            <View style={styles.loadMore}>
              <Button
                title={isFetchingNextPage ? "Loading..." : "Load more"}
                testID="notifications-load-more"
                onPress={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
              />
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </ScreenShell>
  );
}

function NotificationRow({
  index,
  notification,
  onPress,
  onDelete,
}: {
  index: number;
  notification: Notification;
  onPress: () => void;
  onDelete: () => void;
}) {
  const isUnread = !notification.read_at;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.row, isUnread ? styles.rowUnread : null]}
      testID={`notifications-row-${index}`}
    >
      <View style={styles.rowMain}>
        <View style={styles.titleLine}>
          {isUnread ? <View style={styles.unreadDot} /> : null}
          <Text numberOfLines={1} style={styles.rowTitle}>
            {notification.title}
          </Text>
        </View>
        {notification.body ? (
          <Text numberOfLines={2} style={styles.rowBody}>
            {notification.body}
          </Text>
        ) : null}
        <Text style={styles.rowDate}>{formatTimestamp(notification.created_at)}</Text>
      </View>
      <View style={styles.rowActions}>
        <Button title="Delete" testID={`notifications-delete-${index}`} onPress={onDelete} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    color: "#475569",
    fontSize: 16,
    lineHeight: 23,
  },
  emptyPanel: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    padding: 24,
  },
  emptyTitle: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 6,
  },
  errorBody: {
    color: "#7f1d1d",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  errorPanel: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  errorTitle: {
    color: "#991b1b",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  eyebrow: {
    color: "#2563eb",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  header: {
    gap: 10,
    marginBottom: 24,
  },
  listContent: {
    paddingBottom: 24,
  },
  loadMore: {
    marginTop: 16,
  },
  loadingPanel: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 24,
  },
  mutedText: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  row: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    padding: 16,
  },
  rowActions: {
    marginLeft: 12,
  },
  rowBody: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 19,
    marginTop: 4,
  },
  rowDate: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 6,
  },
  rowMain: {
    flex: 1,
    paddingRight: 8,
  },
  rowTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800",
  },
  rowUnread: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  separator: {
    height: 10,
  },
  title: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: "800",
  },
  titleLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  unreadDot: {
    backgroundColor: "#2563eb",
    borderRadius: 999,
    height: 8,
    width: 8,
  },
});
