import { QueryClient, type InfiniteData } from "@tanstack/react-query";
import {
  applyOptimisticDetail,
  applyOptimisticLists,
  transactionKeys,
} from "../useTransactions";
import type {
  TransactionDetail,
  TransactionListItem,
  TransactionsPage,
} from "../../lib/transactions";

jest.mock("../../lib/transactions", () => ({
  getTransaction: jest.fn(),
  listTransactions: jest.fn(),
  updateTransaction: jest.fn(),
}));

const baseDetail: TransactionDetail = {
  id: "txn-1",
  transaction_date: "2026-05-10",
  transaction_time: null,
  merchant: "Cafe Central",
  merchant_user_edited_at: null,
  alias: "Santander Visa",
  store_category_id: "cat-1",
  store_category_source: "ai",
  store_category_confidence: "0.95",
  store_category_mapping_id: null,
  store_category_user_edited_at: null,
  total_minor: 5500,
  discount_total_minor: null,
  gross_total_minor: null,
  reconstructed_total_minor: null,
  scan_review_level: "none",
  scan_review_signals: [],
  currency: "CLP",
  amount_usd_minor: 550,
  fx_rate_to_usd: "0.001",
  fx_captured_at: null,
  card_alias_id: null,
  receipt_type: "scan",
  thumbnail_url: null,
  country: "CL",
  city: "Santiago",
  recurrence_kind: "none",
  recurrence_interval: null,
  term_current: null,
  term_total: null,
  recurrence_label: null,
  recurrence_source: "none",
  recurrence_confidence: null,
  recurrence_user_edited_at: null,
  llm_tokens_in: null,
  llm_tokens_out: null,
  llm_cost_usd: null,
  scan_duration_ms: null,
  llm_latency_ms: null,
  queue_wait_ms: null,
  thumbnail_gen_ms: null,
  is_shared: false,
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
  created_at: "2026-05-10T12:00:00Z",
  updated_at: "2026-05-10T12:00:00Z",
};

const baseListItem: TransactionListItem = {
  id: "txn-1",
  transaction_date: "2026-05-10",
  transaction_time: null,
  merchant: "Cafe Central",
  merchant_user_edited_at: null,
  alias: "Santander Visa",
  store_category_id: "cat-1",
  store_category_source: "ai",
  store_category_confidence: "0.95",
  store_category_mapping_id: null,
  store_category_user_edited_at: null,
  total_minor: 5500,
  discount_total_minor: null,
  gross_total_minor: null,
  reconstructed_total_minor: null,
  scan_review_level: "none",
  currency: "CLP",
  amount_usd_minor: 550,
  fx_rate_to_usd: "0.001",
  card_alias_id: null,
  receipt_type: "scan",
  thumbnail_url: null,
  country: "CL",
  city: "Santiago",
  recurrence_kind: "none",
  recurrence_interval: null,
  term_current: null,
  term_total: null,
  recurrence_label: null,
  recurrence_source: "none",
  recurrence_confidence: null,
  recurrence_user_edited_at: null,
  item_count: 1,
  is_shared: false,
  created_at: "2026-05-10T12:00:00Z",
  updated_at: "2026-05-10T12:00:00Z",
};

function transactionPages(): InfiniteData<TransactionsPage> {
  return {
    pageParams: [null],
    pages: [{ cursor: null, data: [baseListItem], has_more: false }],
  };
}

describe("transaction optimistic cache helpers", () => {
  it("updates detail and list fields with user-edited markers", () => {
    const editedAt = "2026-05-20T12:00:00Z";
    const detail = applyOptimisticDetail(
      baseDetail,
      { merchant: "Cafe Nuevo", store_category_id: "cat-2" },
      editedAt,
    );
    const lists = applyOptimisticLists(
      transactionPages(),
      "txn-1",
      { merchant: "Cafe Nuevo", store_category_id: "cat-2" },
      editedAt,
    );

    expect(detail).toMatchObject({
      merchant: "Cafe Nuevo",
      merchant_user_edited_at: editedAt,
      store_category_id: "cat-2",
      store_category_source: "user",
      store_category_user_edited_at: editedAt,
    });
    expect(lists?.pages[0]?.data[0]).toMatchObject({
      merchant: "Cafe Nuevo",
      merchant_user_edited_at: editedAt,
      store_category_id: "cat-2",
      store_category_source: "user",
      store_category_user_edited_at: editedAt,
    });
  });

  it("updates line item edits with field-level markers", () => {
    const editedAt = "2026-05-20T12:00:00Z";
    const detail = applyOptimisticDetail(
      baseDetail,
      {
        items: [
          {
            id: "item-1",
            is_flagged: true,
            item_category_id: "item-cat-2",
            name: "Flat white",
            total_price_minor: 6500,
          },
        ],
      },
      editedAt,
    );

    expect(detail.items[0]).toMatchObject({
      is_flagged: true,
      item_category_id: "item-cat-2",
      item_category_user_edited_at: editedAt,
      name: "Flat white",
      name_user_edited_at: editedAt,
      total_price_minor: 6500,
    });
  });

  it("can restore cached snapshots after a failed edit", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { gcTime: Infinity, retry: false } },
    });
    queryClient.setQueryData(transactionKeys.detail("txn-1"), baseDetail);
    queryClient.setQueryData(transactionKeys.list({}), transactionPages());

    const previousDetail = queryClient.getQueryData<TransactionDetail>(
      transactionKeys.detail("txn-1"),
    );
    const previousLists = queryClient.getQueriesData<
      InfiniteData<TransactionsPage>
    >({ queryKey: transactionKeys.lists() });

    queryClient.setQueryData(
      transactionKeys.detail("txn-1"),
      applyOptimisticDetail(
        baseDetail,
        { merchant: "Bad edit" },
        "2026-05-20T12:00:00Z",
      ),
    );
    queryClient.setQueriesData<InfiniteData<TransactionsPage>>(
      { queryKey: transactionKeys.lists() },
      (current) =>
        applyOptimisticLists(
          current,
          "txn-1",
          { merchant: "Bad edit" },
          "2026-05-20T12:00:00Z",
        ),
    );

    queryClient.setQueryData(transactionKeys.detail("txn-1"), previousDetail);
    previousLists.forEach(([queryKey, data]) => {
      queryClient.setQueryData(queryKey, data);
    });

    expect(
      queryClient.getQueryData<TransactionDetail>(
        transactionKeys.detail("txn-1"),
      ),
    ).toMatchObject({ merchant: "Cafe Central" });
    expect(
      queryClient.getQueryData<InfiniteData<TransactionsPage>>(
        transactionKeys.list({}),
      )?.pages[0]?.data[0],
    ).toMatchObject({ merchant: "Cafe Central" });
    queryClient.clear();
  });
});
