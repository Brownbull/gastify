import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Isolated mocks (separate file so the existing useInsights.test.tsx — which uses
// the real store — is untouched). Proves the D70 scope-isolation critical path:
// switching scope must thread group_id into the request AND the query key, so a
// group view never serves personal-scope cached data (or vice-versa).
vi.mock("@/lib/api", () => ({ apiClient: { GET: vi.fn() } }));
vi.mock("@/stores/uiStore", () => ({ useUiStore: vi.fn() }));

import { apiClient } from "@/lib/api";
import { useUiStore } from "@/stores/uiStore";
import { useMonthlyInsights, insightsKeys } from "./useInsights";

const mockGet = vi.mocked(apiClient.GET);
const mockUiStore = vi.mocked(useUiStore);

type Scope = { kind: "personal" } | { kind: "group"; id: string; name: string };
function setScope(scope: Scope) {
  mockUiStore.mockImplementation((selector: (s: { activeScope: Scope }) => unknown) =>
    selector({ activeScope: scope }),
  );
}

const monthly = {
  schema_version: "monthly-insights.v1",
  period_start: "2026-03-01",
  period_end: "2026-03-31",
  currency: "CLP",
  total_spend_minor: 100_000,
  transaction_count: 3,
  item_count: 5,
  top_transaction_categories: [],
  top_item_categories: [],
  gravity_centers: [],
  excluded_items: [],
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    queryClient,
    Wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

describe("useMonthlyInsights — scope isolation (D70)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: monthly, error: undefined } as never);
  });

  it("threads group_id into the request AND the query key in group scope", async () => {
    setScope({ kind: "group", id: "grp-1", name: "Casa" });
    const { queryClient, Wrapper } = createWrapper();

    const { result } = renderHook(() => useMonthlyInsights("2026-03"), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGet).toHaveBeenCalledWith("/api/v1/insights/monthly", {
      params: { query: { period: "2026-03", currency: undefined, group_id: "grp-1" } },
    });
    const keys = queryClient.getQueryCache().getAll().map((q) => q.queryKey);
    expect(keys).toContainEqual(insightsKeys.monthly("2026-03", undefined, "grp-1"));
    expect(insightsKeys.monthly("2026-03", undefined, "grp-1")).toContain("grp-1");
  });

  it("sends no group_id (personal scope key) when activeScope is personal", async () => {
    setScope({ kind: "personal" });
    const { queryClient, Wrapper } = createWrapper();

    const { result } = renderHook(() => useMonthlyInsights("2026-03"), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGet).toHaveBeenCalledWith("/api/v1/insights/monthly", {
      params: { query: { period: "2026-03", currency: undefined, group_id: undefined } },
    });
    const keys = queryClient.getQueryCache().getAll().map((q) => q.queryKey);
    expect(keys).toContainEqual(insightsKeys.monthly("2026-03"));
    expect(insightsKeys.monthly("2026-03")).toContain("personal");
  });

  it("keeps personal and group caches under distinct keys (no cross-scope bleed)", () => {
    const { queryClient } = createWrapper();
    const personalKey = insightsKeys.monthly("2026-03");
    const groupKey = insightsKeys.monthly("2026-03", undefined, "grp-1");

    expect(personalKey).not.toEqual(groupKey);

    queryClient.setQueryData(personalKey, { ...monthly, total_spend_minor: 111 });
    queryClient.setQueryData(groupKey, { ...monthly, total_spend_minor: 999 });

    expect(
      (queryClient.getQueryData(personalKey) as typeof monthly).total_spend_minor,
    ).toBe(111);
    expect(
      (queryClient.getQueryData(groupKey) as typeof monthly).total_spend_minor,
    ).toBe(999);
  });
});
