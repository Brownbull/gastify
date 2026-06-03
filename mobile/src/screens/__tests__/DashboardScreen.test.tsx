import { render, screen, fireEvent } from "@testing-library/react-native";
import { DashboardScreen } from "../DashboardScreen";

jest.mock("../../hooks/useInsights", () => ({
  useMonthlyInsights: jest.fn(),
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

import { useMonthlyInsights } from "../../hooks/useInsights";

const mockHook = jest.mocked(useMonthlyInsights);

const payload = {
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
      excluded_total_minor: 0,
      excluded_item_count: 0,
    },
  ],
  gravity_centers: [],
  excluded_items: [],
};

function renderScreen() {
  return render(<DashboardScreen />);
}

describe("DashboardScreen", () => {
  beforeEach(() => mockHook.mockReset());

  it("renders the donut legend with the top category", () => {
    mockHook.mockReturnValue({
      data: payload,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as never);

    renderScreen();

    expect(screen.getByTestId("donut-legend")).toBeTruthy();
    expect(screen.getByText("Supermarket")).toBeTruthy();
    // "Other" remainder slice (276500 total - 180000 top = 96500) is synthesized.
    expect(screen.getByText("Other")).toBeTruthy();
  });

  it("toggles the donut to the item dimension", () => {
    mockHook.mockReturnValue({
      data: payload,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as never);

    renderScreen();
    expect(screen.getByText("Supermarket")).toBeTruthy();

    fireEvent.press(screen.getByTestId("dashboard-dimension-item_category"));

    expect(screen.getByText("Meat & Seafood")).toBeTruthy();
  });

  it("shows an empty state when there are no transactions", () => {
    mockHook.mockReturnValue({
      data: { ...payload, transaction_count: 0 },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as never);

    renderScreen();

    expect(screen.getByTestId("dashboard-empty")).toBeTruthy();
  });

  it("shows an error state when the request fails", () => {
    mockHook.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Failed to load insights"),
      refetch: jest.fn(),
    } as never);

    renderScreen();

    expect(screen.getByTestId("dashboard-error")).toBeTruthy();
  });
});
