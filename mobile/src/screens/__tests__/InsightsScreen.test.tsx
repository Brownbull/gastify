import { fireEvent, render } from "@testing-library/react-native";
import { InsightsScreen } from "../InsightsScreen";
import { useMonthlyInsights } from "../../hooks/useInsights";

jest.mock("../../hooks/useInsights", () => ({
  useMonthlyInsights: jest.fn(),
}));

// InsightsScreen imports currentPeriod from lib/insights, which transitively
// loads lib/api -> expo-secure-store. Mock it so the screen renders in jsdom.
jest.mock("../../lib/insights", () => ({
  currentPeriod: () => "2026-03",
}));

const mockUseInsights = useMonthlyInsights as jest.Mock;

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

describe("InsightsScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders summary, top categories, gravity centers, and exclusions", () => {
    mockUseInsights.mockReturnValue({
      data: fullPayload,
      error: null,
      isLoading: false,
      refetch: jest.fn(),
    });

    const { getByTestId, getByText } = render(<InsightsScreen />);

    expect(getByTestId("insights-summary")).toBeTruthy();
    expect(getByText("Supermarket")).toBeTruthy();
    expect(getByTestId("insights-gravity")).toBeTruthy();
    expect(getByText("Up 50% vs your 3-month baseline.")).toBeTruthy();
    expect(getByTestId("insights-excluded")).toBeTruthy();
  });

  it("toggles between transaction-category and item-category rollups", () => {
    mockUseInsights.mockReturnValue({
      data: fullPayload,
      error: null,
      isLoading: false,
      refetch: jest.fn(),
    });

    const { getByTestId, getByText, queryByText } = render(<InsightsScreen />);

    expect(queryByText("Meat & Seafood")).toBeNull();
    fireEvent.press(getByTestId("insights-dimension-item_category"));
    expect(getByText("Meat & Seafood")).toBeTruthy();
  });

  it("shows the empty state with no transactions", () => {
    mockUseInsights.mockReturnValue({
      data: { ...fullPayload, transaction_count: 0 },
      error: null,
      isLoading: false,
      refetch: jest.fn(),
    });

    const { getByTestId } = render(<InsightsScreen />);
    expect(getByTestId("insights-empty")).toBeTruthy();
  });

  it("shows the error state", () => {
    mockUseInsights.mockReturnValue({
      data: undefined,
      error: new Error("Failed to load insights"),
      isLoading: false,
      refetch: jest.fn(),
    });

    const { getByTestId, getByText } = render(<InsightsScreen />);
    expect(getByTestId("insights-error")).toBeTruthy();
    expect(getByText("Failed to load insights")).toBeTruthy();
  });
});
