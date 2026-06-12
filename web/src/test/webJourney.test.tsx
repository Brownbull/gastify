import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router";
import { AuthProvider } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { routeTree } from "@/routeTree.gen";
import { useScanStore } from "@/stores/scanStore";
import { MockEventSource } from "@/test/mocks";
import type { ReactNode } from "react";

interface MockUser {
  email: string;
  getIdToken: ReturnType<typeof vi.fn>;
}

const authMocks = vi.hoisted(() => ({
  mockFirebaseSignOut: vi.fn(),
  mockSignInWithPopup: vi.fn(),
  authStateCallback: null as ((user: MockUser | null) => void) | null,
  mockAuth: { currentUser: null as MockUser | null },
}));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (_auth: unknown, cb: (user: MockUser | null) => void) => {
    authMocks.authStateCallback = cb;
    return vi.fn();
  },
  signInWithPopup: (...args: unknown[]) =>
    authMocks.mockSignInWithPopup(...args),
  signOut: (...args: unknown[]) => authMocks.mockFirebaseSignOut(...args),
}));

vi.mock("@/lib/firebase", () => ({
  auth: authMocks.mockAuth,
  googleProvider: {},
}));

vi.mock("@/lib/api", () => ({
  apiClient: {
    GET: vi.fn(),
    PATCH: vi.fn(),
  },
  setAuthToken: vi.fn(),
  RATE_LIMIT_EVENT: "gastify:rate-limited",
}));

const mockGet = vi.mocked(apiClient.GET);
const mockPatch = vi.mocked(apiClient.PATCH);

const category = {
  id: "cat-grocery",
  key: "grocery",
  display_labels: { en: "Grocery" },
  is_sensitive: false,
  sort_order: 1,
};

const baseTransaction = {
  id: "txn-1",
  transaction_date: "2026-05-13",
  transaction_time: null,
  merchant: "Jumbo Providencia",
  merchant_user_edited_at: null,
  alias: null,
  store_category_id: "cat-grocery",
  store_category_user_edited_at: null,
  total_minor: 18450,
  currency: "CLP",
  amount_usd_minor: 1950,
  fx_rate_to_usd: "0.001057",
  fx_captured_at: null,
  card_alias_id: null,
  receipt_type: "scan",
  thumbnail_url: null,
  country: "CL",
  city: "Santiago",
  recurrence_kind: "none",
  recurrence_interval: null,
  term_current: null,
  term_total: null,
  recurrence_label: null,
  recurrence_source: "none",
  recurrence_confidence: null,
  recurrence_user_edited_at: null,
  llm_tokens_in: 500,
  llm_tokens_out: 100,
  llm_cost_usd: "0.02",
  scan_duration_ms: 1240,
  llm_latency_ms: 900,
  queue_wait_ms: 40,
  thumbnail_gen_ms: 80,
  items: [
    {
      id: "item-1",
      name: "Leche",
      name_user_edited_at: null,
      qty: 1,
      unit_price_minor: 1990,
      total_price_minor: 1990,
      item_category_id: "cat-grocery",
      item_category_user_edited_at: null,
      subcategory: "Dairy",
      category_source: "ai",
      is_flagged: false,
      sort_order: 0,
    },
  ],
  images: [],
  created_at: "2026-05-13T12:00:00Z",
  updated_at: "2026-05-13T12:00:00Z",
};

function apiOk(data: unknown) {
  return { data, error: undefined, response: new Response() } as never;
}

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

function renderApp(initialPath: string) {
  const router = createRouter({
    routeTree,
    context: {},
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });

  render(
    <Wrapper>
      <RouterProvider router={router} />
    </Wrapper>,
  );

  return router;
}

describe("web golden journey", () => {
  beforeEach(() => {
    authMocks.authStateCallback = null;
    authMocks.mockAuth.currentUser = null;
    MockEventSource.instances = [];
    queryClient.clear();
    useScanStore.getState().reset();
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem("gastify:locale", "en");
    vi.stubGlobal("EventSource", MockEventSource);
    authMocks.mockFirebaseSignOut.mockResolvedValue(undefined);
    authMocks.mockSignInWithPopup.mockResolvedValue(undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "scan-1",
            ownership_scope_id: "scope-1",
            status: "submitted",
            original_filename: "receipt.jpg",
            content_type: "image/jpeg",
            file_size_bytes: 1024,
            image_path: "receipts/scan-1.jpg",
            thumbnail_path: null,
            submitted_at: "2026-05-13T12:00:00Z",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("signs in, scans, streams, views, edits, and signs out with local data evicted", async () => {
    const user = userEvent.setup();
    const signedInUser: MockUser = {
      email: "owner@example.com",
      getIdToken: vi
        .fn()
        .mockResolvedValueOnce("token-signin")
        .mockResolvedValue("token-scan"),
    };
    let transaction = { ...baseTransaction };

    mockGet.mockImplementation(async (path) => {
      const route = String(path);
      if (route === "/api/v1/reference/store-categories") {
        return apiOk([category]);
      }
      if (route === "/api/v1/transactions") {
        return apiOk({
          data: [
            {
              ...transaction,
              item_count: transaction.items.length,
            },
          ],
          cursor: null,
          has_more: false,
        });
      }
      if (route === "/api/v1/transactions/{transaction_id}") {
        return apiOk(transaction);
      }
      throw new Error(`Unhandled GET ${route}`);
    });

    mockPatch.mockImplementation(async (_path, options) => {
      const body = (options as { body?: { merchant?: string | null } }).body;
      transaction = {
        ...transaction,
        merchant: body?.merchant ?? transaction.merchant,
        merchant_user_edited_at: "2026-05-13T12:05:00Z",
        updated_at: "2026-05-13T12:05:00Z",
      };
      return apiOk(transaction);
    });

    renderApp("/sign-in");

    await act(async () => {
      authMocks.authStateCallback?.(null);
    });

    await user.click(screen.getByRole("button", { name: "Sign in with Google" }));
    expect(authMocks.mockSignInWithPopup).toHaveBeenCalledTimes(1);

    authMocks.mockAuth.currentUser = signedInUser;
    await act(async () => {
      authMocks.authStateCallback?.(signedInUser);
    });

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();

    await user.click(screen.getAllByRole("link", { name: /scan/i })[0]);
    expect(await screen.findByRole("heading", { name: "Scan Receipt" })).toBeInTheDocument();

    const input = document.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("file input not found");
    }

    await user.upload(input, new File(["receipt"], "receipt.jpg", {
      type: "image/jpeg",
    }));

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));
    expect(MockEventSource.instances[0].url).toContain("token=token-scan");

    await act(async () => {
      MockEventSource.instances[0].emit("scan_started", {
        event_type: "scan_started",
        scan_id: "scan-1",
        step: "acquire",
        progress_pct: 10,
      });
      MockEventSource.instances[0].emit("extraction_complete", {
        event_type: "extraction_complete",
        scan_id: "scan-1",
        step: "extract",
        progress_pct: 60,
      });
      MockEventSource.instances[0].emit("scan_complete", {
        event_type: "scan_complete",
        scan_id: "scan-1",
        step: "done",
        progress_pct: 100,
        data: { status: "completed" },
      });
    });

    expect(await screen.findByRole("heading", { name: "Scan Complete" })).toBeInTheDocument();
    expect(MockEventSource.instances[0].closed).toBe(true);

    await user.click(screen.getAllByRole("link", { name: /transactions/i })[0]);

    expect(await screen.findByRole("heading", { name: "Transactions" })).toBeInTheDocument();
    await user.click(await screen.findByRole("link", { name: "Jumbo Providencia" }));

    expect(await screen.findByRole("button", { name: "Jumbo Providencia" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Jumbo Providencia" }));
    const merchantInput = screen.getByDisplayValue("Jumbo Providencia");
    await user.clear(merchantInput);
    await user.type(merchantInput, "Jumbo Market");
    await user.tab();

    await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("button", { name: /Jumbo Market/ })).toBeInTheDocument();

    queryClient.setQueryData(["private"], { id: "txn-1" });
    window.localStorage.setItem("cached-user", "private");
    window.sessionStorage.setItem("draft", "merchant");

    await user.click(screen.getAllByRole("button", { name: "Sign out" })[0]);

    expect(await screen.findByRole("button", { name: "Sign in with Google" })).toBeInTheDocument();
    expect(queryClient.getQueryData(["private"])).toBeUndefined();
    expect(window.localStorage.getItem("cached-user")).toBeNull();
    expect(window.sessionStorage.getItem("draft")).toBeNull();
  });
});
