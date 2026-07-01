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
import { useStatementStore } from "@/stores/statementStore";
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
    POST: vi.fn(),
    PATCH: vi.fn(),
    DELETE: vi.fn(),
  },
  setAuthToken: vi.fn(),
  RATE_LIMIT_EVENT: "gastify:rate-limited",
}));

const mockGet = vi.mocked(apiClient.GET);
const mockPost = vi.mocked(apiClient.POST);

const alias = {
  id: "alias-1",
  name: "Personal credit",
  created_at: "2026-05-27T12:00:00Z",
  archived_at: null,
};

const queuedStatement = {
  id: "statement-1",
  card_alias_id: "alias-1",
  status: "queued",
  original_filename: "statement.pdf",
  file_sha256: "sha",
  content_type: "application/pdf",
  updated_at: "2026-05-27T12:00:00Z",
} as const;

const statementOnlyCandidate = {
  transaction_date: "2026-05-08",
  transaction_time: null,
  merchant: "Farmacia Online",
  store_category_id: null,
  store_category_source: "unknown",
  store_category_confidence: null,
  store_category_mapping_id: null,
  total_minor: 12990,
  discount_total_minor: null,
  gross_total_minor: null,
  reconstructed_total_minor: null,
  currency: "CLP",
  receipt_type: "statement",
  country: null,
  city: null,
  card_alias_id: "alias-1",
  recurrence_kind: "none",
  recurrence_interval: null,
  term_current: null,
  term_total: null,
  recurrence_label: null,
  recurrence_source: "none",
  recurrence_confidence: null,
  merchant_source: "mapping",
  llm_tokens_in: null,
  llm_tokens_out: null,
  llm_cost_usd: null,
  scan_duration_ms: null,
  llm_latency_ms: null,
  queue_wait_ms: null,
  thumbnail_gen_ms: null,
  items: [
    {
      name: "Unidentified statement item",
      qty: 1,
      unit_price_minor: 12990,
      total_price_minor: 12990,
      item_category_id: null,
      subcategory: null,
      category_source: "statement_unidentified",
      category_confidence: null,
      is_flagged: true,
      sort_order: 0,
    },
  ],
  image_urls: [],
};

const reconciliation = {
  run: {
    id: "run-1",
    statement_id: "statement-1",
    status: "completed",
    total_statement_lines: 2,
    matched_count: 1,
    statement_only_count: 1,
    receipt_only_count: 0,
    ambiguous_count: 0,
    coverage_ratio: 0.5,
    error_code: null,
    error_message: null,
    started_at: "2026-05-27T12:01:00Z",
    completed_at: "2026-05-27T12:02:00Z",
    created_at: "2026-05-27T12:01:00Z",
    updated_at: "2026-05-27T12:02:00Z",
  },
  matched: [
    {
      verdict: {
        id: "verdict-1",
        run_id: "run-1",
        statement_line_id: "line-1",
        receipt_transaction_id: "txn-1",
        verdict: "matched",
        score: 0.96,
        reasons: ["amount_exact", "date_close"],
        created_at: "2026-05-27T12:02:00Z",
      },
      statement_line: {
        id: "line-1",
        statement_id: "statement-1",
        source_order: 1,
        row_type: "charge",
        line_date: "2026-05-05",
        description: "Jumbo Providencia",
        amount_minor: 18450,
        currency: "CLP",
        line_type: "charge",
        installment: null,
        card_alias_candidate: null,
        ledger_ready: true,
        warnings: [],
      },
      receipt_transaction: {
        id: "txn-1",
        transaction_date: "2026-05-05",
        merchant: "Jumbo Providencia",
        merchant_user_edited_at: null,
        total_minor: 18450,
        currency: "CLP",
        card_alias_id: "alias-1",
        receipt_type: "scan",
      },
      candidate_transaction: null,
    },
  ],
  statement_only: [
    {
      verdict: {
        id: "verdict-2",
        run_id: "run-1",
        statement_line_id: "line-2",
        receipt_transaction_id: null,
        verdict: "statement_only",
        score: null,
        reasons: ["no_receipt_candidate"],
        created_at: "2026-05-27T12:02:00Z",
      },
      statement_line: {
        id: "line-2",
        statement_id: "statement-1",
        source_order: 2,
        row_type: "charge",
        line_date: "2026-05-08",
        description: "Farmacia Online",
        amount_minor: 12990,
        currency: "CLP",
        line_type: "charge",
        installment: null,
        card_alias_candidate: null,
        ledger_ready: true,
        warnings: [],
      },
      receipt_transaction: null,
      candidate_transaction: statementOnlyCandidate,
    },
  ],
  receipt_only: [],
  ambiguous: [],
  failed: [],
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

function renderApp(initialPath = "/statements") {
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
}

async function signIn() {
  const signedInUser: MockUser = {
    email: "owner@example.com",
    getIdToken: vi.fn().mockResolvedValue("token-statement"),
  };
  authMocks.mockAuth.currentUser = signedInUser;
  await act(async () => {
    authMocks.authStateCallback?.(signedInUser);
  });
}

describe("statement route", () => {
  beforeEach(() => {
    authMocks.authStateCallback = null;
    authMocks.mockAuth.currentUser = null;
    MockEventSource.instances = [];
    queryClient.clear();
    useStatementStore.getState().reset();
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem("gastify:locale", "en");
    vi.stubGlobal("EventSource", MockEventSource);
    vi.stubGlobal("fetch", vi.fn());
    authMocks.mockFirebaseSignOut.mockResolvedValue(undefined);
    mockGet.mockImplementation(async (path) => {
      const route = String(path);
      if (route === "/api/v1/card-aliases") return apiOk([alias]);
      if (route === "/api/v1/statements") return apiOk([]);
      if (route === "/api/v1/statements/{statement_id}/reconciliation") {
        return apiOk(reconciliation);
      }
      throw new Error(`Unhandled GET ${route}`);
    });
    mockPost.mockImplementation(async (path, options) => {
      const route = String(path);
      if (route === "/api/v1/transactions") {
        return apiOk({
          id: "txn-created",
          ...(options as { body?: unknown }).body,
          created_at: "2026-05-27T12:03:00Z",
          updated_at: "2026-05-27T12:03:00Z",
        });
      }
      if (route === "/api/v1/statements/{statement_id}/process") {
        return apiOk(queuedStatement);
      }
      throw new Error(`Unhandled POST ${route}`);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("gates upload on consent, streams completion, renders buckets, and creates a statement-only transaction", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          statement: queuedStatement,
          duplicate: false,
          queued: true,
          password_required: false,
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );

    renderApp();
    await signIn();

    // "Statements" appears as both the mobile shell-header title and the content h1.
    expect((await screen.findAllByRole("heading", { name: "Statements" })).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Start statement scan" })).toBeDisabled();

    await user.selectOptions(screen.getByLabelText("Card alias"), "alias-1");
    const input = document.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("statement file input not found");
    }
    await user.upload(input, new File(["pdf"], "statement.pdf", {
      type: "application/pdf",
    }));
    const consentCheckbox = screen.getByLabelText(/I consent to AI processing/i);
    await user.click(consentCheckbox);
    await user.click(screen.getByRole("button", { name: "Start statement scan" }));

    await waitFor(() => expect(screen.getByText("No PDF selected")).toBeInTheDocument());
    expect(consentCheckbox).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Start statement scan" })).toBeDisabled();
    expect(screen.getByText("Alias selected: Personal credit")).toBeInTheDocument();

    const resetInput = document.querySelector('input[type="file"]');
    if (!(resetInput instanceof HTMLInputElement)) {
      throw new Error("reset statement file input not found");
    }
    await user.upload(resetInput, new File(["pdf-2"], "statement-2.pdf", {
      type: "application/pdf",
    }));
    expect(screen.getByRole("button", { name: "Start statement scan" })).toBeDisabled();
    await user.click(consentCheckbox);
    expect(screen.getByRole("button", { name: "Start statement scan" })).toBeEnabled();

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));
    expect(MockEventSource.instances[0].url).toContain("token=token-statement");

    await act(async () => {
      MockEventSource.instances[0].emit("statement_completed", {
        event_type: "statement_completed",
        statement_id: "statement-1",
        step: "completed",
        progress_pct: 100,
        data: {
          status: "completed",
          matched_count: 1,
          statement_only_count: 1,
          coverage_ratio: 0.5,
        },
      });
    });

    expect(await screen.findByText("50%")).toBeInTheDocument();
    expect(screen.queryByText("queued")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Matched \(1\)/ })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Statement only \(1\)/ }));
    expect(await screen.findAllByText("Farmacia Online")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Add transaction" }));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        "/api/v1/transactions",
        expect.objectContaining({
          body: expect.objectContaining({
            merchant: "Farmacia Online",
            receipt_type: "statement",
          }),
        }),
      ),
    );
  });

  it("shows password-required state and can reprocess with a password", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          statement: {
            ...queuedStatement,
            status: "password_required",
          },
          duplicate: false,
          queued: false,
          password_required: true,
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );

    renderApp();
    await signIn();

    const input = document.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("statement file input not found");
    }
    await user.upload(input, new File(["pdf"], "encrypted.pdf", {
      type: "application/pdf",
    }));
    await user.click(screen.getByLabelText(/I consent to AI processing/i));
    await user.click(screen.getByRole("button", { name: "Start statement scan" }));

    expect(await screen.findByText("Statement PDF requires a password")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("Statement password"), "secret");
    await user.click(screen.getByRole("button", { name: "Unlock and process" }));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        "/api/v1/statements/{statement_id}/process",
        expect.objectContaining({
          body: { password: "secret" },
        }),
      ),
    );
  });
});
