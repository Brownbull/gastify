import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route } from "./insights";

vi.mock("@/lib/api", () => ({
  apiClient: { GET: vi.fn() },
}));

import { apiClient } from "@/lib/api";

const mockGet = vi.mocked(apiClient.GET);

const fullPayload = {
  schema_version: "monthly-insights.v1",
  period_start: "2026-03-01",
  period_end: "2026-03-31",
  currency: "CLP",
  total_spend_minor: 276_500,
  transaction_count: 7,
  item_count: 12,
  top_transaction_categories: [
    {
      dimension: "transaction_category",
      category_key: "Supermarket",
      category_level: 2,
      parent_key: "Retail",
      parent_level: 1,
      label: "Supermarket",
      parent_label: "Retail",
      total_minor: 180_000,
      currency: "CLP",
      share_of_total_percent: "65.10",
      transaction_count: 3,
      item_count: 8,
      excluded_total_minor: 0,
      excluded_item_count: 0,
    },
  ],
  top_item_categories: [
    {
      dimension: "item_category",
      category_key: "MeatSeafood",
      category_level: 4,
      parent_key: "Food",
      parent_level: 3,
      label: "Meat & Seafood",
      parent_label: "Food",
      total_minor: 90_000,
      currency: "CLP",
      share_of_total_percent: "40.00",
      transaction_count: 2,
      item_count: 5,
      excluded_total_minor: 5_000,
      excluded_item_count: 1,
    },
  ],
  gravity_centers: [
    {
      dimension: "transaction_category",
      category_key: "Supermarket",
      category_level: 2,
      parent_key: "Retail",
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

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Page = Route.options.component as () => JSX.Element;
  return render(
    <QueryClientProvider client={queryClient}>
      <Page />
    </QueryClientProvider>,
  );
}

describe("InsightsPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders monthly summary, top categories, gravity centers, and exclusions", async () => {
    mockGet.mockResolvedValue({ data: fullPayload, error: undefined } as never);
    renderPage();

    expect(await screen.findByText("Top categories")).toBeInTheDocument();
    // transaction dimension is the default; "Retail" is the parent label,
    // unique to the category list ("Supermarket" also appears in gravity).
    expect(screen.getByText("Retail")).toBeInTheDocument();
    expect(screen.getByText("65.10%")).toBeInTheDocument();
    // gravity-center section
    expect(screen.getByText("What's shifting")).toBeInTheDocument();
    expect(
      screen.getByText("Up 50% vs your 3-month baseline."),
    ).toBeInTheDocument();
    // excluded items
    expect(screen.getByText("Excluded by your flags")).toBeInTheDocument();
    expect(screen.getByText(/special case \(1\)/i)).toBeInTheDocument();
  });

  it("toggles between transaction-category and item-category rollups", async () => {
    mockGet.mockResolvedValue({ data: fullPayload, error: undefined } as never);
    renderPage();

    await screen.findByText("Retail");
    expect(screen.queryByText("Meat & Seafood")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "By item" }));

    expect(screen.getByText("Meat & Seafood")).toBeInTheDocument();
    expect(
      screen.getByText(/1 item excluded by your flags/i),
    ).toBeInTheDocument();
  });

  it("shows an empty state when there are no transactions", async () => {
    mockGet.mockResolvedValue({
      data: { ...fullPayload, transaction_count: 0 },
      error: undefined,
    } as never);
    renderPage();

    expect(
      await screen.findByText(/No transactions for this month yet/i),
    ).toBeInTheDocument();
  });

  it("shows an error state when the request fails", async () => {
    mockGet.mockResolvedValue({ data: undefined, error: { detail: "x" } } as never);
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Failed to load insights",
    );
  });
});
