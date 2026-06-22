/**
 * Report fixtures (DM-32) — the data for the Reports surface (the 5th/last
 * analytics piece). A `PeriodReport` is a flat snapshot of a period: the grand
 * total + MoM change, the donut segments, the top-category rows, aggregate
 * counts, and a small set of typed story `cards`. Most fields REUSE
 * analyticsFixtures (SEGMENTS / TOTAL_SPEND / TRENDS_RICH); only the period-level
 * aggregates (prevTotal / change / counts / insight) + the cards are net-new.
 * Reports are flat — no drill (see REPORTS-SPEC §5).
 */
import type { TrendDirection } from "@design-system/atoms/TrendChange";
import { getCategoryToken } from "@lib/categoryTokens";
import { clpK, SEGMENTS, TOTAL_SPEND, TRENDS_RICH, type SegmentDatum, type TrendRichDatum } from "@lib/analyticsFixtures";

export type ReportCardType = "summary" | "trend" | "milestone" | "category";

export interface ReportCardDatum {
  id: string;
  type: ReportCardType;
  title: string;
  primaryValue: string;
  secondaryValue?: string;
  trend?: { direction: TrendDirection; percent: number };
  /** emoji or a pixel-icon name (resolved by the card). */
  icon?: string;
  description?: string;
}

export interface PeriodReport {
  period: string;
  total: number;
  /** previous-period grand total — drives the hero MoM delta. */
  prevTotal: number;
  change: { dir: TrendDirection; pct: number };
  segments: SegmentDatum[];
  topCategories: TrendRichDatum[];
  txnCount: number;
  itemCount: number;
  insight?: string;
  cards: ReportCardDatum[];
}

/** The four sample story cards — one per gradient type. */
export const SAMPLE_REPORT_CARDS: ReportCardDatum[] = [
  {
    id: "r-summary",
    type: "summary",
    title: "Resumen de Junio",
    primaryValue: clpK(TOTAL_SPEND),
    secondaryValue: "gasto total",
    trend: { direction: "down", percent: -12 },
    icon: "📊",
    description: "Gastaste menos que en mayo. ¡Bien hecho!",
  },
  {
    id: "r-trend",
    type: "trend",
    title: "Tu tendencia",
    primaryValue: "−12%",
    secondaryValue: "vs mayo",
    trend: { direction: "down", percent: -12 },
    icon: "📉",
    description: "Tu gasto viene bajando dos meses seguidos.",
  },
  {
    id: "r-milestone",
    type: "milestone",
    title: "¡Nuevo récord!",
    primaryValue: "42 boletas",
    secondaryValue: "tu mes más activo",
    icon: "🏆",
    description: "Escaneaste más boletas que nunca este mes.",
  },
  {
    id: "r-category",
    type: "category",
    title: "Tu rubro top",
    primaryValue: clpK(182300),
    secondaryValue: "Supermercados",
    trend: { direction: "down", percent: -9 },
    icon: getCategoryToken("supermercados").icon,
    description: "Casi la mitad de tu gasto del mes.",
  },
];

/** A full sample period report (Junio 2026). */
export const SAMPLE_REPORT: PeriodReport = {
  period: "Junio 2026",
  total: TOTAL_SPEND,
  prevTotal: 437000,
  change: { dir: "down", pct: -12 },
  segments: SEGMENTS,
  topCategories: TRENDS_RICH,
  txnCount: 42,
  itemCount: 196,
  insight: "Gastaste 12% menos que el mes pasado — tu mejor mes del año.",
  cards: SAMPLE_REPORT_CARDS,
};
