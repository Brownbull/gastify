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
    Link: ({ children, to, params, ...rest }: { children: ReactNode } & Record<string, unknown>) => (
      <a {...rest}>{children}</a>
    ),
  };
});
vi.mock("@/hooks/useItems", () => ({ useItems: vi.fn(), itemKeys: { list: () => [] } }));
vi.mock("@/hooks/useCategories", () => ({ useStoreCategories: () => ({ data: [] }) }));

import { Route } from "./items";
import { useItems } from "@/hooks/useItems";

const mockUseItems = vi.mocked(useItems);

const ROW = {
  id: "i1",
  name: "Bread",
  qty: null,
  total_minor: 1500,
  currency: "CLP",
  item_category_id: null,
  item_category_key: null,
  store_category_id: null,
  store_category_key: null,
  transaction_id: "t1",
  transaction_date: "2026-03-01",
  transaction_time: null,
  merchant: "Lider",
  created_at: "2026-03-01T00:00:00Z",
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
    history: createMemoryHistory({ initialEntries: ["/items"] }),
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router as never} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockUseItems.mockReset();
});

describe("/items", () => {
  it("renders item rows", async () => {
    mockUseItems.mockReturnValue(infinite([ROW]));
    renderPage();
    expect(await screen.findByTestId("items-screen")).toBeInTheDocument();
    expect(screen.getAllByTestId("items-row")).toHaveLength(1);
    expect(screen.getByText("Bread")).toBeInTheDocument();
  });

  it("shows the zero-data empty state", async () => {
    mockUseItems.mockReturnValue(infinite([]));
    renderPage();
    expect(await screen.findByTestId("items-empty")).toBeInTheDocument();
  });

  it("adds + removes a filter chip", async () => {
    mockUseItems.mockReturnValue(infinite([]));
    renderPage();
    await userEvent.type(await screen.findByTestId("items-search-input"), "milk");
    const chip = await screen.findByTestId("items-chip-search");
    expect(chip).toBeInTheDocument();
    await userEvent.click(chip);
    expect(screen.queryByTestId("items-chip-search")).not.toBeInTheDocument();
    // A filtered-empty state now (search active, zero rows).
    expect(screen.getByTestId("items-empty")).toBeInTheDocument();
  });
});
