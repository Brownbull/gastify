import { useStatementStore } from "../statementStore";
import type { StatementRecord } from "../statementStore";

function statement(overrides: Partial<StatementRecord> = {}): StatementRecord {
  return {
    id: "statement-123",
    card_alias_id: "alias-1",
    status: "queued",
    original_filename: "statement.pdf",
    file_sha256: "a".repeat(64),
    content_type: "application/pdf",
    file_size_bytes: 1234,
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

describe("statementStore", () => {
  beforeEach(() => {
    useStatementStore.getState().reset();
  });

  it("tracks upload, backend progress, and completed state", () => {
    useStatementStore.getState().startUpload({
      uri: "file:///tmp/statement.pdf",
      fileName: "statement.pdf",
      mimeType: "application/pdf",
    });

    expect(useStatementStore.getState().phase).toBe("uploading");
    expect(useStatementStore.getState().progressPct).toBe(5);

    useStatementStore.getState().uploadComplete({
      statement: statement(),
      duplicate: false,
      queued: true,
      password_required: false,
    });

    expect(useStatementStore.getState().phase).toBe("queued");
    expect(useStatementStore.getState().statementId).toBe("statement-123");
    expect(useStatementStore.getState().connectionStatus).toBe("connecting");

    useStatementStore.getState().receiveEvent({
      event_type: "statement_reconciling",
      statement_id: "statement-123",
      step: "reconciling",
      progress_pct: 80,
    });

    expect(useStatementStore.getState().phase).toBe("reconciling");
    expect(useStatementStore.getState().progressPct).toBe(80);

    useStatementStore.getState().receiveEvent({
      event_type: "statement_completed",
      statement_id: "statement-123",
      step: "completed",
      progress_pct: 100,
      data: { status: "completed" },
    });

    expect(useStatementStore.getState().phase).toBe("completed");
    expect(useStatementStore.getState().statement?.status).toBe("completed");
    expect(useStatementStore.getState().connectionStatus).toBe("closed");
  });

  it("records password-required upload state explicitly", () => {
    useStatementStore.getState().uploadComplete({
      statement: statement({ status: "password_required", pdf_status: "password_required" }),
      duplicate: false,
      queued: false,
      password_required: true,
    });

    expect(useStatementStore.getState().phase).toBe("password_required");
    expect(useStatementStore.getState().errorCode).toBe("PASSWORD_REQUIRED");
    expect(useStatementStore.getState().progressPct).toBe(100);
  });

  it("resets statement state on demand", () => {
    useStatementStore.getState().uploadFailed("invalid_pdf", "Bad PDF");

    expect(useStatementStore.getState().phase).toBe("failed");

    useStatementStore.getState().reset();

    expect(useStatementStore.getState().phase).toBe("idle");
    expect(useStatementStore.getState().errorMessage).toBeNull();
  });
});
