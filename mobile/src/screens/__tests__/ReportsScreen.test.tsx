import { fireEvent, render, screen } from "@testing-library/react-native";
import { ReportsScreen } from "../ReportsScreen";

// ReportsScreen renders ScopeBanner, which reads the groups list (D75); stub it
// so the screen needs no extra group fetch.
jest.mock("../../hooks/useGroups", () => ({ useGroups: () => ({ data: [] }) }));

// The real ThemeProvider renders null until an async SecureStore read resolves;
// stub it so the donut palette resolves synchronously when a card is expanded.
jest.mock("../../providers/ThemeProvider", () => ({
  ThemeProvider: ({ children }: { children: unknown }) => children,
  useTheme: () => ({
    colors: {
      chart1: "#c1",
      chart2: "#c2",
      chart3: "#c3",
      chart4: "#c4",
      chart5: "#c5",
      chart6: "#c6",
      surface: "#ffffff",
      textPrimary: "#0f172a",
      textTertiary: "#64748b",
    },
  }),
}));

jest.mock("../../hooks/useInsights", () => ({
  useInsightsSeries: jest.fn(),
  useMonthlyInsights: jest.fn(),
}));

import { useInsightsSeries, useMonthlyInsights } from "../../hooks/useInsights";

const mockSeries = jest.mocked(useInsightsSeries);
const mockMonthly = jest.mocked(useMonthlyInsights);

function point(
  period: string,
  periodStart: string,
  totalSpendMinor: number,
  transactionCount: number,
) {
  return {
    period,
    period_start: periodStart,
    period_end: periodStart,
    total_spend_minor: totalSpendMinor,
    transaction_count: transactionCount,
  };
}

// Ascending by period (oldest first), as /insights/series returns it. The screen
// reverses to most-recent-first: card-0 == April, card-1 == March, card-2 == Feb.
const ascendingPoints = [
  point("2026-02", "2026-02-01", 100_000, 4), // baseline
  point("2026-03", "2026-03-01", 150_000, 6), // up vs Feb (+50%)
  point("2026-04", "2026-04-01", 90_000, 5), // down vs Mar (-40%)
];

function setSeries(over: Record<string, unknown> = {}) {
  mockSeries.mockReturnValue({
    data: {
      schema_version: "insights-series.v1",
      granularity: "month",
      currency: "CLP",
      period_start: "2026-02-01",
      period_end: "2026-04-30",
      points: ascendingPoints,
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    ...over,
  } as never);
}

beforeEach(() => {
  mockSeries.mockReset();
  mockMonthly.mockReset();
  mockMonthly.mockReturnValue({
    data: undefined,
    isLoading: false,
    error: null,
  } as never);
});

describe("ReportsScreen", () => {
  it("renders one monthly card per series point, most-recent first", () => {
    setSeries();
    render(<ReportsScreen />);

    expect(screen.getByTestId("reports-screen")).toBeTruthy();
    expect(screen.getByTestId("reports-card-0")).toBeTruthy();
    expect(screen.getByTestId("reports-card-1")).toBeTruthy();
    expect(screen.getByTestId("reports-card-2")).toBeTruthy();
    // card-0 is the newest month (April), card-2 the oldest (February). April
    // also appears in the "This month so far" summary card, so match >= 1.
    expect(screen.getAllByText("April 2026").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("February 2026")).toBeTruthy();
  });

  it("switches the requested series granularity via the toggle (D77)", () => {
    setSeries();
    render(<ReportsScreen />);

    // Defaults to monthly + shows the month-only breakdown summary card.
    const monthCall = mockSeries.mock.calls.at(-1) as unknown[];
    expect(monthCall?.[2]).toBe("month");
    expect(screen.queryByTestId("reports-current-month")).toBeTruthy();

    fireEvent.press(screen.getByTestId("reports-granularity-quarter"));

    // Now requests quarterly buckets, and the month-only summary card is gone.
    const quarterCall = mockSeries.mock.calls.at(-1) as unknown[];
    expect(quarterCall?.[2]).toBe("quarter");
    expect(screen.queryByTestId("reports-current-month")).toBeNull();
    // Cards still render at the new granularity.
    expect(screen.getByTestId("reports-card-0")).toBeTruthy();
  });

  it("classifies the trend up/down/flat against the previous period", () => {
    setSeries();
    render(<ReportsScreen />);

    // card-0 = April (90k) DOWN vs March (150k): -40.0%.
    const down = screen.getByTestId("reports-trend-0");
    expect(down.props.children.join("")).toContain("▼");
    expect(down.props.children.join("")).toContain("40.0%");

    // card-1 = March (150k) UP vs February (100k): +50.0%.
    const up = screen.getByTestId("reports-trend-1");
    expect(up.props.children.join("")).toContain("▲");
    expect(up.props.children.join("")).toContain("50.0%");

    // card-2 = February is the oldest point: no baseline, flat indicator.
    const flat = screen.getByTestId("reports-trend-2");
    expect(flat.props.children.join("")).toContain("—");
  });

  it("marks an unchanged period as flat with 0%", () => {
    mockSeries.mockReturnValue({
      data: {
        schema_version: "insights-series.v1",
        granularity: "month",
        currency: "CLP",
        period_start: "2026-03-01",
        period_end: "2026-04-30",
        points: [
          point("2026-03", "2026-03-01", 120_000, 5),
          point("2026-04", "2026-04-01", 120_000, 5),
        ],
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as never);
    render(<ReportsScreen />);

    const flat = screen.getByTestId("reports-trend-0");
    expect(flat.props.children.join("")).toContain("▬");
    expect(flat.props.children.join("")).toContain("0%");
  });

  it("shows the empty state when no period has spend", () => {
    setSeries({
      data: {
        schema_version: "insights-series.v1",
        granularity: "month",
        currency: "CLP",
        period_start: "2026-02-01",
        period_end: "2026-04-30",
        points: [
          point("2026-03", "2026-03-01", 0, 0),
          point("2026-04", "2026-04-01", 0, 0),
        ],
      },
    });
    render(<ReportsScreen />);

    expect(screen.getByTestId("reports-empty")).toBeTruthy();
    expect(screen.queryByTestId("reports-card-0")).toBeNull();
  });

  it("shows a loading indicator while the series is loading", () => {
    setSeries({ data: undefined, isLoading: true });
    render(<ReportsScreen />);

    expect(screen.getByTestId("reports-loading")).toBeTruthy();
  });
});
