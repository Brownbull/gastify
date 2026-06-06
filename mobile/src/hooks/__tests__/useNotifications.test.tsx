import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import {
  notificationKeys,
  useDeleteNotification,
  useMarkNotificationRead,
  useNotifications,
} from "../useNotifications";

jest.mock("../../lib/notifications", () => ({
  listNotifications: jest.fn(),
  getUnreadCount: jest.fn(),
  markNotificationRead: jest.fn(),
  markAllNotificationsRead: jest.fn(),
  deleteNotification: jest.fn(),
}));

import {
  deleteNotification,
  listNotifications,
  markNotificationRead,
} from "../../lib/notifications";

const mockList = listNotifications as jest.Mock;
const mockMarkRead = markNotificationRead as jest.Mock;
const mockDelete = deleteNotification as jest.Mock;

function seedList(read_at: string | null) {
  queryClient.setQueryData(notificationKeys.list({}), {
    pageParams: [null],
    pages: [
      {
        cursor: null,
        has_more: false,
        data: [
          {
            id: "n1",
            kind: "scan_complete",
            title: "Boleta escaneada",
            body: null,
            data: null,
            read_at,
            created_at: "2026-06-01T12:00:00Z",
          },
        ],
      },
    ],
  });
}

const page = { data: [], cursor: null, has_more: false };

// gcTime: Infinity stops react-query scheduling a GC timer that keeps jest alive.
let queryClient: QueryClient;

beforeEach(() => {
  jest.clearAllMocks();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
});

afterEach(() => {
  queryClient.clear();
  queryClient.unmount();
});

function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useNotifications", () => {
  it("fetches the user-global feed (cursor + filters, no group id)", async () => {
    mockList.mockResolvedValue(page);
    const filters = { unreadOnly: true };

    const { result } = renderHook(() => useNotifications(filters), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockList).toHaveBeenCalledWith({ cursor: null, filters });
    expect(queryClient.getQueryData(notificationKeys.list(filters))).toBeTruthy();
  });
});

describe("useMarkNotificationRead", () => {
  it("optimistically stamps read_at AND decrements the unread badge (unread row)", async () => {
    mockMarkRead.mockResolvedValue(undefined);
    seedList(null);
    queryClient.setQueryData(notificationKeys.unread(), 1);

    const { result } = renderHook(() => useMarkNotificationRead(), {
      wrapper: Wrapper,
    });
    result.current.mutate("n1");

    await waitFor(() => {
      const cached = queryClient.getQueryData(notificationKeys.list({})) as {
        pages: { data: { id: string; read_at: string | null }[] }[];
      };
      expect(cached.pages[0].data[0].read_at).not.toBeNull();
    });
    // The bell badge drops immediately, not just after the round-trip (D78 review).
    expect(queryClient.getQueryData(notificationKeys.unread())).toBe(0);
    expect(mockMarkRead).toHaveBeenCalledWith("n1");
  });
});

describe("useDeleteNotification", () => {
  it("deleting an ALREADY-READ row does not under-count the unread badge", async () => {
    mockDelete.mockResolvedValue(undefined);
    seedList("2026-06-01T13:00:00Z"); // already read
    queryClient.setQueryData(notificationKeys.unread(), 0);

    const { result } = renderHook(() => useDeleteNotification(), {
      wrapper: Wrapper,
    });
    result.current.mutate("n1");

    await waitFor(() => {
      const cached = queryClient.getQueryData(notificationKeys.list({})) as {
        pages: { data: unknown[] }[];
      };
      expect(cached.pages[0].data).toHaveLength(0);
    });
    // Read row removed → unread count must stay 0 (no blanket decrement).
    expect(queryClient.getQueryData(notificationKeys.unread())).toBe(0);
  });
});
