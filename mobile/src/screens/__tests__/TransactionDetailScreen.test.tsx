import { fireEvent, render } from "@testing-library/react-native";
import { TransactionDetailScreen } from "../TransactionDetailScreen";
import { useItemCategories, useStoreCategories } from "../../hooks/useCategories";
import {
  useTransaction,
  useUpdateTransaction,
} from "../../hooks/useTransactions";

jest.mock("../../hooks/useTransactions", () => ({
  useTransaction: jest.fn(),
  useUpdateTransaction: jest.fn(),
}));

jest.mock("../../hooks/useCategories", () => ({
  useItemCategories: jest.fn(),
  useStoreCategories: jest.fn(),
}));

jest.mock("../../lib/categories", () => ({
  categoryLabel: jest.fn((category) => category.display_labels.en ?? category.key),
  categoryPath: jest.fn((_categories, categoryId) => {
    if (categoryId === "cat-1") return "Supermarket";
    if (categoryId === "item-cat-1") return "Coffee";
    return "Uncategorized";
  }),
}));

const mutate = jest.fn();
const reset = jest.fn();

const storeCategory = {
  id: "cat-1",
  key: "supermarket",
  level: 1,
  parent_id: null,
  display_labels: { en: "Supermarket" },
  is_sensitive: false,
  sort_order: 1,
};

const itemCategory = {
  id: "item-cat-1",
  key: "coffee",
  level: 2,
  parent_id: null,
  display_labels: { en: "Coffee" },
  is_sensitive: false,
  sort_order: 1,
};

const transaction = {
  id: "txn-1",
  transaction_date: "2026-05-20",
  transaction_time: null,
  merchant: "Cafe Central",
  merchant_user_edited_at: null,
  alias: "Santander Visa",
  store_category_id: "cat-1",
  store_category_source: "ai",
  store_category_confidence: "0.91",
  store_category_mapping_id: null,
  store_category_user_edited_at: null,
  total_minor: 5500,
  discount_total_minor: null,
  gross_total_minor: null,
  reconstructed_total_minor: null,
  scan_review_level: "warning",
  scan_review_signals: [
    {
      code: "item_structure_changed",
      severity: "warning",
      source_stage: "postprocess",
      message: "Post-processing changed the receipt item structure.",
      details: {},
    },
  ],
  currency: "CLP",
  amount_usd_minor: 550,
  fx_rate_to_usd: "0.001",
  fx_captured_at: null,
  card_alias_id: null,
  receipt_type: "scan",
  thumbnail_url: null,
  country: "CL",
  city: "Santiago",
  llm_tokens_in: null,
  llm_tokens_out: null,
  llm_cost_usd: null,
  scan_duration_ms: null,
  llm_latency_ms: null,
  queue_wait_ms: null,
  thumbnail_gen_ms: null,
  items: [
    {
      id: "item-1",
      name: "Coffee",
      name_user_edited_at: null,
      qty: 1,
      unit_price_minor: null,
      total_price_minor: 5500,
      discount_minor: null,
      discount_label: null,
      item_category_id: "item-cat-1",
      item_category_user_edited_at: null,
      subcategory: "Coffee",
      category_source: "ai",
      is_flagged: false,
      sort_order: 0,
    },
  ],
  images: [],
  created_at: "2026-05-20T12:00:00Z",
  updated_at: "2026-05-20T12:00:00Z",
};

describe("TransactionDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useStoreCategories).mockReturnValue({
      data: [storeCategory],
    } as never);
    jest.mocked(useItemCategories).mockReturnValue({
      data: [itemCategory],
    } as never);
    jest.mocked(useTransaction).mockReturnValue({
      data: transaction,
      error: null,
      isLoading: false,
      refetch: jest.fn(),
    } as never);
    jest.mocked(useUpdateTransaction).mockReturnValue({
      error: null,
      isPending: false,
      mutate,
      reset,
    } as never);
  });

  it("renders transaction totals, review warnings, and editable fields", () => {
    const screen = render(
      <TransactionDetailScreen
        route={{ params: { transactionId: "txn-1" } } as never}
      />,
    );

    expect(screen.getByTestId("transaction-detail-screen")).toBeTruthy();
    expect(screen.getByText("Cafe Central")).toBeTruthy();
    expect(screen.getByTestId("transaction-review-warning")).toBeTruthy();
    expect(screen.getAllByText("Coffee").length).toBeGreaterThan(0);
  });

  it("saves merchant edits through the update mutation", () => {
    const screen = render(
      <TransactionDetailScreen
        route={{ params: { transactionId: "txn-1" } } as never}
      />,
    );

    fireEvent.changeText(
      screen.getByTestId("transaction-edit-merchant"),
      "Cafe Nuevo",
    );
    fireEvent.press(screen.getByText("Save merchant"));

    expect(mutate).toHaveBeenCalledWith({ merchant: "Cafe Nuevo" });
  });

  it("saves line item amount edits in minor units", () => {
    const screen = render(
      <TransactionDetailScreen
        route={{ params: { transactionId: "txn-1" } } as never}
      />,
    );

    fireEvent.changeText(screen.getByTestId("transaction-item-0-amount"), "6500");
    fireEvent.press(screen.getByTestId("transaction-item-0-save-button"));

    expect(mutate).toHaveBeenCalledWith({
      items: [{ id: "item-1", total_price_minor: 6500 }],
    });
  });
});
