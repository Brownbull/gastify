import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { components } from "@/lib/api-types";
import { insightsKeys } from "@/hooks/useInsights";

export type ItemFlagKind = NonNullable<
  components["schemas"]["TransactionItemFlagsUpdate"]["flags"]
>[number];

export interface TransactionFilters {
  dateFrom?: string;
  dateTo?: string;
  merchant?: string;
  currency?: string;
  category?: string;
  /** Origin filter: scan | manual | statement | import (receipt_type). */
  source?: "scan" | "manual" | "statement" | "import";
  /** Reconciliation filter: true = matched against a statement, false = unmatched. */
  matched?: boolean;
}

export const transactionKeys = {
  all: ["transactions"] as const,
  lists: () => [...transactionKeys.all, "list"] as const,
  list: (filters: TransactionFilters) =>
    [...transactionKeys.lists(), filters] as const,
  details: () => [...transactionKeys.all, "detail"] as const,
  detail: (id: string) => [...transactionKeys.details(), id] as const,
};

export function useTransaction(id: string) {
  return useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        "/api/v1/transactions/{transaction_id}",
        { params: { path: { transaction_id: id } } },
      );

      if (error || !data) {
        throw new Error("Failed to fetch transaction");
      }

      return data;
    },
  });
}

export function useTransactions(filters: TransactionFilters = {}) {
  return useInfiniteQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apiClient.GET("/api/v1/transactions", {
        params: {
          query: {
            cursor: pageParam ?? undefined,
            limit: 50,
            date_from: filters.dateFrom || undefined,
            date_to: filters.dateTo || undefined,
            merchant: filters.merchant || undefined,
            currency: filters.currency || undefined,
            category: filters.category || undefined,
            source: filters.source || undefined,
            matched: filters.matched ?? undefined,
          },
        },
      });

      if (error || !data) {
        throw new Error("Failed to fetch transactions");
      }

      return data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? (lastPage.cursor ?? undefined) : undefined,
  });
}

type TransactionUpdate = components["schemas"]["TransactionUpdate"];
type TransactionDetail = components["schemas"]["TransactionDetail"];
type BatchUpdateFields = components["schemas"]["BatchUpdateFields"];

export function useBatchUpdateTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transactionIds,
      updates,
    }: {
      transactionIds: string[];
      updates: BatchUpdateFields;
    }) => {
      const { data, error } = await apiClient.POST(
        "/api/v1/transactions/batch-update",
        { body: { transaction_ids: transactionIds, updates } },
      );
      if (error || !data) throw new Error("Batch update failed");
      return data;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      void queryClient.invalidateQueries({ queryKey: insightsKeys.all });
    },
  });
}

export function useBatchDeleteTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionIds: string[]) => {
      const { data, error } = await apiClient.POST(
        "/api/v1/transactions/batch-delete",
        { body: { transaction_ids: transactionIds } },
      );
      if (error || !data) throw new Error("Batch delete failed");
      return data;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      void queryClient.invalidateQueries({ queryKey: insightsKeys.all });
    },
  });
}

export function useUpdateTransaction(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: TransactionUpdate) => {
      const { data, error } = await apiClient.PATCH(
        "/api/v1/transactions/{transaction_id}",
        {
          params: { path: { transaction_id: id } },
          body,
        },
      );

      if (error || !data) {
        throw new Error("Failed to update transaction");
      }

      return data;
    },
    onMutate: async (body) => {
      await queryClient.cancelQueries({
        queryKey: transactionKeys.detail(id),
      });

      const previous = queryClient.getQueryData<TransactionDetail>(
        transactionKeys.detail(id),
      );

      if (previous) {
        const optimistic: TransactionDetail = {
          ...previous,
          ...(body.merchant != null && { merchant: body.merchant }),
          ...(body.transaction_date != null && {
            transaction_date: body.transaction_date,
          }),
          ...(body.store_category_id !== undefined && {
            store_category_id: body.store_category_id,
          }),
        };
        queryClient.setQueryData<TransactionDetail>(
          transactionKeys.detail(id),
          optimistic,
        );
      }

      return { previous };
    },
    onError: (_err, _body, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          transactionKeys.detail(id),
          context.previous,
        );
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: transactionKeys.detail(id),
      });
      void queryClient.invalidateQueries({
        queryKey: transactionKeys.lists(),
      });
    },
  });
}

/**
 * Replace the current user's flags on a single transaction item. The flag set
 * is personal-only: flagged items drop out of that user's monthly insight
 * aggregates while staying visible here, so a successful mutation invalidates
 * the insights cache to force an aggregate refresh.
 */
export function useUpdateItemFlags(transactionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      flags,
    }: {
      itemId: string;
      flags: ItemFlagKind[];
    }) => {
      const { data, error } = await apiClient.PUT(
        "/api/v1/transactions/{transaction_id}/items/{item_id}/flags",
        {
          params: {
            path: { transaction_id: transactionId, item_id: itemId },
          },
          body: { flags },
        },
      );

      if (error || !data) {
        throw new Error("Failed to update item flags");
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<TransactionDetail>(
        transactionKeys.detail(transactionId),
        data,
      );
    },
    onSettled: () => {
      // onSuccess already wrote the authoritative TransactionDetail from the
      // PUT response, so the detail query needs no extra refetch — only the
      // monthly insights aggregate has to refresh to reflect the exclusion.
      void queryClient.invalidateQueries({ queryKey: insightsKeys.all });
    },
  });
}
