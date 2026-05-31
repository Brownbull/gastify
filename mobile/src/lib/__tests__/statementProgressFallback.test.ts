import { applyStatementStatus } from "../statementProgressFallback";
import { useStatementStore, type StatementRecord } from "../../stores/statementStore";

function statement(overrides: Partial<StatementRecord> = {}): StatementRecord {
  return {
    id: "statement-1",
    card_alias_id: null,
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
    uploaded_at: "2026-05-30T10:00:00Z",
    extracted_at: null,
    reconciled_at: null,
    created_at: "2026-05-30T10:00:00Z",
    updated_at: "2026-05-30T10:00:00Z",
    ...overrides,
  };
}

describe("applyStatementStatus", () => {
  beforeEach(() => {
    useStatementStore.getState().reset();
  });

  it("does NOT latch 'extracted' as terminal — maps to reconciling so it keeps polling", () => {
    const terminal = applyStatementStatus(statement({ status: "extracted" }));
    expect(terminal).toBe(false);
    // CRITICAL: must be 'reconciling', NOT 'completed' (else the reconciliation query
    // fires before buckets exist and the golden flow fails).
    expect(useStatementStore.getState().phase).toBe("reconciling");
  });

  it("keeps polling through extracting and reconciling", () => {
    expect(applyStatementStatus(statement({ status: "extracting" }))).toBe(false);
    expect(useStatementStore.getState().phase).toBe("extracting");
    expect(applyStatementStatus(statement({ status: "reconciling" }))).toBe(false);
    expect(useStatementStore.getState().phase).toBe("reconciling");
  });

  it("latches 'completed' as terminal and reaches the completed phase", () => {
    const terminal = applyStatementStatus(statement({ status: "completed" }));
    expect(terminal).toBe(true);
    expect(useStatementStore.getState().phase).toBe("completed");
  });

  it("latches 'failed' as terminal", () => {
    const terminal = applyStatementStatus(statement({ status: "failed", error_code: "BOOM" }));
    expect(terminal).toBe(true);
    expect(useStatementStore.getState().phase).toBe("failed");
  });

  it("latches password_required as terminal", () => {
    const terminal = applyStatementStatus(statement({ status: "password_required" }));
    expect(terminal).toBe(true);
    expect(useStatementStore.getState().phase).toBe("password_required");
  });
});
