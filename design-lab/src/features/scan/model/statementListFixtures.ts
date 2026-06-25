/**
 * Statements-list model — the uploaded cartolas (backend GET /statements). Each
 * lands matched (a coverage figure), still processing, or failed (e.g. an
 * encrypted PDF awaiting its password).
 */
export type StatementStatus = "matched" | "processing" | "failed";

export interface StatementSummary {
  id: string;
  /** card alias the statement is for. */
  card: string;
  /** statement period, e.g. "mayo 2026". */
  period: string;
  /** when it was uploaded, e.g. "2 jun". */
  uploadedAt: string;
  status: StatementStatus;
  /** share of lines reconciled with the ledger (matched only). */
  coverageRatio: number;
  lineCount: number;
  /** password-protected PDF (failed → needs the password). */
  encrypted?: boolean;
}

export const SAMPLE_STATEMENTS: StatementSummary[] = [
  { id: "st-1", card: "CMR Falabella", period: "mayo 2026", uploadedAt: "2 jun", status: "matched", coverageRatio: 0.86, lineCount: 42 },
  { id: "st-2", card: "Mastercard Santander", period: "mayo 2026", uploadedAt: "1 jun", status: "matched", coverageRatio: 0.71, lineCount: 31 },
  { id: "st-3", card: "Débito BCI", period: "junio 2026", uploadedAt: "hoy", status: "processing", coverageRatio: 0, lineCount: 0 },
  { id: "st-4", card: "CMR Falabella", period: "abril 2026", uploadedAt: "5 may", status: "failed", coverageRatio: 0, lineCount: 0, encrypted: true },
];
