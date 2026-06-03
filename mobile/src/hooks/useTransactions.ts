import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback } from "react";
import {
  batchDeleteTransactions,
  batchUpdateTransactions,
  getTransaction,
  listTransactions,
  updateItemFlags,
  updateTransaction,
  type BatchUpdateFields,
  type ItemFlagKind,
  type TransactionDetail,
  type TransactionFilters,
  type TransactionsPage,
  type TransactionUpdate,
} from "../lib/transactions";
import { insightsKeys } from "./insightsKeys";

export const transactionKeys = {
  all: ["transactions"] as const,
  details: () => [...transactionKeys.all, "detail"] as const,
  detail: (transactionId: string) =>
    [...transactionKeys.details(), transactionId] as const,
  lists: () => [...transactionKeys.all, "list"] as const,
  list: (filters: TransactionFilters) =>
    [...transactionKeys.lists(), filters] as const,
};

export function useTransactions(filters: TransactionFilters = {}) {
  return useInfiniteQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: ({ pageParam }) =>
      listTransactions({ cursor: pageParam, filters }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? (lastPage.cursor ?? undefined) : undefined,
  });
}

export function useTransaction(transactionId: string | undefined) {
  return useQuery({
    queryKey: transactionKeys.detail(transactionId ?? ""),
    queryFn: () => getTransaction(transactionId ?? ""),
    enabled: Boolean(transactionId),
  });
}

export function useUpdateTransaction(transactionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: TransactionUpdate) => updateTransaction(transactionId, body),
    onMutate: async (body) => {
      const editedAt = new Date().toISOString();

      await Promise.all([
        queryClient.cancelQueries({
          queryKey: transactionKeys.detail(transactionId),
        }),
        queryClient.cancelQueries({ queryKey: transactionKeys.lists() }),
      ]);

      const previousDetail = queryClient.getQueryData<TransactionDetail>(
        transactionKeys.detail(transactionId),
      );
      const previousLists = queryClient.getQueriesData<
        InfiniteData<TransactionsPage>
      >({ queryKey: transactionKeys.lists() });

      if (previousDetail) {
        queryClient.setQueryData<TransactionDetail>(
          transactionKeys.detail(transactionId),
          applyOptimisticDetail(previousDetail, body, editedAt),
        );
      }

      queryClient.setQueriesData<InfiniteData<TransactionsPage>>(
        { queryKey: transactionKeys.lists() },
        (current) => applyOptimisticLists(current, transactionId, body, editedAt),
      );

      return { previousDetail, previousLists };
    },
    onError: (_err, _body, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(
          transactionKeys.detail(transactionId),
          context.previousDetail,
        );
      }

      context?.previousLists.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: transactionKeys.detail(transactionId),
      });
      void queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
    },
  });
}

/**
 * Replace the current user's flags on a transaction item. Flags are
 * personal-only: flagged items drop out of the user's monthly insight
 * aggregates while staying on the transaction, so a successful mutation
 * refreshes both the detail cache and the insights aggregate.
 */
export function useUpdateItemFlags(transactionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      flags,
    }: {
      itemId: string;
      flags: ItemFlagKind[];
    }) => updateItemFlags(transactionId, itemId, flags),
    onSuccess: (data) => {
      queryClient.setQueryData<TransactionDetail>(
        transactionKeys.detail(transactionId),
        data,
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: insightsKeys.all });
    },
  });
}

export function useBatchUpdateTransactions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      transactionIds,
      updates,
    }: {
      transactionIds: string[];
      updates: BatchUpdateFields;
    }) => batchUpdateTransactions(transactionIds, updates),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      void queryClient.invalidateQueries({ queryKey: insightsKeys.all });
    },
  });
}

export function useBatchDeleteTransactions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transactionIds: string[]) =>
      batchDeleteTransactions(transactionIds),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      void queryClient.invalidateQueries({ queryKey: insightsKeys.all });
    },
  });
}

export function useInvalidateTransactionsAfterScan() {
  const queryClient = useQueryClient();

  return useCallback((transactionId?: string | null) => {
    void queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
    if (transactionId) {
      void queryClient.invalidateQueries({
        queryKey: transactionKeys.detail(transactionId),
      });
    }
  }, [queryClient]);
}

export function applyOptimisticDetail(
  detail: TransactionDetail,
  body: TransactionUpdate,
  editedAt: string,
): TransactionDetail {
  const next: TransactionDetail = {
    ...detail,
    ...(body.card_alias_id !== undefined && {
      card_alias_id: body.card_alias_id,
    }),
    ...(body.city !== undefined && { city: body.city }),
    ...(body.country !== undefined && { country: body.country }),
    ...(body.currency !== undefined && { currency: body.currency ?? detail.currency }),
    ...(body.discount_total_minor !== undefined && {
      discount_total_minor: body.discount_total_minor,
    }),
    ...(body.gross_total_minor !== undefined && {
      gross_total_minor: body.gross_total_minor,
    }),
    ...(body.merchant != null && {
      merchant: body.merchant,
      merchant_user_edited_at: editedAt,
    }),
    ...(body.receipt_type !== undefined && { receipt_type: body.receipt_type }),
    ...(body.reconstructed_total_minor !== undefined && {
      reconstructed_total_minor: body.reconstructed_total_minor,
    }),
    ...(body.store_category_id !== undefined && {
      store_category_id: body.store_category_id,
      store_category_source: "user",
      store_category_user_edited_at: editedAt,
    }),
    ...(body.total_minor != null && { total_minor: body.total_minor }),
    ...(body.transaction_date != null && {
      transaction_date: body.transaction_date,
    }),
    ...(body.transaction_time !== undefined && {
      transaction_time: body.transaction_time,
    }),
  };

  if (body.items) {
    next.items = detail.items.map((item) => {
      const patch = body.items?.find((candidate) => candidate.id === item.id);
      if (!patch) return item;

      return {
        ...item,
        ...(patch.category_source !== undefined && {
          category_source: patch.category_source,
        }),
        ...(patch.discount_label !== undefined && {
          discount_label: patch.discount_label,
        }),
        ...(patch.discount_minor !== undefined && {
          discount_minor: patch.discount_minor,
        }),
        ...(patch.is_flagged !== undefined && {
          is_flagged: patch.is_flagged ?? item.is_flagged,
        }),
        ...(patch.item_category_id !== undefined && {
          item_category_id: patch.item_category_id,
          item_category_user_edited_at: editedAt,
        }),
        ...(patch.name != null && {
          name: patch.name,
          name_user_edited_at: editedAt,
        }),
        ...(patch.qty !== undefined && { qty: patch.qty }),
        ...(patch.subcategory !== undefined && {
          subcategory: patch.subcategory,
        }),
        ...(patch.total_price_minor !== undefined && {
          total_price_minor: patch.total_price_minor ?? item.total_price_minor,
        }),
        ...(patch.unit_price_minor !== undefined && {
          unit_price_minor: patch.unit_price_minor,
        }),
      };
    });
  }

  return next;
}

export function applyOptimisticLists(
  current: InfiniteData<TransactionsPage> | undefined,
  transactionId: string,
  body: TransactionUpdate,
  editedAt: string,
): InfiniteData<TransactionsPage> | undefined {
  if (!current) return current;

  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      data: page.data.map((item) => {
        if (item.id !== transactionId) return item;

        return {
          ...item,
          ...(body.card_alias_id !== undefined && {
            card_alias_id: body.card_alias_id,
          }),
          ...(body.city !== undefined && { city: body.city }),
          ...(body.country !== undefined && { country: body.country }),
          ...(body.currency !== undefined && {
            currency: body.currency ?? item.currency,
          }),
          ...(body.discount_total_minor !== undefined && {
            discount_total_minor: body.discount_total_minor,
          }),
          ...(body.gross_total_minor !== undefined && {
            gross_total_minor: body.gross_total_minor,
          }),
          ...(body.merchant != null && {
            merchant: body.merchant,
            merchant_user_edited_at: editedAt,
          }),
          ...(body.receipt_type !== undefined && {
            receipt_type: body.receipt_type,
          }),
          ...(body.reconstructed_total_minor !== undefined && {
            reconstructed_total_minor: body.reconstructed_total_minor,
          }),
          ...(body.store_category_id !== undefined && {
            store_category_id: body.store_category_id,
            store_category_source: "user",
            store_category_user_edited_at: editedAt,
          }),
          ...(body.total_minor != null && {
            total_minor: body.total_minor,
          }),
          ...(body.transaction_date != null && {
            transaction_date: body.transaction_date,
          }),
          ...(body.transaction_time !== undefined && {
            transaction_time: body.transaction_time,
          }),
        };
      }),
    })),
  };
}
