import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useMonthlyInsights, insightsKeys, currentPeriod } from "./useInsights";
import {
  useUpdateItemFlags,
  transactionKeys,
} from "./useTransactions";

vi.mock("@/lib/api", () => ({
  apiClient: {
    GET: vi.fn(),
    PUT: vi.fn(),
  },
}));

import { apiClient } from "@/lib/api";

const mockGet = vi.mocked(apiClient.GET);
const mockPut = vi.mocked(apiClient.PUT);

const monthly = {
  schema_version: "monthly-insights.v1",
  period_start: "2026-03-01",
  period_end: "2026-03-31",
  currency: "CLP",
  total_spend_minor: 276_500,
  transaction_count: 7,
  item_count: 12,
  top_transaction_categories: [],
  top_item_categories: [],
  gravity_centers: [],
  excluded_items: [],
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    queryClient,
    Wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

describe("currentPeriod", () => {
  it("formats a date as YYYY-MM", () => {
    expect(currentPeriod(new Date("2026-03-09T12:00:00Z"))).toBe("2026-03");
    expect(currentPeriod(new Date("2026-11-30T00:00:00"))).toBe("2026-11");
  });
});

describe("useMonthlyInsights", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches monthly insights for the period", async () => {
    mockGet.mockResolvedValue({ data: monthly, error: undefined } as never);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useMonthlyInsights("2026-03"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total_spend_minor).toBe(276_500);
    expect(mockGet).toHaveBeenCalledWith("/api/v1/insights/monthly", {
      params: { query: { period: "2026-03", currency: undefined } },
    });
  });

  it("surfaces an error when the request fails", async () => {
    mockGet.mockResolvedValue({ data: undefined, error: { detail: "boom" } } as never);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useMonthlyInsights("2026-03"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Failed to load insights");
  });
});

describe("useUpdateItemFlags", () => {
  beforeEach(() => vi.clearAllMocks());

  it("writes the returned detail to cache and invalidates insights", async () => {
    const updatedDetail = {
      id: "txn-1",
      items: [{ id: "item-1", flags: ["special_case"], is_flagged: true }],
    };
    mockPut.mockResolvedValue({ data: updatedDetail, error: undefined } as never);

    const { queryClient, Wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateItemFlags("txn-1"), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({ itemId: "item-1", flags: ["special_case"] });

    expect(mockPut).toHaveBeenCalledWith(
      "/api/v1/transactions/{transaction_id}/items/{item_id}/flags",
      {
        params: { path: { transaction_id: "txn-1", item_id: "item-1" } },
        body: { flags: ["special_case"] },
      },
    );
    expect(queryClient.getQueryData(transactionKeys.detail("txn-1"))).toEqual(
      updatedDetail,
    );
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: insightsKeys.all,
      }),
    );
  });

  it("surfaces an error when the flag PUT fails (no silent failure)", async () => {
    mockPut.mockResolvedValue({ data: undefined, error: { detail: "nope" } } as never);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateItemFlags("txn-1"), {
      wrapper: Wrapper,
    });

    result.current.mutate({ itemId: "item-1", flags: ["urgency"] });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Failed to update item flags");
  });
});

describe("insights cache eviction on sign-out", () => {
  it("queryClient.clear removes cached analytics (sign-out isolation)", () => {
    const { queryClient } = createWrapper();
    queryClient.setQueryData(insightsKeys.monthly("2026-03"), monthly);
    expect(queryClient.getQueryData(insightsKeys.monthly("2026-03"))).toBeDefined();

    queryClient.clear();

    expect(
      queryClient.getQueryData(insightsKeys.monthly("2026-03")),
    ).toBeUndefined();
  });
});
