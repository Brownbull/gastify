import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { components } from "@/lib/api-types";

export interface TransactionFilters {
  dateFrom?: string;
  dateTo?: string;
  merchant?: string;
  currency?: string;
  category?: string;
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
