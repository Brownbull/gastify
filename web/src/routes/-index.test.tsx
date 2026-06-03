import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter, createRootRoute, createMemoryHistory } from "@tanstack/react-router";
import { Route } from "./index";

vi.mock("@/lib/api", () => ({
  apiClient: { GET: vi.fn() },
}));

import { apiClient } from "@/lib/api";

const mockGet = vi.mocked(apiClient.GET);

// Monthly payload backs SummaryStats + "what's shifting" gravity; the donut is
// now tree-backed, so /monthly's top_* lists are unused by the dashboard.
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
  excluded_items: [
    { flag_kind: "special_case", total_minor: 35_000, currency: "CLP", item_count: 1 },
  ],
};

interface TreeNode {
  key: string;
  label: string;
  parent_key: string | null;
  level: number;
  total_minor: number;
  currency: string;
  share_of_total_percent: string;
  transaction_count: number;
  item_count: number;
  excluded_total_minor: number;
  children: TreeNode[];
}

function node(
  key: string,
  label: string,
  parentKey: string | null,
  level: number,
  totalMinor: number,
  share: string,
  children: TreeNode[] = [],
): TreeNode {
  return {
    key,
    label,
    parent_key: parentKey,
    level,
    total_minor: totalMinor,
    currency: "CLP",
    share_of_total_percent: share,
    transaction_count: 1,
    item_count: children.length || 1,
    excluded_total_minor: 0,
    children,
  };
}

// Two roots (of five) so a non-drillable "Other" remainder is also exercised.
const storeTree = {
  schema_version: "insights-tree.v1",
  dimension: "transaction_category",
  period_start: "2026-03-01",
  period_end: "2026-03-31",
  currency: "CLP",
  total_spend_minor: 276_500,
  transaction_count: 7,
  item_count: 8,
  roots: [
    node("SupermarketsIndustry", "Supermarkets", null, 1, 180_000, "65.10", [
      node("Supermarket", "Supermarket", "SupermarketsIndustry", 2, 180_000, "65.10", [
        node("FreshFood", "Fresh Food", "Supermarket", 3, 90_000, "32.55", [
          node("MeatSeafood", "Meat & Seafood", "FreshFood", 4, 60_000, "21.70"),
          node("Produce", "Produce", "FreshFood", 4, 30_000, "10.85"),
        ]),
        node("PackagedFood", "Packaged Food", "Supermarket", 3, 90_000, "32.55", [
          node("Snacks", "Snacks", "PackagedFood", 4, 50_000, "18.08"),
          node("Pantry", "Pantry", "PackagedFood", 4, 40_000, "14.47"),
        ]),
      ]),
    ]),
    node("RestaurantsIndustry", "Restaurants", null, 1, 45_000, "16.27", [
      node("Restaurant", "Restaurant", "RestaurantsIndustry", 2, 45_000, "16.27", [
        node("PreparedMeals", "Prepared Food", "Restaurant", 3, 45_000, "16.27", [
          node("PreparedFood", "Prepared Food", "PreparedMeals", 4, 45_000, "16.27"),
        ]),
      ]),
    ]),
  ],
};

const itemTree = {
  schema_version: "insights-tree.v1",
  dimension: "item_category",
  period_start: "2026-03-01",
  period_end: "2026-03-31",
  currency: "CLP",
  total_spend_minor: 276_500,
  transaction_count: 7,
  item_count: 8,
  roots: [
    node("FreshFood", "Fresh Food", null, 3, 90_000, "32.55", [
      node("MeatSeafood", "Meat & Seafood", "FreshFood", 4, 60_000, "21.70"),
      node("Produce", "Produce", "FreshFood", 4, 30_000, "10.85"),
    ]),
    node("PackagedFood", "Packaged Food", null, 3, 90_000, "32.55", [
      node("Snacks", "Snacks", "PackagedFood", 4, 50_000, "18.08"),
      node("Pantry", "Pantry", "PackagedFood", 4, 40_000, "14.47"),
    ]),
  ],
};

function mockApi(monthly: unknown = monthlyPayload) {
  mockGet.mockImplementation(((url: string, opts: { params?: { query?: { dimension?: string } } }) => {
    if (typeof url === "string" && url.includes("/insights/tree")) {
      const dimension = opts?.params?.query?.dimension;
      return Promise.resolve({
        data: dimension === "item_category" ? itemTree : storeTree,
        error: undefined,
      });
    }
    return Promise.resolve({ data: monthly, error: undefined });
  }) as never);
}

// The dashboard renders <Link to="/trends">, so it needs a router context.
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

  it("renders the donut legend at the L1 industry level with its share", async () => {
    mockApi();
    renderPage();

    const legend = await screen.findByTestId("donut-legend");
    // Real rendered tree data — the top industry + its within-total share.
    expect(within(legend).getByText("Supermarkets")).toBeInTheDocument();
    expect(within(legend).getByText("65.1%")).toBeInTheDocument();
    // gravity ("what's shifting") section comes from /monthly.
    expect(screen.getByText("What's shifting")).toBeInTheDocument();
    expect(screen.getByText("Up 50% vs your 3-month baseline.")).toBeInTheDocument();
  });

  it("drills the full store -> store-type -> family -> item cross-walk and rolls back", async () => {
    mockApi();
    renderPage();

    let legend = await screen.findByTestId("donut-legend");
    await userEvent.click(within(legend).getByText("Supermarkets")); // L1 -> L2
    expect(await screen.findByTestId("drill-breadcrumb")).toBeInTheDocument();

    legend = screen.getByTestId("donut-legend");
    await userEvent.click(within(legend).getByText("Supermarket")); // L2 -> L3 families (cross-walk)

    legend = screen.getByTestId("donut-legend");
    expect(within(legend).getByText("Fresh Food")).toBeInTheDocument();
    expect(within(legend).getByText("Packaged Food")).toBeInTheDocument();

    await userEvent.click(within(legend).getByText("Fresh Food")); // L3 -> L4 items
    legend = screen.getByTestId("donut-legend");
    expect(within(legend).getByText("Meat & Seafood")).toBeInTheDocument();
    expect(within(legend).getByText("Produce")).toBeInTheDocument();

    // Breadcrumb roll-up back to the root.
    await userEvent.click(screen.getByRole("button", { name: "All categories" }));
    expect(screen.queryByTestId("drill-breadcrumb")).not.toBeInTheDocument();
    expect(within(screen.getByTestId("donut-legend")).getByText("Supermarkets")).toBeInTheDocument();
  });

  it("toggles to the item dimension and shows item families", async () => {
    mockApi();
    renderPage();

    await screen.findByTestId("donut-legend");
    await userEvent.click(screen.getByRole("button", { name: "By item" }));

    // Item dimension is the 2-level Family -> Item tree; default shows families.
    expect(await screen.findByText("Fresh Food")).toBeInTheDocument();
  });

  it("shows an empty state when there are no transactions", async () => {
    mockApi({ ...monthlyPayload, transaction_count: 0 });
    renderPage();

    expect(await screen.findByTestId("dashboard-empty")).toBeInTheDocument();
  });

  it("shows an error state when the request fails", async () => {
    mockGet.mockImplementation((() =>
      Promise.resolve({ data: undefined, error: { detail: "x" } })) as never);
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load your data.");
  });
});
