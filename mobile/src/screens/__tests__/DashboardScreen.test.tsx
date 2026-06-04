import { render, screen, fireEvent } from "@testing-library/react-native";
import { DashboardScreen } from "../DashboardScreen";

// useFocusEffect needs a navigation context; the screen is rendered standalone.
jest.mock("@react-navigation/native", () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock("../../hooks/useInsights", () => ({
  useMonthlyInsights: jest.fn(),
  useInsightsTree: jest.fn(),
}));

// The real ThemeProvider renders null until an async SecureStore read resolves;
// stub it to render children synchronously with a fixed palette so sync queries
// see the rendered legend.
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
      textSecondary: "#334155",
      textTertiary: "#64748b",
      borderLight: "#e2e8f0",
      borderMedium: "#cbd5e1",
    },
    colorTheme: "normal",
    themeMode: "light",
    setColorTheme: jest.fn(),
    setThemeMode: jest.fn(),
    toggleThemeMode: jest.fn(),
  }),
}));

import { useMonthlyInsights, useInsightsTree } from "../../hooks/useInsights";

const mockMonthly = jest.mocked(useMonthlyInsights);
const mockTree = jest.mocked(useInsightsTree);

// Monthly backs the summary + "what's shifting"; the donut is tree-backed.
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
  gravity_centers: [],
  excluded_items: [],
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
  children: TreeNode[] = [],
): TreeNode {
  return {
    key,
    label,
    parent_key: parentKey,
    level,
    total_minor: totalMinor,
    currency: "CLP",
    share_of_total_percent: "0.00",
    transaction_count: 1,
    item_count: children.length || 1,
    excluded_total_minor: 0,
    children,
  };
}

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
    node("SupermarketsIndustry", "Supermarkets", null, 1, 180_000, [
      node("Supermarket", "Supermarket", "SupermarketsIndustry", 2, 180_000, [
        node("FreshFood", "Fresh Food", "Supermarket", 3, 90_000, [
          node("MeatSeafood", "Meat & Seafood", "FreshFood", 4, 60_000),
          node("Produce", "Produce", "FreshFood", 4, 30_000),
        ]),
        node("PackagedFood", "Packaged Food", "Supermarket", 3, 90_000, [
          node("Snacks", "Snacks", "PackagedFood", 4, 50_000),
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
    node("FreshFood", "Fresh Food", null, 3, 90_000, [
      node("MeatSeafood", "Meat & Seafood", "FreshFood", 4, 60_000),
      node("Produce", "Produce", "FreshFood", 4, 30_000),
    ]),
  ],
};

function setMonthly(over: Partial<typeof monthlyPayload> = {}) {
  mockMonthly.mockReturnValue({
    data: { ...monthlyPayload, ...over },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  } as never);
}

function setTree() {
  mockTree.mockImplementation(
    (_period: string, dimension: string) =>
      ({
        data: dimension === "item_category" ? itemTree : storeTree,
        isLoading: false,
        error: null,
      }) as never,
  );
}

describe("DashboardScreen", () => {
  beforeEach(() => {
    mockMonthly.mockReset();
    mockTree.mockReset();
  });

  it("renders the donut legend at the L1 industry level", () => {
    setMonthly();
    setTree();
    render(<DashboardScreen />);

    expect(screen.getByTestId("donut-legend")).toBeTruthy();
    expect(screen.getByText("Supermarkets")).toBeTruthy();
    // 276500 total - 180000 industry = 96500 "Other" remainder.
    expect(screen.getByText("Other")).toBeTruthy();
  });

  it("drills from an industry into its store-type with a breadcrumb", () => {
    setMonthly();
    setTree();
    render(<DashboardScreen />);

    fireEvent.press(screen.getByText("Supermarkets"));

    expect(screen.getByTestId("drill-breadcrumb")).toBeTruthy();
    expect(screen.getByText("Supermarket")).toBeTruthy();
  });

  it("toggles to the item dimension and shows item families", () => {
    setMonthly();
    setTree();
    render(<DashboardScreen />);

    fireEvent.press(screen.getByTestId("dashboard-dimension-item_category"));

    expect(screen.getByText("Fresh Food")).toBeTruthy();
  });

  it("shows an empty state when there are no transactions", () => {
    setMonthly({ transaction_count: 0 });
    setTree();
    render(<DashboardScreen />);

    expect(screen.getByTestId("dashboard-empty")).toBeTruthy();
  });

  it("shows an error state when the request fails", () => {
    mockMonthly.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Failed to load insights"),
      refetch: jest.fn(),
    } as never);
    setTree();
    render(<DashboardScreen />);

    expect(screen.getByTestId("dashboard-error")).toBeTruthy();
  });
});
