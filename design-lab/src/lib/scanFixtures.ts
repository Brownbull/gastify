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
  /** USD per 1 unit (the write-once FX shadow; mock rates). */
  usdRate: number;
}

export const AVAILABLE_CURRENCIES: Currency[] = [
  { code: "CLP", symbol: "$", decimals: 0, usdRate: 0.00108 },
  { code: "USD", symbol: "US$", decimals: 2, usdRate: 1 },
  { code: "EUR", symbol: "€", decimals: 2, usdRate: 1.08 },
  { code: "GBP", symbol: "£", decimals: 2, usdRate: 1.27 },
];

/** USD-equivalent of an amount (the FX shadow shown next to local totals). */
export function toUsd(amount: number, code: CurrencyCode): number {
  return amount * getCurrency(code).usdRate;
}

export function getCurrency(code: CurrencyCode): Currency {
  return AVAILABLE_CURRENCIES.find((c) => c.code === code) ?? AVAILABLE_CURRENCIES[0];
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

/** The processing phases a scan moves through. */
export type ScanPhase = "uploading" | "processing" | "ready";
