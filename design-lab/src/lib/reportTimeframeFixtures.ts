/**
 * Report timeframe fixtures (DM-34) — per-timeframe report data for the four
 * periods (weekly/monthly/quarterly/annual). Density escalates with the period
 * (legacy: weekly = top-3 groups + no highlights; monthly+ = ALL groups +
 * highlights; quarterly/annual add a persona hook; annual = richest). Each report
 * carries TWO sections: establishments (store rubros) + items (item familias),
 * each a list of group cards (header + line-item rows) feeding a section donut.
 * Additive — reuses categoryTokens + SegmentDatum.
 */
import type { TrendDirection } from "@design-system/atoms/TrendChange";
import type { SegmentDatum } from "@lib/analyticsFixtures";

export type ReportPeriod = "weekly" | "monthly" | "quarterly" | "annual";

/** A line-item row inside a group card. */
export interface ReportLineItem {
  id: string; // category id (icon/label via getCategoryToken)
  amount: number;
  pct: number; // share of the group
  count: number;
  dir: TrendDirection;
  change: number; // signed %
}

/** A group card: a store rubro (establishments) or item familia (items). */
export interface ReportGroup {
  id: string; // L1 rubro or L3 familia id
  amount: number;
  pct: number; // share of the section total
  count: number;
  dir: TrendDirection;
  change: number;
  items: ReportLineItem[];
}

/** A 🏆 highlights row (monthly/quarterly/annual). */
export interface ReportHighlight {
  label: string;
  value: string;
}

export interface TimeframeReport {
  period: ReportPeriod;
  /** "Semana 23" / "Junio 2026" / "Q2 2026" / "2025". */
  title: string;
  periodLabel: string; // hero label: "Total de la semana" …
  total: number;
  change: { dir: TrendDirection; pct: number; label: string }; // vs prev period
  insight: string; // 💡 persona insight
  hook?: string; // quarterly/annual subtitle quote
  highlights?: ReportHighlight[]; // 🏆 — monthly/quarterly/annual only
  txnCount: number;
  itemCount: number;
  establishments: ReportGroup[]; // 🏪 store rubros (weekly: top-3)
  itemFamilias: ReportGroup[]; // 🛒 item familias (weekly: top-3)
}

const li = (id: string, amount: number, pct: number, count: number, dir: TrendDirection, change: number): ReportLineItem => ({ id, amount, pct, count, dir, change });

// ── Establishment groups (store rubros) — full set; weekly slices top-3 ──
const ESTABLISHMENTS: ReportGroup[] = [
  {
    id: "supermercados", amount: 182300, pct: 47, count: 15, dir: "down", change: -12,
    items: [li("Supermarket", 142000, 78, 11, "down", -9), li("Wholesale", 40300, 22, 4, "up", 6)],
  },
  {
    id: "transporte-vehiculo", amount: 74900, pct: 19, count: 5, dir: "up", change: 8,
    items: [li("GasStation", 52000, 69, 3, "up", 11), li("AutoShop", 22900, 31, 2, "down", -5)],
  },
  {
    id: "restaurantes", amount: 52100, pct: 14, count: 9, dir: "up", change: 3,
    items: [li("Restaurant", 52100, 100, 9, "up", 3)],
  },
  {
    id: "salud-bienestar", amount: 38700, pct: 10, count: 6, dir: "neutral", change: 0,
    items: [li("Pharmacy", 24500, 63, 4, "neutral", 0), li("Medical", 14200, 37, 2, "down", -3)],
  },
  {
    id: "vivienda", amount: 24500, pct: 6, count: 2, dir: "down", change: -4,
    items: [li("UtilityCompany", 24500, 100, 2, "down", -4)],
  },
  {
    id: "comercio-barrio", amount: 12020, pct: 4, count: 4, dir: "up", change: 5,
    items: [li("Almacen", 8000, 67, 3, "up", 5), li("Bakery", 4020, 33, 1, "neutral", 0)],
  },
];

// ── Item familia groups — full set; weekly slices top-3 ──
const ITEM_FAMILIAS: ReportGroup[] = [
  {
    id: "food-fresh", amount: 96000, pct: 38, count: 38, dir: "down", change: -10,
    items: [li("BreadPastry", 42000, 44, 16, "down", -7), li("DairyEggs", 32000, 33, 13, "up", 3), li("MeatSeafood", 22000, 23, 9, "up", 9)],
  },
  {
    id: "food-packaged", amount: 68000, pct: 27, count: 29, dir: "up", change: 5,
    items: [li("Beverages", 38000, 56, 17, "up", 8), li("DairyEggs", 30000, 44, 12, "down", -2)],
  },
  {
    id: "food-prepared", amount: 44000, pct: 17, count: 18, dir: "up", change: 4,
    items: [li("PreparedFood", 44000, 100, 18, "up", 4)],
  },
  {
    id: "hogar", amount: 26000, pct: 10, count: 9, dir: "neutral", change: 0,
    items: [li("hogar", 26000, 100, 9, "neutral", 0)],
  },
  {
    id: "salud-cuidado", amount: 20020, pct: 8, count: 7, dir: "down", change: -6,
    items: [li("salud-cuidado", 20020, 100, 7, "down", -6)],
  },
];

const topN = (groups: ReportGroup[], n: number) => groups.slice(0, n);

/** Donut segments for a section (group → SegmentDatum). */
export function sectionSegments(groups: ReportGroup[]): SegmentDatum[] {
  return groups.map((g) => ({ id: g.id, value: g.amount, pct: g.pct, count: g.count }));
}

// ── The four period reports (density escalates) ─────────────────────────
export const TIMEFRAME_REPORTS: Record<ReportPeriod, TimeframeReport> = {
  weekly: {
    period: "weekly",
    title: "Semana 23",
    periodLabel: "Total de la semana",
    total: 92400,
    change: { dir: "down", pct: -8, label: "vs S22" },
    insight: "¡Buen control! Redujiste 8% vs la semana anterior.",
    txnCount: 11,
    itemCount: 48,
    // weekly = top-3 by amount, no highlights
    establishments: topN(ESTABLISHMENTS, 3),
    itemFamilias: topN(ITEM_FAMILIAS, 3),
  },
  monthly: {
    period: "monthly",
    title: "Junio 2026",
    periodLabel: "Total del mes",
    total: 384520,
    change: { dir: "down", pct: -12, label: "vs Mayo" },
    insight: "Buen control este mes. Gastaste 12% menos que el anterior.",
    highlights: [
      { label: "Semana más alta", value: "Sem 23 · $108k" },
      { label: "Semana más baja", value: "Sem 21 · $62k" },
      { label: "Categoría líder", value: "Supermercados" },
      { label: "Más visitas", value: "Restaurantes · 9" },
    ],
    txnCount: 42,
    itemCount: 196,
    establishments: ESTABLISHMENTS,
    itemFamilias: ITEM_FAMILIAS,
  },
  quarterly: {
    period: "quarterly",
    title: "Q2 2026",
    periodLabel: "Total del trimestre",
    total: 1124800,
    change: { dir: "up", pct: 6, label: "vs Q1" },
    insight: "Supermercados fue tu categoría estrella con 46% del gasto total.",
    hook: "Descubre qué categoría dominó tu trimestre",
    highlights: [
      { label: "Mes más alto", value: "Junio · $385k" },
      { label: "Mes más bajo", value: "Abril · $352k" },
      { label: "Categoría líder", value: "Supermercados" },
      { label: "Mayor aumento", value: "Transporte · +18%" },
    ],
    txnCount: 128,
    itemCount: 587,
    establishments: ESTABLISHMENTS,
    itemFamilias: ITEM_FAMILIAS,
  },
  annual: {
    period: "annual",
    title: "2025",
    periodLabel: "Total del año",
    total: 4612000,
    change: { dir: "down", pct: -4, label: "vs 2024" },
    insight: "Un año completo de decisiones inteligentes. Tu mayor inversión fue en Supermercados y Transporte.",
    hook: "Un año de decisiones financieras inteligentes",
    highlights: [
      { label: "Mes más alto", value: "Diciembre · $498k" },
      { label: "Mes más bajo", value: "Febrero · $312k" },
      { label: "Categoría #1", value: "Supermercados · 47%" },
    ],
    txnCount: 512,
    itemCount: 2384,
    establishments: ESTABLISHMENTS,
    itemFamilias: ITEM_FAMILIAS,
  },
};

export const REPORT_PERIOD_META: { id: ReportPeriod; label: string }[] = [
  { id: "weekly", label: "Semanal" },
  { id: "monthly", label: "Mensual" },
  { id: "quarterly", label: "Trimestral" },
  { id: "annual", label: "Anual" },
];

/**
 * Period VALUES per timeframe — the centered values the report's step-selector
 * pages through (‹ value ›). Reference "today" = 2026-06-16; the last value of
 * each list is the current period (where the selector defaults). The mockup
 * renders the same `TIMEFRAME_REPORTS[period]` regardless of which value is
 * centered — the selector demonstrates the navigation UX.
 */
export const REPORT_PERIOD_VALUES: Record<ReportPeriod, string[]> = {
  weekly: ["Sem 21", "Sem 22", "Sem 23", "Sem 24"],
  monthly: ["Ene 2026", "Feb 2026", "Mar 2026", "Abr 2026", "May 2026", "Jun 2026"],
  quarterly: ["Q3 2025", "Q4 2025", "Q1 2026", "Q2 2026"],
  annual: ["2024", "2025", "2026"],
};
