import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { ReportsScreen } from "../ReportsScreen";
import { getInsightsSeries } from "../../lib/insights";
import { useScopeStore } from "../../stores/scopeStore";

// Scope-awareness end-to-end: keep the REAL useInsightsSeries hook (so the
// scopeStore -> group_id wiring runs) and only mock the network lib beneath it.
jest.mock("../../lib/insights", () => {
  const actual = jest.requireActual("../../lib/insights");
  return { ...actual, getInsightsSeries: jest.fn() };
});

// ScopeBanner reads the groups list (D75) + the donut needs a theme palette.
jest.mock("../../hooks/useGroups", () => ({
  useGroups: () => ({ data: [{ id: "grp-1", name: "Casa" }] }),
}));
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

const mockGetSeries = getInsightsSeries as jest.Mock;

const seriesPayload = {
  schema_version: "insights-series.v1",
  granularity: "month",
  currency: "CLP",
  period_start: "2026-02-01",
  period_end: "2026-04-30",
  points: [
    {
      period: "2026-04",
      period_start: "2026-04-01",
      period_end: "2026-04-30",
      total_spend_minor: 90_000,
      transaction_count: 5,
    },
  ],
};

let queryClient: QueryClient;

beforeEach(() => {
  jest.clearAllMocks();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
});

afterEach(() => {
  useScopeStore.getState().reset();
  queryClient.clear();
  queryClient.unmount();
});

function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("ReportsScreen scope-awareness", () => {
  it("threads the active group id into the series fetch (D70)", async () => {
    useScopeStore
      .getState()
      .setActiveScope({ kind: "group", id: "grp-1", name: "Casa" });
    mockGetSeries.mockResolvedValue(seriesPayload);

    render(<ReportsScreen />, { wrapper: Wrapper });

    await waitFor(() =>
      expect(mockGetSeries).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        "month",
        undefined,
        "grp-1",
      ),
    );
  });

  it("omits the group id in personal scope", async () => {
    mockGetSeries.mockResolvedValue(seriesPayload);

    render(<ReportsScreen />, { wrapper: Wrapper });

    await waitFor(() =>
      expect(mockGetSeries).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        "month",
        undefined,
        undefined,
      ),
    );
  });
});
