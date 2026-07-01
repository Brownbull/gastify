import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter, createRootRoute, createMemoryHistory } from "@tanstack/react-router";
import { Route } from "./index";

vi.mock("@/lib/api", () => ({
  apiClient: { GET: vi.fn() },
}));

import { apiClient } from "@/lib/api";

const mockGet = vi.mocked(apiClient.GET);

// /insights/monthly backs the hero total + the gravity ("centros de gravedad") card.
const monthlyPayload = {
  schema_version: "monthly-insights.v1",
  period_start: "2026-03-01",
  period_end: "2026-03-31",
  currency: "CLP",
  total_spend_minor: 276_500,
  transaction_count: 7,
  item_count: 12,
  top_transaction_categories: [],
  top_item_categories: [],
  gravity_centers: [
    {
      dimension: "transaction_category",
      category_key: "Supermarket",
      category_level: 2,
      parent_key: "SupermarketsIndustry",
      parent_level: 1,
      label: "Supermarket",
      direction: "growth",
      current_total_minor: 180_000,
      baseline_average_minor: 120_000,
      ratio: "1.50",
      threshold: "1.20",
      explanation: "Up 50% vs your 3-month baseline.",
    },
  ],
  excluded_items: [],
};

// /insights/series backs the 6-month trend card (and the hero's month-over-month delta).
const seriesPayload = {
  schema_version: "insights-series.v1",
  granularity: "month",
  currency: "CLP",
  period_start: "2026-01-01",
  period_end: "2026-03-31",
  points: [
    { period: "2026-01", period_start: "2026-01-01", period_end: "2026-01-31", total_spend_minor: 200_000, transaction_count: 5, voided: false },
    { period: "2026-02", period_start: "2026-02-01", period_end: "2026-02-28", total_spend_minor: 350_000, transaction_count: 8, voided: false },
    { period: "2026-03", period_start: "2026-03-01", period_end: "2026-03-31", total_spend_minor: 276_500, transaction_count: 7, voided: false },
  ],
};

// /transactions backs the "recientes" feed (first page, newest first).
const transactionsPayload = {
  data: [
    { id: "t1", transaction_date: "2026-03-20", merchant: "Lider", total_minor: 45_000, currency: "CLP", item_count: 3, scan_review_level: "none", recurrence_kind: "none", recurrence_source: "none", is_shared: false, statement_matched: false, created_at: "2026-03-20T00:00:00Z", updated_at: "2026-03-20T00:00:00Z" },
    { id: "t2", transaction_date: "2026-03-18", merchant: "Copec", total_minor: 30_000, currency: "CLP", item_count: 1, scan_review_level: "none", recurrence_kind: "none", recurrence_source: "none", is_shared: false, statement_matched: false, created_at: "2026-03-18T00:00:00Z", updated_at: "2026-03-18T00:00:00Z" },
  ],
  cursor: null,
  has_more: false,
};

const profilePayload = { display_name: "Gabriel Test", default_currency: "CLP" };

function mockApi(monthly: unknown = monthlyPayload) {
  mockGet.mockImplementation(((url: string) => {
    if (typeof url === "string") {
      if (url.includes("/insights/series")) return Promise.resolve({ data: seriesPayload, error: undefined });
      if (url.includes("/transactions")) return Promise.resolve({ data: transactionsPayload, error: undefined });
      if (url.includes("/privacy/profile")) return Promise.resolve({ data: profilePayload, error: undefined });
    }
    return Promise.resolve({ data: monthly, error: undefined });
  }) as never);
}

// The dashboard renders <Link> elements, so it needs a router context.
function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const rootRoute = createRootRoute({
    component: Route.options.component as () => JSX.Element,
  });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router as never} />
    </QueryClientProvider>,
  );
}

describe("DashboardPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the spend hero, gravity centers, and recent transactions", async () => {
    mockApi();
    renderPage();

    // Hero total from /insights/monthly.
    const hero = await screen.findByTestId("home-hero");
    expect(hero).toHaveTextContent(/276[.,]?500/);
    // Greeting uses the profile first name (resolves async).
    expect(await screen.findByText(/Gabriel/)).toBeInTheDocument();
    // Gravity card: the L2 category, its multiplier, and its total.
    const gravity = screen.getByTestId("home-gravity");
    expect(gravity).toHaveTextContent("Supermarket");
    expect(gravity).toHaveTextContent("1.5×");
    // Recent feed from /transactions.
    const recent = screen.getByTestId("home-recent");
    expect(recent).toHaveTextContent("Lider");
    expect(recent).toHaveTextContent("Copec");
  });

  it("shows an empty state when there are no transactions", async () => {
    mockApi({ ...monthlyPayload, transaction_count: 0 });
    renderPage();

    expect(await screen.findByTestId("dashboard-empty")).toBeInTheDocument();
  });

  it("shows the void notice (not the generic empty state) for a voided month", async () => {
    mockApi({
      ...monthlyPayload,
      transaction_count: 0,
      total_spend_minor: 0,
      voided: true,
      void_reason: "member_removed_data",
    });
    renderPage();

    const notice = await screen.findByTestId("dashboard-voided");
    expect(notice).toHaveTextContent("A departed member removed their shared data");
    expect(screen.queryByTestId("dashboard-empty")).not.toBeInTheDocument();
  });

  it("shows an error state when the request fails", async () => {
    mockGet.mockImplementation((() =>
      Promise.resolve({ data: undefined, error: { detail: "x" } })) as never);
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load your data.");
  });
});
