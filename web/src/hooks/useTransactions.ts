import { useInfiniteQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export interface TransactionFilters {
  dateFrom?: string;
  dateTo?: string;
  merchant?: string;
  currency?: string;
}

export const transactionKeys = {
  all: ["transactions"] as const,
  lists: () => [...transactionKeys.all, "list"] as const,
  list: (filters: TransactionFilters) =>
    [...transactionKeys.lists(), filters] as const,
  details: () => [...transactionKeys.all, "detail"] as const,
  detail: (id: string) => [...transactionKeys.details(), id] as const,
};

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
