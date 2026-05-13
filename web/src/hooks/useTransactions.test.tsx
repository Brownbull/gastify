import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useUpdateTransaction, transactionKeys } from "./useTransactions";

vi.mock("@/lib/api", () => ({
  apiClient: {
    GET: vi.fn(),
    PATCH: vi.fn(),
  },
}));

import { apiClient } from "@/lib/api";

const mockPatch = vi.mocked(apiClient.PATCH);

const baseTxn = {
  id: "txn-1",
  transaction_date: "2026-05-10",
  merchant: "Cafe Central",
  merchant_user_edited_at: null,
  alias: null,
  store_category_id: "cat-1",
  store_category_user_edited_at: null,
  total_minor: 5500,
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
  items: [],
  images: [],
  created_at: "2026-05-10T12:00:00Z",
  updated_at: "2026-05-10T12:00:00Z",
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

describe("useUpdateTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies optimistic update to the detail cache", async () => {
    const { queryClient, Wrapper } = createWrapper();
    queryClient.setQueryData(transactionKeys.detail("txn-1"), baseTxn);

    mockPatch.mockResolvedValue({
      data: { ...baseTxn, merchant: "Cafe Nuevo" },
      error: undefined,
      response: new Response(),
    });

    const { result } = renderHook(() => useUpdateTransaction("txn-1"), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.mutate({ merchant: "Cafe Nuevo" });
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData(transactionKeys.detail("txn-1"));
      expect(cached).toMatchObject({ merchant: "Cafe Nuevo" });
    });
  });

  it("rolls back on error", async () => {
    const { queryClient, Wrapper } = createWrapper();
    queryClient.setQueryData(transactionKeys.detail("txn-1"), baseTxn);

    mockPatch.mockResolvedValue({
      data: undefined,
      error: { detail: "Server error" },
      response: new Response(null, { status: 500 }),
    });

    const { result } = renderHook(() => useUpdateTransaction("txn-1"), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.mutate({ merchant: "Bad Update" });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    const cached = queryClient.getQueryData(transactionKeys.detail("txn-1"));
    expect(cached).toMatchObject({ merchant: "Cafe Central" });
  });

  it("invalidates list and detail queries on settle", async () => {
    const { queryClient, Wrapper } = createWrapper();
    queryClient.setQueryData(transactionKeys.detail("txn-1"), baseTxn);

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    mockPatch.mockResolvedValue({
      data: { ...baseTxn, merchant: "Updated" },
      error: undefined,
      response: new Response(),
    });

    const { result } = renderHook(() => useUpdateTransaction("txn-1"), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.mutate({ merchant: "Updated" });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: transactionKeys.detail("txn-1") }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: transactionKeys.lists() }),
    );
  });

  it("preserves non-updated fields during optimistic update", async () => {
    const { queryClient, Wrapper } = createWrapper();
    queryClient.setQueryData(transactionKeys.detail("txn-1"), baseTxn);

    mockPatch.mockResolvedValue({
      data: { ...baseTxn, transaction_date: "2026-05-15" },
      error: undefined,
      response: new Response(),
    });

    const { result } = renderHook(() => useUpdateTransaction("txn-1"), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.mutate({ transaction_date: "2026-05-15" });
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData(transactionKeys.detail("txn-1"));
      expect(cached).toMatchObject({
        transaction_date: "2026-05-15",
        merchant: "Cafe Central",
        total_minor: 5500,
        currency: "CLP",
      });
    });
  });
});
