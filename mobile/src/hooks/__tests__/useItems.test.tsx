import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { itemKeys, useItems } from "../useItems";
import { useScopeStore } from "../../stores/scopeStore";

jest.mock("../../lib/items", () => ({
  listItems: jest.fn(),
}));

import { listItems } from "../../lib/items";

const mockListItems = listItems as jest.Mock;

const page = { data: [], cursor: null, has_more: false };

// gcTime: Infinity stops react-query from scheduling a garbage-collection timer
// that would otherwise keep the jest process alive (open handle).
let queryClient: QueryClient;

beforeEach(() => {
  jest.clearAllMocks();
  useScopeStore.getState().reset();
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
    },
  });
});

afterEach(() => {
  queryClient.clear();
  queryClient.unmount();
  useScopeStore.getState().reset();
});

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useItems", () => {
  it("fetches the personal items list with no group id", async () => {
    mockListItems.mockResolvedValue(page);
    const filters = { search: "milk" };

    const { result } = renderHook(() => useItems(filters), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockListItems).toHaveBeenCalledWith({
      cursor: null,
      filters,
      groupId: undefined,
    });
    expect(
      queryClient.getQueryData(itemKeys.list(filters, undefined)),
    ).toBeTruthy();
  });

  it("threads the active group id into the query (D70 whole-app scope)", async () => {
    useScopeStore.getState().setActiveScope({
      kind: "group",
      id: "grp-1",
      name: "Casa",
    });
    mockListItems.mockResolvedValue(page);
    const filters = { search: "milk" };

    const { result } = renderHook(() => useItems(filters), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockListItems).toHaveBeenCalledWith({
      cursor: null,
      filters,
      groupId: "grp-1",
    });
    // The group id is also part of the cache key so personal/group lists never collide.
    expect(
      queryClient.getQueryData(itemKeys.list(filters, "grp-1")),
    ).toBeTruthy();
    expect(
      queryClient.getQueryData(itemKeys.list(filters, undefined)),
    ).toBeUndefined();
  });
});
