import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/api", () => ({ apiClient: { GET: vi.fn() } }));

import { apiClient } from "@/lib/api";
import { useItems, itemKeys } from "./useItems";
import { useUiStore } from "@/stores/uiStore";

const mockGet = vi.mocked(apiClient.GET);

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const page = (rows: unknown[]) =>
  ({ data: { data: rows, cursor: null, has_more: false }, error: undefined }) as never;

beforeEach(() => {
  mockGet.mockReset();
  useUiStore.setState({ activeScope: { kind: "personal" } });
});

describe("itemKeys", () => {
  it("encodes filters + scope into the list key", () => {
    const personal = itemKeys.list({ search: "milk" });
    expect(personal).toContain("personal");
    expect(personal).toEqual(expect.arrayContaining([{ search: "milk" }]));

    const grouped = itemKeys.list({ search: "milk" }, "g1");
    expect(grouped).toContain("g1");
    // A group scope must produce a DIFFERENT key than personal (no cache bleed).
    expect(grouped).not.toEqual(personal);
  });
});

describe("useItems", () => {
  it("fetches items in personal scope (no group_id) with filters threaded", async () => {
    mockGet.mockResolvedValue(
      page([
        {
          id: "i1",
          name: "Milk",
          qty: null,
          total_minor: 100,
          currency: "CLP",
          item_category_id: null,
          item_category_key: null,
          store_category_id: null,
          store_category_key: null,
          transaction_id: "t1",
          transaction_date: "2026-03-01",
          transaction_time: null,
          merchant: "Lider",
          created_at: "2026-03-01T00:00:00Z",
        },
      ]),
    );
    const { result } = renderHook(() => useItems({ search: "milk", merchant: "lider" }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [path, opts] = mockGet.mock.calls[0] as [string, { params: { query: Record<string, unknown> } }];
    expect(path).toBe("/api/v1/items");
    expect(opts.params.query.search).toBe("milk");
    expect(opts.params.query.merchant).toBe("lider");
    expect(opts.params.query.group_id).toBeUndefined();
    expect(result.current.data?.pages[0].data[0].name).toBe("Milk");
  });

  it("threads the active group id into the group_id param (scope correctness)", async () => {
    useUiStore.setState({ activeScope: { kind: "group", id: "grp9", name: "Casa" } });
    mockGet.mockResolvedValue(page([]));
    const { result } = renderHook(() => useItems(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [, opts] = mockGet.mock.calls[0] as [string, { params: { query: Record<string, unknown> } }];
    expect(opts.params.query.group_id).toBe("grp9");
  });

  it("throws when the API returns an error", async () => {
    mockGet.mockResolvedValue({ data: undefined, error: { detail: "boom" } } as never);
    const { result } = renderHook(() => useItems(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
