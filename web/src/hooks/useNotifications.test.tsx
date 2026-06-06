import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/api", () => ({
  apiClient: { GET: vi.fn(), PATCH: vi.fn(), POST: vi.fn(), DELETE: vi.fn() },
}));

import { apiClient } from "@/lib/api";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useDeleteNotification,
  notificationKeys,
} from "./useNotifications";

const mockGet = vi.mocked(apiClient.GET);
const mockPatch = vi.mocked(apiClient.PATCH);
const mockDelete = vi.mocked(apiClient.DELETE);

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const page = (rows: unknown[]) =>
  ({ data: { data: rows, cursor: null, has_more: false }, error: undefined }) as never;

beforeEach(() => {
  mockGet.mockReset();
});

describe("notificationKeys", () => {
  it("separates the unread-only list key from the all list key (no cache bleed)", () => {
    const all = notificationKeys.list({});
    const unread = notificationKeys.list({ unreadOnly: true });
    expect(unread).not.toEqual(all);
  });
});

describe("useNotifications", () => {
  it("fetches the user-global feed — no group_id is ever sent (D78)", async () => {
    mockGet.mockResolvedValue(
      page([
        {
          id: "n1",
          kind: "scan_complete",
          title: "Boleta escaneada",
          body: null,
          data: null,
          read_at: null,
          created_at: "2026-06-01T12:00:00Z",
        },
      ]),
    );
    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [path, opts] = mockGet.mock.calls[0] as [
      string,
      { params: { query: Record<string, unknown> } },
    ];
    expect(path).toBe("/api/v1/notifications");
    expect("group_id" in opts.params.query).toBe(false);
    expect(opts.params.query.unread).toBeUndefined();
    expect(result.current.data?.pages[0].data[0].title).toBe("Boleta escaneada");
  });

  it("threads the unread filter into the unread query param", async () => {
    mockGet.mockResolvedValue(page([]));
    const { result } = renderHook(() => useNotifications({ unreadOnly: true }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [, opts] = mockGet.mock.calls[0] as [
      string,
      { params: { query: Record<string, unknown> } },
    ];
    expect(opts.params.query.unread).toBe(true);
  });

  it("throws when the API returns an error", async () => {
    mockGet.mockResolvedValue({ data: undefined, error: { detail: "boom" } } as never);
    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useUnreadNotificationCount", () => {
  it("reads the dedicated unread-count endpoint", async () => {
    mockGet.mockResolvedValue({ data: { count: 3 }, error: undefined } as never);
    const { result } = renderHook(() => useUnreadNotificationCount(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet.mock.calls[0][0]).toBe("/api/v1/notifications/unread-count");
    expect(result.current.data).toBe(3);
  });
});

describe("optimistic unread badge (D78 review fix)", () => {
  let qc: QueryClient;
  function sharedWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  }
  function seedList(read_at: string | null) {
    qc.setQueryData(notificationKeys.list({}), {
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

  beforeEach(() => {
    mockPatch.mockReset();
    mockDelete.mockReset();
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it("mark-read of an unread row drops the badge immediately", async () => {
    mockPatch.mockResolvedValue({ data: undefined, error: undefined } as never);
    seedList(null);
    qc.setQueryData(notificationKeys.unread(), 1);

    const { result } = renderHook(() => useMarkNotificationRead(), {
      wrapper: sharedWrapper,
    });
    result.current.mutate("n1");

    await waitFor(() =>
      expect(qc.getQueryData(notificationKeys.unread())).toBe(0),
    );
  });

  it("deleting an already-read row does not under-count the badge", async () => {
    mockDelete.mockResolvedValue({ data: undefined, error: undefined } as never);
    seedList("2026-06-01T13:00:00Z");
    qc.setQueryData(notificationKeys.unread(), 0);

    const { result } = renderHook(() => useDeleteNotification(), {
      wrapper: sharedWrapper,
    });
    result.current.mutate("n1");

    await waitFor(() => {
      const cached = qc.getQueryData(notificationKeys.list({})) as {
        pages: { data: unknown[] }[];
      };
      expect(cached.pages[0].data).toHaveLength(0);
    });
    expect(qc.getQueryData(notificationKeys.unread())).toBe(0);
  });
});
