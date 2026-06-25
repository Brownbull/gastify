/**
 * Browse-screen fixtures (Roadmap B) — date-grouped transaction list for the
 * Compras browse screen + filter state types. Legacy HistoryView grouped by date
 * (newest first, sticky headers with daily total), each row = receipt thumbnail +
 * merchant + total + meta pills (time, location, item count).
 */

import { clp, type TxnItem } from "./transactionFixtures";

// ── Filter facet definitions ───────────────────────────────────────────

export interface FilterFacetOption {
  id: string;
  label: string;
  icon?: string;
  count?: number;
  /** L1 category id — drives the per-category background color on icon chips. */
  category?: string;
}

/**
 * Facet rendering kind:
 *   - "icons"  → icon grid (multi-select up to maxSelections, category color bg)
 *   - "list"   → label chips (single-select), e.g. Location
 *   - "period" → the 4-dimension time navigator (year/quarter/month/week)
 *   - "sort"   → dimension single-select + direction up/down toggle
 */
export type FilterFacetKind = "icons" | "list" | "period" | "sort";

export interface FilterFacet {
  id: string;
  title: string;
  icon: string;
  kind?: FilterFacetKind;
  /** max simultaneous selections (icons/list). Slots shown = this. Default 1. */
  maxSelections?: number;
  options: FilterFacetOption[];
}

export const CATEGORY_FACET: FilterFacet = {
  id: "category",
  title: "Categoría",
  icon: "rubro-supermercados",
  kind: "icons",
  maxSelections: 3,
  options: [
    { id: "supermercados", label: "Supermercados", icon: "rubro-supermercados", count: 14, category: "supermercados" },
    { id: "restaurantes", label: "Restaurantes", icon: "rubro-restaurantes", count: 8, category: "restaurantes" },
    { id: "comercio-barrio", label: "Comercio de Barrio", icon: "rubro-comercio-barrio", count: 5, category: "comercio-barrio" },
    { id: "vivienda", label: "Vivienda", icon: "rubro-vivienda", count: 3, category: "vivienda" },
    { id: "salud-bienestar", label: "Salud y Bienestar", icon: "rubro-salud-bienestar", count: 2, category: "salud-bienestar" },
    { id: "transporte-vehiculo", label: "Transporte y Vehículo", icon: "rubro-transporte-vehiculo", count: 4, category: "transporte-vehiculo" },
  ],
};

// Period is a special "navigator" facet — its options are not a flat list but
// the 4 time dimensions (year/quarter/month/week). The selection value is a
// "{dim}:{value}" token (e.g. "month:2026-05"). See PERIOD_DIMENSIONS.
export const PERIOD_FACET: FilterFacet = {
  id: "period",
  title: "Período",
  icon: "chart-calendar",
  kind: "period",
  maxSelections: 1,
  options: [],
};

export const LOCATION_FACET: FilterFacet = {
  id: "location",
  title: "Ubicación",
  icon: "nav-home",
  kind: "list",
  maxSelections: 1,
  options: [
    { id: "villarrica", label: "Villarrica", count: 18 },
    { id: "temuco", label: "Temuco", count: 9 },
    { id: "santiago", label: "Santiago", count: 5 },
  ],
};

// Sort is a special facet: a single-select dimension + a direction toggle.
// Selection token = "{dim}:{dir}" (e.g. "total:desc"). Direction only applies
// once a dimension is chosen. Labels differ per screen (date vs day).
export const SORT_FACET: FilterFacet = {
  id: "sort",
  title: "Ordenar por",
  icon: "svg:sort",
  kind: "sort",
  maxSelections: 1,
  options: [
    { id: "alpha", label: "Alfabéticamente" },
    { id: "date", label: "Por fecha" },
    { id: "total", label: "Por total" },
  ],
};

/** Compras sort facet — same as items but "Por día" instead of "Por fecha". */
export const SORT_FACET_COMPRAS: FilterFacet = {
  id: "sort",
  title: "Ordenar por",
  icon: "svg:sort",
  kind: "sort",
  maxSelections: 1,
  options: [
    { id: "alpha", label: "Alfabéticamente" },
    { id: "day", label: "Por día" },
    { id: "total", label: "Por total" },
  ],
};

// ── Period navigator — one linked timeline (year / quarter / month / week) ──
//
// The 4 dimensions are projections of a single weekly calendar (W1/2025 →
// current week). A "PeriodWeek" is the atom; year/quarter/month are derived from
// each week's ISO-Thursday. The navigator steps any dimension at its own grain
// (step month = jump to first week of next month) and rolls over across higher
// dimensions automatically because every week carries its full (y,q,m) context.

export type PeriodDimId = "year" | "quarter" | "month" | "week";

export const PERIOD_DIM_NOUN: Record<PeriodDimId, string> = {
  year: "Año",
  quarter: "Trimestre",
  month: "Mes",
  week: "Semana",
};

export interface PeriodWeek {
  /** flat index into PERIOD_WEEKS (0 = W1/2025). */
  index: number;
  /** week-of-year number (1-based). */
  week: number;
  year: number;
  /** quarter 1-4 (derived from the owning month). */
  quarter: number;
  /** month 0-11. */
  month: number;
  monthFull: string;
  /** "15 jun–21 jun". */
  range: string;
}

const MES_ABBR = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MES_FULL = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

/**
 * Build the weekly calendar from W1/2025 through the week containing the fixed
 * "today" (2026-06-16 — the mockup's reference date). Monday-anchored weeks; a
 * week's owning month/quarter/year = its Thursday (ISO midweek), so boundary
 * weeks land in the calendar-correct period. Pure + deterministic (fixed UTC
 * dates only — no Date.now()).
 */
function buildPeriodWeeks(): PeriodWeek[] {
  const TODAY = Date.UTC(2026, 5, 16); // 2026-06-16
  const weeks: PeriodWeek[] = [];
  // Monday of W1/2025 = Mon 2024-12-30 (the week containing Jan 1 2025).
  const startMon = Date.UTC(2024, 11, 30);
  const DAY = 86_400_000;
  let mon = startMon;
  let weekOfYear = 1;
  let trackYear = 2025;
  let index = 0;
  while (mon <= TODAY + 6 * DAY) {
    const monDate = new Date(mon);
    const sunDate = new Date(mon + 6 * DAY);
    const thu = new Date(mon + 3 * DAY); // ISO midweek owns the period
    if (monDate.getUTCFullYear() > trackYear) {
      trackYear = monDate.getUTCFullYear();
      weekOfYear = 1;
    }
    const y = thu.getUTCFullYear();
    const m = thu.getUTCMonth();
    const range = `${monDate.getUTCDate()} ${MES_ABBR[monDate.getUTCMonth()]}–${sunDate.getUTCDate()} ${MES_ABBR[sunDate.getUTCMonth()]}`;
    if (mon <= TODAY) {
      weeks.push({ index, week: weekOfYear, year: y, quarter: Math.floor(m / 3) + 1, month: m, monthFull: MES_FULL[m], range });
      index += 1;
    }
    mon += 7 * DAY;
    weekOfYear += 1;
  }
  return weeks;
}

export const PERIOD_WEEKS: PeriodWeek[] = buildPeriodWeeks();

/** Distinct, ordered list of a dimension's values present in the calendar. */
function distinctBy(keyOf: (w: PeriodWeek) => string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of PERIOD_WEEKS) {
    const k = keyOf(w);
    if (!seen.has(k)) { seen.add(k); out.push(k); }
  }
  return out;
}

/** Token helpers: a period selection is "dim:weekIndex" (the anchor week). */
export function periodToken(dim: PeriodDimId, weekIndex: number): string {
  return `${dim}:${weekIndex}`;
}

export function parsePeriodToken(token: string): { dim: PeriodDimId; index: number } | null {
  const [dim, idxStr] = token.split(":");
  const index = Number(idxStr);
  if (!["year", "quarter", "month", "week"].includes(dim) || Number.isNaN(index)) return null;
  return { dim: dim as PeriodDimId, index };
}

/**
 * The display label for a dimension at a given anchor week. `compact` (opt-in)
 * narrows the wide grains so a tight navigator fits: week drops the "Sem N ·"
 * prefix to just the date range ("15 jun–21 jun"); month shows the 3-letter
 * month + year ("Jun 2026"). Quarter + year are already short, so unchanged.
 * Default (false) keeps the full labels FilterFacets uses.
 */
export function periodDimLabel(dim: PeriodDimId, w: PeriodWeek, compact = false): string {
  switch (dim) {
    case "year": return `${w.year}`;
    case "quarter": return `Q${w.quarter} ${w.year}`;
    case "month": return compact ? `${w.monthFull.slice(0, 3)} ${w.year}` : `${w.monthFull} ${w.year}`;
    case "week": return compact ? w.range : `Sem ${w.week} · ${w.range}`;
  }
}

/** Look up a period TOKEN's label for the slot flash / chip. */
export function periodLabel(token: string): string | null {
  const parsed = parsePeriodToken(token);
  if (!parsed) return null;
  const w = PERIOD_WEEKS[parsed.index];
  if (!w) return null;
  return periodDimLabel(parsed.dim, w);
}

// keep a reference so distinctBy isn't flagged unused if the navigator inlines it
void distinctBy;

// ── Period navigation: step a dimension, return the new anchor week index ──
//
// Stepping at a dimension's grain moves to the FIRST week of the neighboring
// period at that grain (month→first week of next month, etc.). Week grain steps
// one week. Returns null when there's no neighbor in range (arrow disabled).

function firstWeekIndexOf(pred: (w: PeriodWeek) => boolean): number | null {
  const w = PERIOD_WEEKS.find(pred);
  return w ? w.index : null;
}

function keyForDim(dim: PeriodDimId, w: PeriodWeek): string {
  switch (dim) {
    case "year": return `${w.year}`;
    case "quarter": return `${w.year}-Q${w.quarter}`;
    case "month": return `${w.year}-${w.month}`;
    case "week": return `${w.index}`;
  }
}

/**
 * Step the anchor week by one unit of `dim` in `dir` (-1 prev, +1 next).
 * Returns the new anchor week index, or null if out of range.
 */
export function stepPeriod(dim: PeriodDimId, anchorIndex: number, dir: -1 | 1): number | null {
  const anchor = PERIOD_WEEKS[anchorIndex];
  if (!anchor) return null;

  if (dim === "week") {
    const next = anchorIndex + dir;
    return next >= 0 && next < PERIOD_WEEKS.length ? next : null;
  }

  // For year/quarter/month: find the ordered list of distinct period-keys, locate
  // the anchor's key, move ±1, and jump to that period's FIRST week.
  const keys = distinctBy((w) => keyForDim(dim, w));
  const curKey = keyForDim(dim, anchor);
  const pos = keys.indexOf(curKey);
  const targetKey = keys[pos + dir];
  if (targetKey == null) return null;
  return firstWeekIndexOf((w) => keyForDim(dim, w) === targetKey);
}

/** Can we step this dimension in this direction from the anchor? */
export function canStepPeriod(dim: PeriodDimId, anchorIndex: number, dir: -1 | 1): boolean {
  return stepPeriod(dim, anchorIndex, dir) !== null;
}

export const BROWSE_FACETS: FilterFacet[] = [CATEGORY_FACET, PERIOD_FACET, LOCATION_FACET, SORT_FACET_COMPRAS];

// ── Transaction list data ──────────────────────────────────────────────

export interface BrowseTransaction {
  id: string;
  merchant: string;
  /** L1 store-category id. */
  category: string;
  storeIcon: string;
  location: string;
  date: string;
  time: string;
  total: number;
  itemCount: number;
  payment: string;
  /** preview items (first 3 shown in collapsed row). */
  previewItems: Pick<TxnItem, "name" | "total" | "category">[];
  /** reconciled with a statement line (read-only). */
  matched?: boolean;
  /** shared into a group (read-only). A txn can be BOTH matched and shared. */
  shared?: boolean;
}

export interface DateGroup {
  date: string;
  dayTotal: number;
  transactions: BrowseTransaction[];
}

const tx = (
  id: string, merchant: string, category: string, storeIcon: string,
  location: string, date: string, time: string, total: number,
  itemCount: number, payment: string,
  previewItems: Pick<TxnItem, "name" | "total" | "category">[],
  flags?: { matched?: boolean; shared?: boolean },
): BrowseTransaction => ({ id, merchant, category, storeIcon, location, date, time, total, itemCount, payment, previewItems, matched: flags?.matched, shared: flags?.shared });

const BASE_GROUPS: DateGroup[] = [
  {
    date: "Hoy — dom 15 jun",
    dayTotal: 47_850,
    transactions: [
      tx("t1", "Supermercado Líder", "supermercados", "store-supermarket", "Villarrica", "15 jun", "10:30", 28_350, 8, "falabella", [
        { name: "Pan amasado", total: 4_800, category: "BreadPastry" },
        { name: "Leche entera", total: 8_340, category: "DairyEggs" },
        { name: "Pechuga de pollo", total: 8_900, category: "MeatSeafood" },
      ], { matched: true, shared: true }),
      tx("t2", "Nido Gastronómico", "restaurantes", "store-restaurant", "Villarrica", "15 jun", "13:45", 11_500, 4, "cash", [
        { name: "Menú del día", total: 8_500, category: "PreparedFood" },
        { name: "Bebida", total: 1_200, category: "Beverages" },
      ]),
      tx("t3", "Farmacia Ahumada", "salud-bienestar", "store-pharmacy", "Villarrica", "15 jun", "16:20", 8_000, 2, "debit", [
        { name: "Vitaminas", total: 5_500, category: "HealthPersonal" },
        { name: "Protector solar", total: 2_500, category: "HealthPersonal" },
      ]),
    ],
  },
  {
    date: "Ayer — sáb 14 jun",
    dayTotal: 31_200,
    transactions: [
      tx("t4", "Unimarc", "supermercados", "store-supermarket", "Villarrica", "14 jun", "09:15", 22_400, 12, "falabella", [
        { name: "Arroz", total: 2_890, category: "Grains" },
        { name: "Aceite", total: 4_200, category: "CookingOils" },
        { name: "Café molido", total: 8_980, category: "Beverages" },
      ], { shared: true }),
      tx("t5", "Almacén Doña Rosa", "comercio-barrio", "store-minimarket", "Villarrica", "14 jun", "18:00", 8_800, 3, "cash", [
        { name: "Huevos", total: 3_200, category: "DairyEggs" },
        { name: "Pan de molde", total: 2_100, category: "BreadPastry" },
        { name: "Mantequilla", total: 3_500, category: "DairyEggs" },
      ]),
    ],
  },
  {
    date: "Jue 12 jun",
    dayTotal: 52_600,
    transactions: [
      tx("t6", "Shell Estación", "transporte-vehiculo", "store-gas-station", "Temuco", "12 jun", "08:45", 42_000, 1, "debit", [
        { name: "Combustible 95", total: 42_000, category: "Fuel" },
      ]),
      tx("t7", "Panadería El Trigal", "comercio-barrio", "store-bakery", "Villarrica", "12 jun", "11:30", 5_600, 4, "cash", [
        { name: "Hallullas", total: 2_400, category: "BreadPastry" },
        { name: "Empanadas", total: 3_200, category: "PreparedFood" },
      ]),
      tx("t8", "Supermercado Líder", "supermercados", "store-supermarket", "Temuco", "12 jun", "15:00", 5_000, 2, "falabella", [
        { name: "Detergente", total: 3_200, category: "CleaningSupplies" },
        { name: "Esponja", total: 1_800, category: "CleaningSupplies" },
      ]),
    ],
  },
  {
    date: "Mié 11 jun",
    dayTotal: 15_900,
    transactions: [
      tx("t9", "Restaurante La Cabaña", "restaurantes", "store-restaurant", "Villarrica", "11 jun", "20:30", 15_900, 3, "falabella", [
        { name: "Pastel de choclo", total: 8_900, category: "PreparedFood" },
        { name: "Ensalada", total: 4_500, category: "PreparedFood" },
        { name: "Jugo natural", total: 2_500, category: "Beverages" },
      ]),
    ],
  },
];

// Extra date groups (deterministically generated) so the list exceeds one page
// and the Compras pagination (12 per page) is exercised.
const MORE_MERCHANTS: [string, string, string, string][] = [
  ["Supermercado Líder", "supermercados", "store-supermarket", "Villarrica"],
  ["Farmacia Ahumada", "salud-bienestar", "store-pharmacy", "Temuco"],
  ["Copec Estación", "transporte-vehiculo", "store-gas-station", "Pucón"],
  ["Café Altura", "restaurantes", "store-restaurant", "Villarrica"],
  ["Almacén Doña Rosa", "comercio-barrio", "store-minimarket", "Villarrica"],
  ["Unimarc", "supermercados", "store-supermarket", "Temuco"],
];
const MORE_DAYS = ["Mar 10 jun", "Lun 9 jun", "Dom 8 jun", "Sáb 7 jun"];

function buildMoreGroups(): DateGroup[] {
  let n = 100;
  return MORE_DAYS.map((day, d) => {
    const count = 4 + (d % 2); // 4 or 5 per day
    const transactions = Array.from({ length: count }, (_, i) => {
      const [merchant, category, storeIcon, location] = MORE_MERCHANTS[(d * 3 + i) % MORE_MERCHANTS.length];
      const total = 5_000 + ((d * 7 + i * 13) % 40) * 1_000;
      const items = 1 + ((d + i) % 6);
      const dayShort = day.split(" ").slice(1).join(" ");
      return tx(`g${n++}`, merchant, category, storeIcon, location, dayShort, `1${i}:00`, total, items, "falabella", [
        { name: "Producto destacado", total: Math.round(total / Math.max(1, items)), category: "PreparedFood" },
      ]);
    });
    return { date: day, dayTotal: transactions.reduce((s, t) => s + t.total, 0), transactions };
  });
}

export const BROWSE_TRANSACTIONS: DateGroup[] = [...BASE_GROUPS, ...buildMoreGroups()];

export const BROWSE_TOTAL = BROWSE_TRANSACTIONS.reduce((s, g) => s + g.dayTotal, 0);
export const BROWSE_TXN_COUNT = BROWSE_TRANSACTIONS.reduce((s, g) => s + g.transactions.length, 0);

export function clpK(n: number): string {
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 10_000 ? `$${Math.round(n / 1_000)}k` : clp(n);
}
