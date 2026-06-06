import { render, fireEvent } from "@testing-library/react-native";
import { ReportDetailScreen } from "../ReportDetailScreen";

jest.mock("../../hooks/useInsights", () => ({ useInsightsTree: jest.fn() }));
jest.mock("../../components/charts/CategoryDonut", () => ({
  CategoryDonut: () => null,
}));

import { useInsightsTree } from "../../hooks/useInsights";

const mockTree = useInsightsTree as jest.Mock;

const TREE = {
  data: {
    roots: [
      {
        key: "food",
        label: "Alimentación",
        level: 1,
        total_minor: 8000,
        currency: "CLP",
        share_of_total_percent: "80",
        transaction_count: 5,
        item_count: 10,
        children: [
          {
            key: "super",
            label: "Supermercado",
            level: 2,
            total_minor: 6000,
            currency: "CLP",
            share_of_total_percent: "60",
            transaction_count: 3,
            item_count: 6,
          },
        ],
      },
    ],
    total_spend_minor: 10000,
    currency: "CLP",
  },
  isLoading: false,
  error: null,
};

const PARAMS = {
  period: "2026-05",
  label: "May 2026",
  totalMinor: 10000,
  count: 5,
  currency: "CLP",
  trendDirection: "up" as const,
  trendPercent: 12.3,
  hasBaseline: true,
};

const route = { params: PARAMS, key: "k", name: "ReportDetail" as const };

beforeEach(() => {
  mockTree.mockReset();
  mockTree.mockReturnValue(TREE);
});

describe("ReportDetailScreen", () => {
  it("renders the store + item grouped breakdown (parent + child)", () => {
    const view = render(<ReportDetailScreen route={route as never} />);
    expect(view.getByTestId("report-detail-screen")).toBeTruthy();
    expect(view.getByTestId("report-detail-store")).toBeTruthy();
    expect(view.getByTestId("report-detail-item")).toBeTruthy();
    expect(view.getAllByTestId("report-detail-group").length).toBeGreaterThanOrEqual(2);
    expect(view.getAllByText("Alimentación").length).toBeGreaterThan(0);
    expect(view.getAllByText("Supermercado").length).toBeGreaterThan(0);
  });

  it("drills to transactions with the period's date range", () => {
    const navigate = jest.fn();
    const view = render(
      <ReportDetailScreen
        route={route as never}
        navigation={{ navigate, goBack: jest.fn() } as never}
      />,
    );
    fireEvent.press(view.getByTestId("report-detail-view-transactions"));
    expect(navigate).toHaveBeenCalledWith("Transactions", {
      dateFrom: "2026-05-01",
      dateTo: "2026-05-31",
    });
  });

  it("shows the empty state for a dimension with no data", () => {
    mockTree.mockReturnValue({
      data: { roots: [], total_spend_minor: 0, currency: "CLP" },
      isLoading: false,
      error: null,
    });
    const view = render(<ReportDetailScreen route={route as never} />);
    expect(view.getByTestId("report-detail-screen")).toBeTruthy();
    expect(view.queryByTestId("report-detail-group")).toBeNull();
  });
});
