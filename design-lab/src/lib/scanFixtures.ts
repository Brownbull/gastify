/**
 * Scan-flow fixtures (DM-42) — the Escanear flow, ported from legacy BoletApp's
 * scan feature. Three modes (single/batch/statement); the flow = mode-select →
 * capture → processing → review (QuickSave) → saving → done, + error; batch adds
 * a multi-image grid + per-receipt review; statement = "Coming soon".
 *
 * Reuses TxnItem from transactionFixtures (a scanned receipt IS a transaction).
 */
import type { TxnItem } from "./transactionFixtures";

export type ScanMode = "single" | "batch" | "statement";

export interface ScanModeMeta {
  id: ScanMode;
  icon: string;
  label: string;
  /** credit cost label. */
  cost: string;
  /** one-line description for the mode selector. */
  desc: string;
  /** statement is not yet available. */
  comingSoon?: boolean;
}

export const SCAN_MODES: ScanModeMeta[] = [
  { id: "single", icon: "scan-single", label: "Escaneo simple", cost: "1 crédito", desc: "Una boleta a la vez" },
  { id: "batch", icon: "scan-batch", label: "Escaneo por lote", cost: "1 súper c/u", desc: "Varias boletas juntas" },
  { id: "statement", icon: "scan-statement", label: "Estado de cuenta", cost: "1 súper", desc: "Importa desde tu banco", comingSoon: true },
];

/** Credit balance shown in the mode selector header. */
export interface ScanCredits {
  normal: number;
  super: number;
}

export const SCAN_CREDITS: ScanCredits = { normal: 12, super: 3 };

// ── Currency model ──────────────────────────────────────────────────────
// The active currency drives the PRICE decimal rule: CLP shows integers,
// USD/GBP/EUR allow up to 2 decimals. Editable in the review header (next to
// the hour); tapping cycles among AVAILABLE_CURRENCIES.

export type CurrencyCode = "CLP" | "USD" | "EUR" | "GBP";

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  /** max decimal places allowed in prices for this currency. */
  decimals: 0 | 2;
}

export const AVAILABLE_CURRENCIES: Currency[] = [
  { code: "CLP", symbol: "$", decimals: 0 },
  { code: "USD", symbol: "US$", decimals: 2 },
  { code: "EUR", symbol: "€", decimals: 2 },
  { code: "GBP", symbol: "£", decimals: 2 },
];

export function getCurrency(code: CurrencyCode): Currency {
  return AVAILABLE_CURRENCIES.find((c) => c.code === code) ?? AVAILABLE_CURRENCIES[0];
}

// ── Date / time stepper data ────────────────────────────────────────────
// The review header edits date + hora with inline ‹ value › steppers (real
// selection, not typing). Dates are an ordered list of recent days to page
// through; time steps by 5-minute increments, wrapping a 24h clock. Fixed,
// deterministic values (reference "today" = 2026-06-16).

export const RECENT_DATES: string[] = [
  "lun 9 jun", "mar 10 jun", "mié 11 jun", "jue 12 jun", "vie 13 jun",
  "sáb 14 jun", "dom 15 jun", "hoy",
];

/** Step a time string "HH:MM" by ±N minutes, wrapping the 24h clock. */
export function stepTime(time: string, deltaMin: number): string {
  const [h, m] = time.split(":").map((x) => parseInt(x, 10));
  let total = (((h * 60 + m + deltaMin) % 1440) + 1440) % 1440;
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Format an amount per a currency's symbol + decimal rule. */
export function formatMoney(amount: number, code: CurrencyCode): string {
  const cur = getCurrency(code);
  const n = amount.toLocaleString("es-CL", { minimumFractionDigits: cur.decimals, maximumFractionDigits: cur.decimals });
  return `${cur.symbol}${n}`;
}

/** A scanned (or scanning) receipt result. */
export interface ScanReceipt {
  id: string;
  merchant: string;
  /** L1 store-category id. */
  category: string;
  storeIcon: string;
  location: string;
  date: string;
  time: string;
  /** active currency (drives price decimal rule). */
  currency: CurrencyCode;
  total: number;
  /** 0–100; ≥80 = QuickSave path. */
  confidence: number;
  items: TxnItem[];
  /** thumbnail tile uses the store icon; a real capture would carry an image. */
  thumbnail?: string;
}

const item = (name: string, total: number, unitPrice: number, units: number, category: string, subcategory?: string): TxnItem => ({ name, total, unitPrice, units, category, subcategory });

/** Single-mode sample — high confidence → QuickSave. */
export const SAMPLE_RECEIPT: ScanReceipt = {
  id: "scan-1",
  merchant: "Supermercado Líder",
  category: "supermercados",
  storeIcon: "store-supermarket",
  location: "Villarrica",
  date: "hoy",
  time: "10:30",
  currency: "CLP",
  total: 28_350,
  confidence: 92,
  items: [
    item("Pan amasado", 4_800, 1_600, 3, "BreadPastry", "Marraqueta"),
    item("Leche entera", 8_340, 1_390, 6, "DairyEggs", "Entera 1L"),
    item("Pechuga de pollo", 8_900, 8_900, 1, "MeatSeafood"),
    item("Café molido", 4_490, 4_490, 1, "Beverages", "Tostado"),
    item("IVA (19%)", 1_820, 1_820, 1, "TaxFees"),
  ],
};

/** A low-confidence variant → forces the edit path (not QuickSave). */
export const LOW_CONFIDENCE_RECEIPT: ScanReceipt = {
  ...SAMPLE_RECEIPT,
  id: "scan-lc",
  confidence: 54,
};

/** Per-receipt status inside a batch review. */
export type BatchReceiptStatus = "ready" | "review" | "saved" | "failed";

export interface BatchReceipt extends ScanReceipt {
  status: BatchReceiptStatus;
  /** failure reason when status = "failed". */
  error?: string;
}

const br = (r: ScanReceipt, status: BatchReceiptStatus, error?: string): BatchReceipt => ({ ...r, status, error });

/** Batch-mode sample set (mixed statuses). */
export const SAMPLE_BATCH: BatchReceipt[] = [
  br({ ...SAMPLE_RECEIPT, id: "b1", merchant: "Supermercado Líder", total: 28_350, confidence: 92 }, "ready"),
  br({ ...SAMPLE_RECEIPT, id: "b2", merchant: "Unimarc", storeIcon: "store-supermarket", total: 22_400, confidence: 88, items: SAMPLE_RECEIPT.items.slice(0, 3) }, "ready"),
  br({ ...SAMPLE_RECEIPT, id: "b3", merchant: "Farmacia Ahumada", category: "salud-bienestar", storeIcon: "store-pharmacy", location: "Villarrica", total: 8_000, confidence: 61, items: SAMPLE_RECEIPT.items.slice(0, 2) }, "review"),
  br({ ...SAMPLE_RECEIPT, id: "b4", merchant: "Boleta borrosa", storeIcon: "scan-error", total: 0, confidence: 0, items: [] }, "failed", "No se pudo leer la imagen"),
];

/** Mismatch dialog data (items sum ≠ extracted total). */
export interface TotalMismatch {
  extractedTotal: number;
  itemsSum: number;
}

export const SAMPLE_TOTAL_MISMATCH: TotalMismatch = { extractedTotal: 28_350, itemsSum: 28_350 - 900 };

/** Currency mismatch dialog data. */
export interface CurrencyMismatch {
  defaultCurrency: string;
  detectedCurrency: string;
}

export const SAMPLE_CURRENCY_MISMATCH: CurrencyMismatch = { defaultCurrency: "CLP", detectedCurrency: "USD" };

/** The processing phases a scan moves through. */
export type ScanPhase = "uploading" | "processing" | "ready";

/** Error kinds (drives icon + message). */
export type ScanErrorKind = "network" | "timeout" | "unreadable" | "server";

export const SCAN_ERROR_META: Record<ScanErrorKind, { icon: string; title: string; message: string }> = {
  network: { icon: "status-offline", title: "Sin conexión", message: "Revisa tu internet e intenta de nuevo." },
  timeout: { icon: "scan-retry", title: "Tardó demasiado", message: "El escaneo se demoró más de lo esperado." },
  unreadable: { icon: "scan-error", title: "No se pudo leer", message: "La imagen está borrosa o incompleta." },
  server: { icon: "status-warning", title: "Algo salió mal", message: "Tuvimos un problema procesando la boleta." },
};
