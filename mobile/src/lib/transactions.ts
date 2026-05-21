import { apiClient } from "./api";
import { readApiError } from "./apiError";
import type { components } from "./api-types";

export type TransactionListItem =
  components["schemas"]["TransactionListItem"];
export type TransactionDetail = components["schemas"]["TransactionDetail"];
export type TransactionUpdate = components["schemas"]["TransactionUpdate"];
export type TransactionItemUpdate =
  components["schemas"]["TransactionItemUpdate"];
export type TransactionsPage =
  components["schemas"]["PaginatedResponse_TransactionListItem_"];

export interface TransactionFilters {
  dateFrom?: string;
  dateTo?: string;
  merchant?: string;
  currency?: string;
  category?: string;
  cardAlias?: string;
}

export async function listTransactions({
  cursor,
  filters = {},
  limit = 25,
}: {
  cursor?: string | null;
  filters?: TransactionFilters;
  limit?: number;
} = {}): Promise<TransactionsPage> {
  const { data, error } = await apiClient.GET("/api/v1/transactions", {
    params: {
      query: {
        card_alias: filters.cardAlias || undefined,
        category: filters.category || undefined,
        currency: filters.currency || undefined,
        cursor: cursor ?? undefined,
        date_from: filters.dateFrom || undefined,
        date_to: filters.dateTo || undefined,
        limit,
        merchant: filters.merchant || undefined,
      },
    },
  });

  if (error || !data) {
    throw new Error(readApiError(error, "Failed to fetch transactions"));
  }

  return data;
}

export async function getTransaction(
  transactionId: string,
): Promise<TransactionDetail> {
  const { data, error } = await apiClient.GET(
    "/api/v1/transactions/{transaction_id}",
    {
      params: { path: { transaction_id: transactionId } },
    },
  );

  if (error || !data) {
    throw new Error(readApiError(error, "Failed to fetch transaction"));
  }

  return data;
}

export async function updateTransaction(
  transactionId: string,
  body: TransactionUpdate,
): Promise<TransactionDetail> {
  const { data, error } = await apiClient.PATCH(
    "/api/v1/transactions/{transaction_id}",
    {
      body,
      params: { path: { transaction_id: transactionId } },
    },
  );

  if (error || !data) {
    throw new Error(readApiError(error, "Failed to update transaction"));
  }

  return data;
}
