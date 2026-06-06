import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/hooks/useInsights", () => ({ useInsightsTree: vi.fn() }));
vi.mock("@/components/charts/CategoryDonut", () => ({
  default: () => <div data-testid="donut" />,
}));

import { useInsightsTree } from "@/hooks/useInsights";
import { ReportDetailOverlay, type ReportDetailCard } from "./ReportDetailOverlay";

const mockTree = vi.mocked(useInsightsTree);

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

const CARD: ReportDetailCard = {
  period: "2026-05",
  periodLabel: "May 2026",
  total: 10000,
  count: 5,
  trend: "up",
  deltaPct: 12.3,
  currency: "CLP",
};

beforeEach(() => {
  mockTree.mockReset();
  mockTree.mockReturnValue(TREE as never);
});

describe("ReportDetailOverlay", () => {
  it("renders the store + item grouped breakdowns with group cards (parent + child)", () => {
    render(<ReportDetailOverlay card={CARD} onClose={vi.fn()} onViewTransactions={vi.fn()} />);
    expect(screen.getByTestId("report-detail-overlay")).toBeInTheDocument();
    expect(screen.getByTestId("report-detail-store")).toBeInTheDocument();
    expect(screen.getByTestId("report-detail-item")).toBeInTheDocument();
    // a group card per root (store + item dimensions both mocked to the same tree)
    expect(screen.getAllByTestId("report-detail-group").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Alimentación").length).toBeGreaterThan(0); // group header
    expect(screen.getAllByText("Supermercado").length).toBeGreaterThan(0); // child row
  });

  it("drills via the view-transactions button", async () => {
    const onView = vi.fn();
    render(<ReportDetailOverlay card={CARD} onClose={vi.fn()} onViewTransactions={onView} />);
    await userEvent.click(screen.getByTestId("report-detail-view-transactions"));
    expect(onView).toHaveBeenCalledWith("2026-05");
  });

  it("closes via the close button", async () => {
    const onClose = vi.fn();
    render(<ReportDetailOverlay card={CARD} onClose={onClose} onViewTransactions={vi.fn()} />);
    await userEvent.click(screen.getByTestId("report-detail-close"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows the empty state when a dimension has no data", () => {
    mockTree.mockReturnValue({ data: { roots: [], total_spend_minor: 0, currency: "CLP" }, isLoading: false, error: null } as never);
    render(<ReportDetailOverlay card={CARD} onClose={vi.fn()} onViewTransactions={vi.fn()} />);
    expect(screen.getByTestId("report-detail-overlay")).toBeInTheDocument();
    expect(screen.queryByTestId("report-detail-group")).not.toBeInTheDocument();
  });

  it("renders the hero without a trend row for a no-baseline card", () => {
    const noBaseline: ReportDetailCard = { ...CARD, trend: null, deltaPct: null };
    render(<ReportDetailOverlay card={noBaseline} onClose={vi.fn()} onViewTransactions={vi.fn()} />);
    expect(screen.getByTestId("report-detail-overlay")).toBeInTheDocument();
    // No hero trend glyph when there's no prior period to compare against.
    expect(screen.queryByText(/[▲▼]/)).not.toBeInTheDocument();
  });

  it("renders asymmetrically — store has groups, item is empty", () => {
    mockTree.mockImplementation(
      ((_period: string, dimension: string) =>
        dimension === "transaction_category"
          ? TREE
          : { data: { roots: [], total_spend_minor: 0, currency: "CLP" }, isLoading: false, error: null }) as never,
    );
    render(<ReportDetailOverlay card={CARD} onClose={vi.fn()} onViewTransactions={vi.fn()} />);
    // store section has group cards; item section renders but with no group cards.
    expect(screen.getByTestId("report-detail-store")).toBeInTheDocument();
    expect(screen.getByTestId("report-detail-item")).toBeInTheDocument();
    expect(screen.getAllByTestId("report-detail-group").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Alimentación").length).toBe(1); // only the store dimension
  });
});
