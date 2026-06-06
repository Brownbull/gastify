import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createRouter,
  createRootRoute,
  createMemoryHistory,
} from "@tanstack/react-router";

vi.mock("@/hooks/useInsights", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useInsights")>();
  return { ...actual, useMonthlyInsights: vi.fn(), useInsightsSeries: vi.fn() };
});

import { Route, toReportCards, periodDateRange } from "./reports";
import { useMonthlyInsights, useInsightsSeries } from "@/hooks/useInsights";

const mockMonthly = vi.mocked(useMonthlyInsights);
const mockSeries = vi.mocked(useInsightsSeries);

const monthly = (total: number) =>
  ({
    data: {
      total_spend_minor: total,
      currency: "CLP",
      top_transaction_categories: [],
      top_item_categories: [],
    },
    isLoading: false,
  }) as never;

const seriesOf = (points: { period: string; total: number; count: number }[]) =>
  ({
    data: {
      currency: "CLP",
      points: points.map((p) => ({
        period: p.period,
        period_start: `${p.period}-01`,
        period_end: `${p.period}-28`,
        total_spend_minor: p.total,
        transaction_count: p.count,
      })),
    },
    isLoading: false,
  }) as never;

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({
    component: Route.options.component as () => JSX.Element,
  });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ["/reports"] }),
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router as never} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockMonthly.mockReset();
  mockSeries.mockReset();
});

describe("toReportCards", () => {
  it("classifies trend vs the previous month and returns newest-first", () => {
    const cards = toReportCards([
      { period: "2026-01", total_spend_minor: 100, transaction_count: 1 },
      { period: "2026-02", total_spend_minor: 200, transaction_count: 2 }, // up
      { period: "2026-03", total_spend_minor: 200, transaction_count: 3 }, // flat
      { period: "2026-04", total_spend_minor: 50, transaction_count: 1 }, // down
    ]);
    // Newest first.
    expect(cards.map((c) => c.period)).toEqual(["2026-04", "2026-03", "2026-02", "2026-01"]);
    expect(cards.find((c) => c.period === "2026-04")?.trend).toBe("down");
    expect(cards.find((c) => c.period === "2026-03")?.trend).toBe("flat");
    expect(cards.find((c) => c.period === "2026-02")?.trend).toBe("up");
    // Oldest point has no previous → no trend.
    expect(cards.find((c) => c.period === "2026-01")?.trend).toBeNull();
    // 100 -> 200 is +100%.
    expect(cards.find((c) => c.period === "2026-02")?.deltaPct).toBe(100);
  });
});

describe("/reports", () => {
  it("renders monthly report cards with trend chips", async () => {
    mockMonthly.mockReturnValue(monthly(200));
    mockSeries.mockReturnValue(
      seriesOf([
        { period: "2026-02", total: 100, count: 2 },
        { period: "2026-03", total: 200, count: 4 },
      ]),
    );
    renderPage();
    expect(await screen.findByTestId("reports-screen")).toBeInTheDocument();
    expect(screen.getAllByTestId("reports-card")).toHaveLength(2);
    // 100 -> 200 is an up month.
    expect(screen.getByTestId("reports-trend-up")).toBeInTheDocument();
  });

  it("switches the requested series granularity via the toggle (D77)", async () => {
    mockMonthly.mockReturnValue(monthly(200));
    mockSeries.mockReturnValue(seriesOf([{ period: "2026-03", total: 200, count: 4 }]));
    renderPage();
    await screen.findByTestId("reports-screen");

    // Default monthly → the month-only breakdown section is present.
    expect(mockSeries.mock.calls.at(-1)?.[2]).toBe("month");
    expect(screen.getByTestId("reports-breakdown")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("reports-granularity-quarter"));

    // Now requests quarterly buckets and the month-only breakdown is gone.
    expect(mockSeries.mock.calls.at(-1)?.[2]).toBe("quarter");
    expect(screen.queryByTestId("reports-breakdown")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("reports-card").length).toBeGreaterThanOrEqual(1);
  });

  it("shows the empty state when there is no spend", async () => {
    mockMonthly.mockReturnValue(monthly(0));
    mockSeries.mockReturnValue(
      seriesOf([
        { period: "2026-02", total: 0, count: 0 },
        { period: "2026-03", total: 0, count: 0 },
      ]),
    );
    renderPage();
    expect(await screen.findByTestId("reports-empty")).toBeInTheDocument();
  });
});

describe("periodDateRange", () => {
  it("computes the calendar range for a month", () => {
    expect(periodDateRange("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(periodDateRange("2024-02")).toEqual({ from: "2024-02-01", to: "2024-02-29" }); // leap
  });

  it("computes the calendar range for a quarter", () => {
    expect(periodDateRange("2026-Q1")).toEqual({ from: "2026-01-01", to: "2026-03-31" });
    expect(periodDateRange("2026-Q4")).toEqual({ from: "2026-10-01", to: "2026-12-31" });
  });

  it("computes the calendar range for a year", () => {
    expect(periodDateRange("2026")).toEqual({ from: "2026-01-01", to: "2026-12-31" });
  });

  it("throws on an unsupported period (e.g. a week key) instead of NaN dates", () => {
    expect(() => periodDateRange("2026-W01")).toThrow();
    expect(() => periodDateRange("nope")).toThrow();
  });
});
