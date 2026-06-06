import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createRouter,
  createRootRoute,
  createMemoryHistory,
} from "@tanstack/react-router";

// Plain-anchor Link so the row's typed `to="/transactions/$transactionId"` needs no
// route registration in the test router.
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({ children, ...rest }: { children: ReactNode } & Record<string, unknown>) => (
      <a {...rest}>{children}</a>
    ),
  };
});

const mockMarkRead = vi.fn();
const mockDelete = vi.fn();
const mockMarkAll = vi.fn();

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: vi.fn(),
  useUnreadNotificationCount: () => ({ data: 1 }),
  useMarkNotificationRead: () => ({ mutate: mockMarkRead, isPending: false }),
  useDeleteNotification: () => ({ mutate: mockDelete, isPending: false }),
  useMarkAllNotificationsRead: () => ({ mutate: mockMarkAll, isPending: false }),
}));

import { Route } from "./notifications";
import { useNotifications } from "@/hooks/useNotifications";

const mockUseNotifications = vi.mocked(useNotifications);

const ROW = {
  id: "n1",
  kind: "scan_complete",
  title: "Boleta escaneada",
  body: "Tu boleta se guardó.",
  data: null,
  read_at: null,
  created_at: "2026-06-01T12:00:00Z",
};

function infinite(rows: unknown[]) {
  return {
    data: { pages: [{ data: rows, cursor: null, has_more: false }] },
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    error: null,
  } as never;
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({
    component: Route.options.component as () => JSX.Element,
  });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ["/notifications"] }),
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router as never} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockUseNotifications.mockReset();
  mockMarkRead.mockReset();
  mockDelete.mockReset();
  mockMarkAll.mockReset();
});

describe("/notifications", () => {
  it("renders notification rows with an unread marker", async () => {
    mockUseNotifications.mockReturnValue(infinite([ROW]));
    renderPage();
    expect(await screen.findByTestId("notifications-screen")).toBeInTheDocument();
    expect(screen.getAllByTestId("notifications-row")).toHaveLength(1);
    expect(screen.getByText("Boleta escaneada")).toBeInTheDocument();
    expect(screen.getByTestId("notifications-row")).toHaveAttribute("data-unread", "true");
  });

  it("shows the empty state when there are no notifications", async () => {
    mockUseNotifications.mockReturnValue(infinite([]));
    renderPage();
    expect(await screen.findByTestId("notifications-empty")).toBeInTheDocument();
  });

  it("fires mark-read on the row's mark-read button", async () => {
    mockUseNotifications.mockReturnValue(infinite([ROW]));
    renderPage();
    await userEvent.click(await screen.findByTestId("notifications-mark-read"));
    expect(mockMarkRead).toHaveBeenCalledWith("n1");
  });

  it("fires delete on the row's delete button", async () => {
    mockUseNotifications.mockReturnValue(infinite([ROW]));
    renderPage();
    await userEvent.click(await screen.findByTestId("notifications-delete"));
    expect(mockDelete).toHaveBeenCalledWith("n1");
  });

  it("fires mark-all when there are unread notifications", async () => {
    mockUseNotifications.mockReturnValue(infinite([ROW]));
    renderPage();
    await userEvent.click(await screen.findByTestId("notifications-mark-all"));
    expect(mockMarkAll).toHaveBeenCalled();
  });
});
