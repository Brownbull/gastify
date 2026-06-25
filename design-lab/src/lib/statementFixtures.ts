/**
 * Statement-scan fixtures (DM-43) — credit-card statement (cartola) flow,
 * grounded on the CURRENT app's implementation (web/src statementStore +
 * StatementReconciliationPanel). The flow: upload PDF → processing stages
 * (queued → extracting → reconciling) → bucket-tabbed reconciliation
 * (matched / statement-only / app-only / ambiguous / failed) → summary.
 *
 * Amounts are stored in MINOR units (like the app); helpers format per currency.
 */

// ── Processing stages (mirrors statementStore StatementPhase) ───────────
export type StatementPhase =
  | "uploading"
  | "queued"
  | "extracting"
  | "reconciling"
  | "completed"
  | "password_required"
  | "failed";

export const STATEMENT_STAGE_META: { phase: StatementPhase; label: string; pct: number }[] = [
  { phase: "uploading", label: "Subiendo archivo…", pct: 15 },
  { phase: "queued", label: "En cola…", pct: 30 },
  { phase: "extracting", label: "Extrayendo transacciones…", pct: 60 },
  { phase: "reconciling", label: "Conciliando con tus gastos…", pct: 90 },
  { phase: "completed", label: "Listo", pct: 100 },
];

// ── Reconciliation model (mirrors the app's verdict buckets) ────────────
export type ReconcileVerdict = "matched" | "statement_only" | "receipt_only" | "ambiguous" | "failed";

/** A parsed line from the statement PDF. */
export interface StatementLine {
  id: string;
  date: string; // display string, e.g. "15 mar"
  description: string; // merchant text from the PDF
  amountMinor: number;
  currency: string;
  /** "2/12" cuota marker if present. */
  installment?: string;
  rowType: "charge" | "payment" | "fee" | "interest";
  /** store glyph guessed from the merchant text (defaults to store-other). */
  storeIcon?: string;
  /**
   * extraction warnings for this line (the app's StatementLine.warnings).
   * Surfaced on "failed"/illegible rows so the user sees the raw problem.
   */
  warnings?: string[];
  /** raw PDF text fragment the parser could not interpret (failed rows). */
  rawText?: string;
}

/** An existing app transaction (from receipt scans) a line may match. */
export interface ReceiptTxn {
  id: string;
  date: string;
  merchant: string;
  totalMinor: number;
  currency: string;
  /** L1 store category for the chip. */
  category: string;
  storeIcon: string;
}

/** One reconciliation item — a line, optional matched receipt, verdict. */
export interface ReconcileItem {
  verdict: ReconcileVerdict;
  /** match confidence 0–1 (matched/ambiguous). */
  score?: number;
  line?: StatementLine;
  receipt?: ReceiptTxn;
  /** why this verdict, e.g. ["Monto exacto", "Fecha cercana"]. */
  reasons?: string[];
  /**
   * category the new transaction would carry if created. Defaults to "otros";
   * the user can change it via the grouped category picker (both Solo-en-el-
   * estado lines and Por-revisar lines that get "Crear aparte").
   */
  category?: string;
  /**
   * for "ambiguous" — the multiple app transactions the matcher could not
   * disambiguate. The user picks one to conciliate, or discards / creates apart.
   */
  candidates?: ReceiptTxn[];
}

const line = (id: string, date: string, description: string, amountMinor: number, opts: { installment?: string; storeIcon?: string; warnings?: string[]; rawText?: string } = {}): StatementLine =>
  ({ id, date, description, amountMinor, currency: "CLP", rowType: "charge", storeIcon: "store-other", ...opts });
const rtxn = (id: string, date: string, merchant: string, totalMinor: number, category: string, storeIcon: string): ReceiptTxn =>
  ({ id, date, merchant, totalMinor, currency: "CLP", category, storeIcon });

/**
 * Sample reconciliation buckets (CLP, minor = pesos here since CLP has 0
 * decimals). Three working groups on the screen: Solo en el estado
 * (statement_only), Por revisar (ambiguous + failed merged), Conciliadas
 * (matched). The app-only (receipt_only) bucket is intentionally NOT shown —
 * those transactions already live in the app and need no reconciliation action.
 * Statement-only / create-apart lines carry a default category ("otros") the
 * user can change via the grouped picker.
 */
export const SAMPLE_RECONCILE: ReconcileItem[] = [
  // matched
  { verdict: "matched", score: 0.98, reasons: ["Monto exacto", "Fecha cercana"],
    line: line("l1", "15 mar", "SUPERMERCADO LIDER", 45_890, { storeIcon: "store-supermarket" }),
    receipt: rtxn("r1", "15 mar", "Líder Temuco", 45_890, "supermercados", "store-supermarket") },
  { verdict: "matched", score: 0.95, reasons: ["Monto exacto"],
    line: line("l2", "12 mar", "FARMACIA AHUMADA", 12_500, { storeIcon: "store-pharmacy" }),
    receipt: rtxn("r2", "12 mar", "Farmacia Ahumada", 12_500, "salud-bienestar", "store-pharmacy") },
  // statement_only (no app match → can create); default category "otros"
  { verdict: "statement_only", category: "entretenimiento-hospedaje", reasons: ["Sin transacción en la app"],
    line: line("l3", "18 mar", "NETFLIX.COM", 9_990, { installment: "1/1", storeIcon: "store-subscription" }) },
  { verdict: "statement_only", category: "otros", reasons: ["Sin transacción en la app"],
    line: line("l4", "20 mar", "SHELL ESTACION", 38_000, { installment: "3/3", storeIcon: "store-gas-station" }) },
  // ambiguous (matched multiple) → list candidates, pick one to conciliate
  { verdict: "ambiguous", score: 0.6, category: "otros", reasons: ["Monto exacto", "Fecha ±2 días"],
    line: line("l5", "10 mar", "UBER * EATS", 14_300, { storeIcon: "store-restaurant" }),
    candidates: [
      rtxn("c5a", "10 mar", "Uber Eats", 14_300, "restaurantes", "store-restaurant"),
      rtxn("c5b", "11 mar", "Rappi", 14_000, "restaurantes", "store-restaurant"),
    ] },
  // failed → surface the raw extraction problem (warnings + rawText)
  { verdict: "failed", category: "otros", reasons: ["No se pudo leer la línea"],
    line: line("l7", "—", "Línea ilegible", 0, {
      warnings: ["amount_unparsed", "date_missing"],
      rawText: "*** 4523 ··· TEF 0x9F2 ···· $—,—— 31/0",
    }) },
];

// ── Confirm step (the staged outcome the user commits) ──────────────────
/** what a resolved statement line becomes on submit. */
export type OutcomeKind = "created" | "conciliated" | "discarded";

/** a single staged decision from the reconcile step. */
export interface OutcomeItem {
  kind: OutcomeKind;
  line: StatementLine;
  /** category the NEW transaction carries (created). */
  category?: string;
  /** the existing app transaction a line links to (conciliated). */
  matched?: ReceiptTxn;
}

export interface OutcomeSummary {
  createdCount: number;
  conciliatedCount: number;
  discardedCount: number;
  /** sum of amounts that become / link to real transactions (created + conciliated). */
  savedTotalMinor: number;
  /** share of lines that end up registered (not discarded). */
  coverageRatio: number;
}

/**
 * A fully-resolved SAMPLE_RECONCILE — what the user staged on the Conciliar
 * step, ready to commit on Confirmar. Derived from SAMPLE_RECONCILE so the two
 * stay in sync: the two matched lines conciliate, the two statement-only lines
 * are created, the ambiguous line conciliates with its first candidate, and the
 * illegible line is discarded.
 */
export const SAMPLE_OUTCOME: OutcomeItem[] = [
  { kind: "conciliated", line: SAMPLE_RECONCILE[0].line!, matched: SAMPLE_RECONCILE[0].receipt! },
  { kind: "conciliated", line: SAMPLE_RECONCILE[1].line!, matched: SAMPLE_RECONCILE[1].receipt! },
  { kind: "created", line: SAMPLE_RECONCILE[2].line!, category: SAMPLE_RECONCILE[2].category },
  { kind: "created", line: SAMPLE_RECONCILE[3].line!, category: SAMPLE_RECONCILE[3].category },
  { kind: "conciliated", line: SAMPLE_RECONCILE[4].line!, matched: SAMPLE_RECONCILE[4].candidates![0] },
  { kind: "discarded", line: SAMPLE_RECONCILE[5].line! },
];

export function summarizeOutcome(items: OutcomeItem[]): OutcomeSummary {
  const of = (k: OutcomeKind) => items.filter((i) => i.kind === k);
  const sum = (arr: OutcomeItem[]) => arr.reduce((a, i) => a + i.line.amountMinor, 0);
  const created = of("created");
  const conciliated = of("conciliated");
  const discarded = of("discarded");
  const registered = created.length + conciliated.length;
  return {
    createdCount: created.length,
    conciliatedCount: conciliated.length,
    discardedCount: discarded.length,
    savedTotalMinor: sum(created) + sum(conciliated),
    coverageRatio: items.length > 0 ? registered / items.length : 1,
  };
}

/** Statement header summary (issuer · period · card). */
export interface StatementSummary {
  issuer: string;
  periodLabel: string;
  cardLabel: string;
  filename: string;
  fileSizeLabel: string;
}

export const SAMPLE_STATEMENT: StatementSummary = {
  issuer: "Banco Falabella",
  periodLabel: "Marzo 2026",
  cardLabel: "CMR ****4523",
  filename: "estado-cuenta-marzo-2026.pdf",
  fileSizeLabel: "2,4 MB",
};

/** Format a CLP minor amount (CLP has no decimal subunit, so minor == pesos). */
export function clpMinor(amountMinor: number): string {
  return `$${amountMinor.toLocaleString("es-CL")}`;
}
