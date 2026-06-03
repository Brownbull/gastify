import { fireEvent, render } from "@testing-library/react-native";
import { TransactionsScreen } from "../TransactionsScreen";
import { useStoreCategories } from "../../hooks/useCategories";
import { useTransactions } from "../../hooks/useTransactions";

jest.mock("../../hooks/useTransactions", () => ({
  useTransactions: jest.fn(),
  useBatchDeleteTransactions: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
}));

jest.mock("../../hooks/useCategories", () => ({
  useStoreCategories: jest.fn(),
}));

jest.mock("../../lib/categories", () => ({
  categoryPath: jest.fn((_categories, categoryId) =>
    categoryId === "cat-1" ? "Supermarket" : "Uncategorized",
  ),
}));

describe("TransactionsScreen", () => {
  const fetchNextPage = jest.fn();
  const refetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useStoreCategories).mockReturnValue({
      data: [
        {
          id: "cat-1",
          key: "supermarket",
          level: 1,
          parent_id: null,
          display_labels: { en: "Supermarket" },
          is_sensitive: false,
          sort_order: 1,
        },
      ],
    } as never);
    jest.mocked(useTransactions).mockReturnValue({
      data: {
        pages: [
          {
            cursor: null,
            has_more: false,
            data: [
              {
                id: "txn-1",
                transaction_date: "2026-05-20",
                merchant: "Super Lider",
                merchant_user_edited_at: null,
                alias: "Santander Visa",
                store_category_id: "cat-1",
                store_category_user_edited_at: null,
                total_minor: 102052,
                currency: "CLP",
                amount_usd_minor: 102,
                card_alias_id: null,
                scan_review_level: "warning",
                item_count: 4,
                created_at: "2026-05-20T12:00:00Z",
                updated_at: "2026-05-20T12:00:00Z",
              },
            ],
          },
        ],
      },
      error: null,
      fetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      refetch,
    } as never);
  });

  it("renders transaction rows and opens detail", () => {
    const navigate = jest.fn();
    const screen = render(
      <TransactionsScreen navigation={{ navigate } as never} />,
    );

    expect(screen.getByTestId("transactions-screen")).toBeTruthy();
    expect(screen.getByText("Super Lider")).toBeTruthy();
    expect(screen.getByText("Supermarket - Santander Visa")).toBeTruthy();

    fireEvent.press(screen.getByTestId("transaction-row-txn-1"));

    expect(navigate).toHaveBeenCalledWith("TransactionDetail", {
      transactionId: "txn-1",
    });
  });

  it("passes updated filters into the transaction query", () => {
    const screen = render(<TransactionsScreen />);

    fireEvent.changeText(
      screen.getByTestId("transactions-filter-merchant"),
      "Lider",
    );
    fireEvent.changeText(screen.getByTestId("transactions-filter-card"), "Visa");

    expect(useTransactions).toHaveBeenLastCalledWith(
      expect.objectContaining({ cardAlias: "Visa", merchant: "Lider" }),
    );
  });
});
