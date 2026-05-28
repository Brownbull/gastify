import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { StatementsScreen } from "../StatementsScreen";
import { useStatementDocumentPicker } from "../../hooks/useStatementDocumentPicker";
import {
  useCardAliases,
  useCreateCardAlias,
  useCreateStatementTransaction,
  useProcessStatement,
  useReconcileStatement,
  useStatementReconciliation,
  useStatementUpload,
  useStatements,
} from "../../hooks/useStatements";
import { useStatementProgressSocket } from "../../hooks/useStatementProgressSocket";
import { useStatementStore, type StatementRecord } from "../../stores/statementStore";
import type { StatementReconciliationResponse } from "../../lib/statements";

jest.mock("../../hooks/useStatementDocumentPicker", () => ({
  useStatementDocumentPicker: jest.fn(),
}));

jest.mock("../../hooks/useStatementProgressSocket", () => ({
  useStatementProgressSocket: jest.fn(),
}));

jest.mock("../../hooks/useStatements", () => ({
  useCardAliases: jest.fn(),
  useCreateCardAlias: jest.fn(),
  useCreateStatementTransaction: jest.fn(),
  useProcessStatement: jest.fn(),
  useReconcileStatement: jest.fn(),
  useStatementReconciliation: jest.fn(),
  useStatementUpload: jest.fn(),
  useStatements: jest.fn(),
}));

function statement(overrides: Partial<StatementRecord> = {}): StatementRecord {
  return {
    id: "statement-1",
    card_alias_id: "alias-1",
    status: "queued",
    original_filename: "statement.pdf",
    file_sha256: "a".repeat(64),
    content_type: "application/pdf",
    file_size_bytes: 2048,
    ai_processing_consent: true,
    issuer: null,
    period_start: null,
    period_end: null,
    closing_date: null,
    due_date: null,
    currency: "CLP",
    total_debit_minor: null,
    total_credit_minor: null,
    payment_due_minor: null,
    pdf_status: "readable",
    is_encrypted: false,
    page_count: 1,
    confidence: null,
    warnings: [],
    error_code: null,
    uploaded_at: "2026-05-27T10:00:00Z",
    extracted_at: null,
    reconciled_at: null,
    created_at: "2026-05-27T10:00:00Z",
    updated_at: "2026-05-27T10:00:00Z",
    ...overrides,
  };
}

const reconciliation: StatementReconciliationResponse = {
  run: {
    id: "run-1",
    statement_id: "statement-1",
    status: "completed",
    total_statement_lines: 3,
    matched_count: 2,
    statement_only_count: 1,
    receipt_only_count: 1,
    ambiguous_count: 0,
    coverage_ratio: 0.88,
    error_code: null,
    error_message: null,
    started_at: null,
    completed_at: null,
    created_at: "2026-05-27T10:01:00Z",
    updated_at: "2026-05-27T10:01:00Z",
  },
  matched: [],
  statement_only: [
    {
      verdict: {
        id: "verdict-1",
        run_id: "run-1",
        statement_line_id: "line-1",
        receipt_transaction_id: null,
        verdict: "statement_only",
        score: null,
        reasons: ["no_receipt_match"],
        created_at: "2026-05-27T10:01:00Z",
      },
      statement_line: {
        id: "line-1",
        statement_id: "statement-1",
        source_order: 1,
        row_type: "charge",
        line_date: "2026-05-20",
        description: "UNKNOWN SHOP",
        amount_minor: 12990,
        currency: "CLP",
        line_type: "charge",
        installment: null,
        card_alias_candidate: null,
        ledger_ready: true,
        warnings: [],
      },
      receipt_transaction: null,
      candidate_transaction: {
        transaction_date: "2026-05-20",
        transaction_time: null,
        merchant: "UNKNOWN SHOP",
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
        merchant_source: null,
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
            category_source: "statement_unidentified",
            is_flagged: true,
            sort_order: 0,
            subcategory: null,
            discount_label: null,
            discount_minor: null,
          },
        ],
        image_urls: [],
      },
    },
  ],
  receipt_only: [],
  ambiguous: [],
  failed: [],
};

describe("StatementsScreen", () => {
  const choosePdf = jest.fn();
  const uploadStatement = jest.fn();
  const createTransaction = jest.fn();
  const createAlias = jest.fn();
  const processStatement = jest.fn();
  const reconcileStatement = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useStatementStore.getState().reset();
    jest.mocked(useStatementProgressSocket).mockImplementation(() => undefined);
    jest.mocked(useStatementDocumentPicker).mockReturnValue({ choosePdf });
    jest.mocked(useCardAliases).mockReturnValue({
      data: [{ id: "alias-1", name: "Personal card", created_at: "now", archived_at: null }],
      isLoading: false,
    } as never);
    jest.mocked(useStatements).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    jest.mocked(useCreateCardAlias).mockReturnValue({
      isPending: false,
      mutateAsync: createAlias.mockResolvedValue({
        id: "alias-2",
        name: "Travel card",
        created_at: "now",
        archived_at: null,
      }),
    } as never);
    jest.mocked(useStatementUpload).mockReturnValue({
      isUploading: false,
      uploadStatement,
      cancelUpload: jest.fn(),
    } as never);
    jest.mocked(useProcessStatement).mockReturnValue({
      isPending: false,
      error: null,
      mutateAsync: processStatement,
    } as never);
    jest.mocked(useStatementReconciliation).mockReturnValue({
      data: undefined,
      error: null,
      isLoading: false,
    } as never);
    jest.mocked(useReconcileStatement).mockReturnValue({
      isPending: false,
      mutateAsync: reconcileStatement,
    } as never);
    jest.mocked(useCreateStatementTransaction).mockReturnValue({
      isPending: false,
      mutateAsync: createTransaction,
    } as never);
  });

  it("requires a fresh PDF and consent for each statement upload", async () => {
    choosePdf.mockResolvedValue({
      uri: "file:///tmp/statement.pdf",
      fileName: "statement.pdf",
      mimeType: "application/pdf",
      fileSize: 2048,
    });
    uploadStatement.mockResolvedValue({
      statement: statement(),
      duplicate: false,
      queued: true,
      password_required: false,
    });

    render(<StatementsScreen />);

    expect(screen.getByTestId("statement-start-scan-button").props.accessibilityState.disabled)
      .toBe(true);

    fireEvent.press(screen.getByTestId("statement-choose-pdf-button"));
    await waitFor(() => expect(screen.getByText("statement.pdf")).toBeTruthy());
    expect(screen.getByTestId("statement-start-scan-button").props.accessibilityState.disabled)
      .toBe(true);

    fireEvent(screen.getByTestId("statement-ai-consent-switch"), "valueChange", true);
    expect(screen.getByTestId("statement-start-scan-button").props.accessibilityState.disabled)
      .toBe(false);

    fireEvent.press(screen.getByTestId("statement-start-scan-button"));

    await waitFor(() =>
      expect(uploadStatement).toHaveBeenCalledWith({
        asset: {
          uri: "file:///tmp/statement.pdf",
          fileName: "statement.pdf",
          mimeType: "application/pdf",
          fileSize: 2048,
        },
        cardAliasId: null,
        password: null,
        aiProcessingConsent: true,
      }),
    );
    await waitFor(() => expect(screen.getByText("No PDF selected")).toBeTruthy());
    expect(screen.getByTestId("statement-start-scan-button").props.accessibilityState.disabled)
      .toBe(true);
  });

  it("renders reconciliation buckets and can create statement-only candidates", async () => {
    useStatementStore.getState().selectStatement(statement({ status: "completed" }));
    jest.mocked(useStatementReconciliation).mockReturnValue({
      data: reconciliation,
      error: null,
      isLoading: false,
    } as never);
    createTransaction.mockResolvedValue({ id: "txn-1" });

    render(<StatementsScreen />);

    expect(screen.getByTestId("statement-reconciliation-panel")).toBeTruthy();
    expect(screen.getByText("88%")).toBeTruthy();

    fireEvent.press(screen.getByTestId("statement-bucket-statement_only"));
    expect(screen.getAllByText("UNKNOWN SHOP").length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.press(screen.getByTestId("statement-add-transaction-verdict-1"));
    });

    expect(createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        receipt_type: "statement",
        merchant: "UNKNOWN SHOP",
        total_minor: 12990,
      }),
    );
    await waitFor(() =>
      expect(screen.getByTestId("statement-transaction-added-verdict-1")).toBeTruthy(),
    );
    expect(screen.getByText("Transaction added")).toBeTruthy();
    expect(screen.queryByTestId("statement-add-transaction-verdict-1")).toBeNull();
  });

  it("surfaces password-required state and submits password reprocessing", async () => {
    useStatementStore.getState().selectStatement(
      statement({ status: "password_required", pdf_status: "password_required" }),
    );
    processStatement.mockResolvedValue(statement({ status: "queued" }));

    render(<StatementsScreen />);

    expect(screen.getByTestId("statement-password-panel")).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("statement-unlock-password-input"), "secret");

    await act(async () => {
      fireEvent.press(screen.getByTestId("statement-unlock-button"));
    });

    expect(processStatement).toHaveBeenCalledWith({ password: "secret" });
  });
});
