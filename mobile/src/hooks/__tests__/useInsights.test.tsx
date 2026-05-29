import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { useMonthlyInsights, insightsKeys } from "../useInsights";
import { useUpdateItemFlags, transactionKeys } from "../useTransactions";

jest.mock("../../lib/insights", () => ({
  getMonthlyInsights: jest.fn(),
  currentPeriod: jest.fn(() => "2026-03"),
}));

jest.mock("../../lib/transactions", () => ({
  getTransaction: jest.fn(),
  listTransactions: jest.fn(),
  updateTransaction: jest.fn(),
  updateItemFlags: jest.fn(),
}));

import { getMonthlyInsights } from "../../lib/insights";
import { updateItemFlags } from "../../lib/transactions";

const mockGetInsights = getMonthlyInsights as jest.Mock;
const mockUpdateFlags = updateItemFlags as jest.Mock;

const monthly = {
  schema_version: "monthly-insights.v1",
  period_start: "2026-03-01",
  period_end: "2026-03-31",
  currency: "CLP",
  total_spend_minor: 276_500,
  transaction_count: 7,
  item_count: 12,
};

// gcTime: Infinity stops react-query from scheduling a garbage-collection
// timer, which would otherwise keep the jest process alive (open handle).
let queryClient: QueryClient;

beforeEach(() => {
  jest.clearAllMocks();
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
});

afterEach(() => {
  queryClient.clear();
  queryClient.unmount();
});

function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useMonthlyInsights", () => {
  it("fetches monthly insights for the period", async () => {
    mockGetInsights.mockResolvedValue(monthly);
    const { result } = renderHook(() => useMonthlyInsights("2026-03"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total_spend_minor).toBe(276_500);
    expect(mockGetInsights).toHaveBeenCalledWith("2026-03", undefined);
  });
});

describe("useUpdateItemFlags", () => {
  it("writes the returned detail to cache and invalidates insights", async () => {
    const updated = {
      id: "txn-1",
      items: [{ id: "item-1", flags: ["urgency"] }],
    };
    mockUpdateFlags.mockResolvedValue(updated);
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateItemFlags("txn-1"), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({ itemId: "item-1", flags: ["urgency"] });

    expect(mockUpdateFlags).toHaveBeenCalledWith("txn-1", "item-1", ["urgency"]);
    expect(queryClient.getQueryData(transactionKeys.detail("txn-1"))).toEqual(
      updated,
    );
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: insightsKeys.all }),
    );
  });

  it("surfaces an error when the flag PUT fails", async () => {
    mockUpdateFlags.mockRejectedValue(new Error("Failed to update item flags"));
    const { result } = renderHook(() => useUpdateItemFlags("txn-1"), {
      wrapper: Wrapper,
    });

    result.current.mutate({ itemId: "item-1", flags: ["urgency"] });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Failed to update item flags");
  });
});
