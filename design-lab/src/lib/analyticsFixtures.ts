/**
 * Shared config + mock data for the analytics-toolbar parts (DM-9
 * decomposition): the L1–L4 taxonomy levels, the count modes, period labels,
 * and sample treemap cells per level/count. One source for every section spike
 * and the consolidated toolbar.
 */

export type TaxLevel = "L1" | "L2" | "L3" | "L4";
export type CountMode = "transactions" | "items";

export interface LevelDef {
  id: TaxLevel;
  /** Spanish label. */
  label: string;
  /** representative pixel icon for the level. */
  icon: string;
}

/**
 * Dedicated level glyphs — shop / cart / box / tag (the legacy store-group /
 * store-category / item-group / item-category lenses). Shared by LevelToggle +
 * LevelRangeBar (the Sankey selector) so the two icon lists never drift, and
 * abstract enough to read as L1–L4 rather than one arbitrary category.
 */
export const LEVEL_ICONS: Record<TaxLevel, string> = {
  L1: "level-rubros",
  L2: "level-giros",
  L3: "level-familias",
  L4: "level-categorias",
};

/** The four taxonomy levels. */
export const LEVELS: LevelDef[] = [
  { id: "L1", label: "Rubros", icon: LEVEL_ICONS.L1 },
  { id: "L2", label: "Giros", icon: LEVEL_ICONS.L2 },
  { id: "L3", label: "Familias", icon: LEVEL_ICONS.L3 },
  { id: "L4", label: "Categorías", icon: LEVEL_ICONS.L4 },
];

export interface CountModeDef {
  id: CountMode;
  label: string;
  icon: string;
}

/** The two count modes. */
export const COUNT_MODES: CountModeDef[] = [
  { id: "transactions", label: "Transacciones", icon: "fin-receipt" },
  { id: "items", label: "Ítems", icon: "item-pantry" },
];

/** Sample period labels for the stepper. */
export const PERIODS = ["Ene '26", "Feb '26", "Mar '26", "Abr '26", "May '26", "Jun '26"];

export interface TreemapDatum {
  /** category id (resolved via getCategoryToken). */
  id: string;
  pct: number;
  /** value per count mode. */
  txns: number;
  items: number;
}

/** Sample treemap cells, keyed by whether we're at a store level (L1/L2) or item level (L3/L4). */
export const TREEMAP: Record<"store" | "item", TreemapDatum[]> = {
  store: [
    { id: "transporte-vehiculo", pct: 49, txns: 5, items: 8 },
    { id: "supermercados", pct: 35, txns: 15, items: 87 },
    { id: "otros", pct: 9, txns: 4, items: 12 },
    { id: "tiendas-especializadas", pct: 7, txns: 2, items: 5 },
  ],
  item: [
    { id: "food-packaged", pct: 42, txns: 12, items: 64 },
    { id: "food-fresh", pct: 28, txns: 8, items: 35 },
    { id: "servicios-cargos", pct: 18, txns: 6, items: 14 },
    { id: "hogar", pct: 12, txns: 3, items: 8 },
  ],
};

export function treemapFor(level: TaxLevel): TreemapDatum[] {
  return level === "L1" || level === "L2" ? TREEMAP.store : TREEMAP.item;
}

export function countValue(d: TreemapDatum, mode: CountMode): number {
  return mode === "transactions" ? d.txns : d.items;
}

/**
 * Full treemap dataset (DM-13) — adds the CLP `value` the squarified algorithm
 * needs for area, plus count + itemCount + percent, for a realistic 8-category
 * distribution that actually exercises the packing.
 */
export interface TreemapFullDatum {
  id: string; // category id (getCategoryToken)
  value: number; // CLP — drives rectangle AREA
  pct: number;
  count: number; // transactions
  itemCount: number;
  /** for the aggregated "Más" cell: how many categories it folds. */
  categoryCount?: number;
}

export const TREEMAP_FULL: TreemapFullDatum[] = [
  { id: "supermercados", value: 182300, pct: 47, count: 15, itemCount: 87 },
  { id: "transporte-vehiculo", value: 74900, pct: 19, count: 5, itemCount: 8 },
  { id: "restaurantes", value: 52100, pct: 14, count: 9, itemCount: 22 },
  { id: "salud-bienestar", value: 38700, pct: 10, count: 6, itemCount: 14 },
  { id: "vivienda", value: 18500, pct: 5, count: 2, itemCount: 4 },
  { id: "tiendas-especializadas", value: 9800, pct: 3, count: 3, itemCount: 7 },
  { id: "comercio-barrio", value: 6200, pct: 2, count: 4, itemCount: 9 },
  // aggregated tail
  { id: "otros", value: 2020, pct: 1, count: 2, itemCount: 5, categoryCount: 3 },
];

export function treemapCountValue(d: TreemapFullDatum, mode: CountMode): number {
  return mode === "transactions" ? d.count : d.itemCount;
}

/**
 * The full L1 rubro distribution — 10 real rubros, NO pre-baked "otros" tail
 * (the progressive-disclosure grouping folds the long tail into "Más"
 * dynamically). Shared by the donut (SEGMENTS) and the treemap (LEVEL_TREEMAP.L1)
 * so both show the same set. Sums to TOTAL_SPEND. All ids resolve in
 * getCategoryToken.
 */
export const RUBRO_TREEMAP: TreemapFullDatum[] = [
  { id: "supermercados", value: 180000, pct: 47, count: 15, itemCount: 87 },
  { id: "transporte-vehiculo", value: 73000, pct: 19, count: 5, itemCount: 8 },
  { id: "restaurantes", value: 50000, pct: 13, count: 9, itemCount: 22 },
  { id: "salud-bienestar", value: 38000, pct: 10, count: 6, itemCount: 14 },
  { id: "vivienda", value: 18000, pct: 5, count: 2, itemCount: 4 },
  { id: "tiendas-especializadas", value: 9500, pct: 2, count: 3, itemCount: 7 },
  { id: "comercio-barrio", value: 6000, pct: 2, count: 4, itemCount: 9 },
  { id: "tiendas-generales", value: 4500, pct: 1, count: 2, itemCount: 5 },
  { id: "servicios-finanzas", value: 3000, pct: 1, count: 2, itemCount: 3 },
  { id: "entretenimiento-hospedaje", value: 2520, pct: 1, count: 1, itemCount: 2 },
];

/**
 * Per-level treemap distributions (DM-24 parity for the treemap) — one flat
 * breakdown per taxonomy level so the level selector can switch the treemap
 * between L1 Rubros → L2 Giros → L3 Familias → L4 Categorías. All ids resolve
 * in getCategoryToken (icon + color + label). Sample data.
 */
export const LEVEL_TREEMAP: Record<TaxLevel, TreemapFullDatum[]> = {
  L1: RUBRO_TREEMAP,
  L2: [
    { id: "Supermarket", value: 110000, pct: 38, count: 9, itemCount: 52 },
    { id: "Wholesale", value: 64000, pct: 22, count: 4, itemCount: 28 },
    { id: "Restaurant", value: 52000, pct: 18, count: 9, itemCount: 22 },
    { id: "GasStation", value: 38000, pct: 13, count: 3, itemCount: 4 },
    { id: "AutoShop", value: 26000, pct: 9, count: 2, itemCount: 4 },
  ],
  L3: [
    { id: "food-fresh", value: 122000, pct: 42, count: 11, itemCount: 48 },
    { id: "food-packaged", value: 92000, pct: 32, count: 9, itemCount: 40 },
    { id: "food-prepared", value: 52000, pct: 18, count: 9, itemCount: 22 },
    { id: "hogar", value: 24000, pct: 8, count: 5, itemCount: 11 },
  ],
  L4: [
    { id: "BreadPastry", value: 48000, pct: 30, count: 8, itemCount: 18 },
    { id: "DairyEggs", value: 42000, pct: 26, count: 7, itemCount: 16 },
    { id: "MeatSeafood", value: 40000, pct: 25, count: 6, itemCount: 12 },
    { id: "Beverages", value: 31000, pct: 19, count: 5, itemCount: 14 },
  ],
};

// ── Donut / segment data (DM-13) ────────────────────────────────────────
export interface SegmentDatum {
  id: string; // category id (getCategoryToken)
  value: number; // CLP
  pct: number;
  /** transactions this segment appears in (count toggle). */
  count?: number;
  /** items bought in this segment (count toggle). */
  itemCount?: number;
}

/** Donut/ring segments = the L1 rubro distribution (shared with the treemap). */
export const SEGMENTS: SegmentDatum[] = RUBRO_TREEMAP;

export const TOTAL_SPEND = 384520;

// ── Donut drill-down tree (DM-21) ───────────────────────────────────────
/**
 * A drill node = a category id mapped to its child SEGMENTS (next taxonomy
 * level). Root key "" = the top-level distribution (SEGMENTS). Drilling a node
 * id looks up DRILL_TREE[id]; a node with no entry is a leaf (chevron hidden).
 * Faithful to the legacy level model (store-group → store-category → item-group
 * → item-category → subcategory). Values are illustrative.
 */
export const DRILL_TREE: Record<string, SegmentDatum[]> = {
  "": SEGMENTS,
  // L1 supermercados → L2 giros (ids = PascalCase giro ids)
  supermercados: [
    { id: "Supermarket", value: 142000, pct: 78, count: 11, itemCount: 68 },
    { id: "Wholesale", value: 40300, pct: 22, count: 4, itemCount: 19 },
  ],
  // L2 Supermarket → L3 item-groups (familias)
  Supermarket: [
    { id: "food-fresh", value: 70000, pct: 49, count: 9, itemCount: 38 },
    { id: "food-packaged", value: 46000, pct: 32, count: 8, itemCount: 21 },
    { id: "hogar", value: 26000, pct: 19, count: 5, itemCount: 9 },
  ],
  // L3 food-fresh → L4 item-categories (categorías, PascalCase)
  "food-fresh": [
    { id: "BreadPastry", value: 32000, pct: 46, count: 6, itemCount: 16 },
    { id: "DairyEggs", value: 22000, pct: 31, count: 5, itemCount: 13 },
    { id: "MeatSeafood", value: 16000, pct: 23, count: 4, itemCount: 9 },
  ],
  // L1 transporte → L2 giros
  "transporte-vehiculo": [
    { id: "GasStation", value: 52000, pct: 69, count: 3, itemCount: 4 },
    { id: "AutoShop", value: 22900, pct: 31, count: 2, itemCount: 4 },
  ],
  // L1 salud-bienestar → L2 giros
  "salud-bienestar": [
    { id: "Pharmacy", value: 18000, pct: 47, count: 3, itemCount: 7 },
    { id: "Medical", value: 12000, pct: 32, count: 2, itemCount: 4 },
    { id: "HealthBeauty", value: 8000, pct: 21, count: 1, itemCount: 3 },
  ],
  // L1 vivienda → L2 giros
  vivienda: [
    { id: "UtilityCompany", value: 12000, pct: 67, count: 1, itemCount: 2 },
    { id: "PropertyAdmin", value: 6000, pct: 33, count: 1, itemCount: 2 },
  ],
  // L1 comercio-barrio → L2 giros
  "comercio-barrio": [
    { id: "Almacen", value: 2200, pct: 37, count: 2, itemCount: 4 },
    { id: "Minimarket", value: 1800, pct: 30, count: 1, itemCount: 3 },
    { id: "Bakery", value: 1200, pct: 20, count: 1, itemCount: 1 },
    { id: "Butcher", value: 800, pct: 13, count: 1, itemCount: 1 },
  ],
  // L1 tiendas-especializadas → L2 giros
  "tiendas-especializadas": [
    { id: "OnlineStore", value: 4000, pct: 42, count: 1, itemCount: 3 },
    { id: "SportsStore", value: 2500, pct: 26, count: 1, itemCount: 2 },
    { id: "BookStore", value: 1800, pct: 19, count: 1, itemCount: 1 },
    { id: "PetShop", value: 1200, pct: 13, count: 1, itemCount: 1 },
  ],
  // L1 tiendas-generales → L2 giros
  "tiendas-generales": [
    { id: "ClothingStore", value: 2000, pct: 44, count: 1, itemCount: 2 },
    { id: "ElectronicsStore", value: 1500, pct: 33, count: 1, itemCount: 2 },
    { id: "HomeGoods", value: 1000, pct: 22, count: 1, itemCount: 1 },
  ],
  // L1 servicios-finanzas → L2 giros
  "servicios-finanzas": [
    { id: "BankingFinance", value: 1500, pct: 50, count: 1, itemCount: 1 },
    { id: "SubscriptionService", value: 900, pct: 30, count: 1, itemCount: 1 },
    { id: "GeneralServices", value: 600, pct: 20, count: 1, itemCount: 1 },
  ],
  // L1 entretenimiento-hospedaje → L2 giros
  "entretenimiento-hospedaje": [
    { id: "Entertainment", value: 1200, pct: 48, count: 1, itemCount: 2 },
    { id: "Lodging", value: 800, pct: 32, count: 1, itemCount: 1 },
    { id: "Casino", value: 520, pct: 21, count: 1, itemCount: 1 },
  ],
  // L1 restaurantes (single giro) → straight to L3 familias of spend
  restaurantes: [
    { id: "food-prepared", value: 30000, pct: 60, count: 6, itemCount: 14 },
    { id: "food-fresh", value: 12000, pct: 24, count: 2, itemCount: 5 },
    { id: "food-packaged", value: 8000, pct: 16, count: 1, itemCount: 3 },
  ],
  // deeper levels so drilling keeps going (giro → familia, familia → categoría)
  Wholesale: [
    { id: "food-fresh", value: 24000, pct: 60, count: 3, itemCount: 11 },
    { id: "food-packaged", value: 16300, pct: 40, count: 2, itemCount: 8 },
  ],
  "food-packaged": [
    { id: "Beverages", value: 28000, pct: 61, count: 5, itemCount: 14 },
    { id: "DairyEggs", value: 18000, pct: 39, count: 4, itemCount: 7 },
  ],
  "food-prepared": [
    { id: "BreadPastry", value: 18000, pct: 60, count: 4, itemCount: 9 },
    { id: "MeatSeafood", value: 12000, pct: 40, count: 2, itemCount: 5 },
  ],
};

export function drillChildren(id: string): SegmentDatum[] | null {
  return DRILL_TREE[id] ?? null;
}

// ── Trend rows + sparklines (DM-13) ─────────────────────────────────────
export type TrendDir = "up" | "down" | "neutral";

export interface TrendDatum {
  id: string; // category id
  amount: number; // CLP
  pct: number;
  /** signed % change vs previous period. */
  change: number;
  dir: TrendDir;
  /** cumulative daily spend points for the sparkline. */
  sparkline: number[];
}

export const TRENDS: TrendDatum[] = [
  { id: "supermercados", amount: 182300, pct: 47, change: -12, dir: "down", sparkline: [10, 32, 48, 70, 96, 132, 182] },
  { id: "transporte-vehiculo", amount: 74900, pct: 19, change: 8, dir: "up", sparkline: [12, 20, 28, 40, 52, 64, 75] },
  { id: "restaurantes", amount: 52100, pct: 14, change: 3, dir: "up", sparkline: [4, 12, 18, 26, 34, 44, 52] },
  { id: "salud-bienestar", amount: 38700, pct: 10, change: 0, dir: "neutral", sparkline: [6, 11, 17, 22, 28, 33, 39] },
];

/**
 * Richer trend set (DM-28) — additive, leaves TRENDS as the faithful baseline.
 * Adds more rows + per-row count/itemCount (for the count pill) + a grey "Más"
 * aggregate row (`id:"otros"` → grey token natively) with `categoryCount` (the
 * count of folded tail categories → the outline badge). Used by the dense spike.
 */
export interface TrendRichDatum extends TrendDatum {
  /** transactions / items behind the row (count pill). */
  count: number;
  itemCount: number;
  /** for the "Más" aggregate: how many tail categories it folds. */
  categoryCount?: number;
}

export const TRENDS_RICH: TrendRichDatum[] = [
  { id: "supermercados", amount: 182300, pct: 47, change: -12, dir: "down", count: 15, itemCount: 87, sparkline: [10, 32, 48, 70, 96, 132, 182] },
  { id: "transporte-vehiculo", amount: 74900, pct: 19, change: 8, dir: "up", count: 5, itemCount: 8, sparkline: [12, 20, 28, 40, 52, 64, 75] },
  { id: "restaurantes", amount: 52100, pct: 14, change: 3, dir: "up", count: 9, itemCount: 22, sparkline: [4, 12, 18, 26, 34, 44, 52] },
  { id: "salud-bienestar", amount: 38700, pct: 10, change: 0, dir: "neutral", count: 6, itemCount: 14, sparkline: [6, 11, 17, 22, 28, 33, 39] },
  { id: "vivienda", amount: 24500, pct: 6, change: -4, dir: "down", count: 2, itemCount: 4, sparkline: [8, 12, 15, 18, 20, 23, 24] },
  // grey "Más" aggregate — folds the long tail; sparkline ≈ elementwise sum of the folded rows
  { id: "otros", amount: 14020, pct: 4, change: 0, dir: "neutral", count: 4, itemCount: 12, categoryCount: 3, sparkline: [3, 5, 7, 9, 11, 13, 14] },
];

// ── Trend drill-down tree (DM-29) ───────────────────────────────────────
/**
 * Trend analogue of DRILL_TREE — a category id → its child trend rows (next
 * taxonomy level). Root "" = TRENDS_RICH. SAME level model + branch ids as the
 * donut's DRILL_TREE (so both diagrams drill the SAME taxonomy), but each child
 * carries the trend payload (sparkline/change/dir), NOT SegmentDatum. A node with
 * no entry is a leaf → chevron hidden.
 *
 * PER-LEVEL RE-PERCENTAGE (legacy fidelity): each child's `pct` is its share of
 * its OWN parent's level total (children sum to ~100%), not of grand total — the
 * legacy helpers re-scope percent to the new parent on every drill. Values +
 * sparklines are illustrative but each level re-sums independently.
 */
export const TREND_DRILL_TREE: Record<string, TrendRichDatum[]> = {
  "": TRENDS_RICH,
  // L1 supermercados ($182k) → L2 giros (re-pct of 182k → ~100%)
  supermercados: [
    { id: "Supermarket", amount: 142000, pct: 78, change: -9, dir: "down", count: 11, itemCount: 68, sparkline: [12, 30, 52, 78, 104, 126, 142] },
    { id: "Wholesale", amount: 40300, pct: 22, change: 6, dir: "up", count: 4, itemCount: 19, sparkline: [4, 9, 15, 21, 28, 35, 40] },
  ],
  // L2 Supermarket ($142k) → L3 familias (re-pct of 142k)
  Supermarket: [
    { id: "food-fresh", amount: 70000, pct: 49, change: -14, dir: "down", count: 9, itemCount: 38, sparkline: [8, 20, 32, 44, 54, 63, 70] },
    { id: "food-packaged", amount: 46000, pct: 32, change: 5, dir: "up", count: 8, itemCount: 21, sparkline: [5, 12, 19, 27, 34, 40, 46] },
    { id: "hogar", amount: 26000, pct: 19, change: 0, dir: "neutral", count: 5, itemCount: 9, sparkline: [4, 8, 12, 16, 20, 23, 26] },
  ],
  // L3 food-fresh ($70k) → L4 categorías (re-pct of 70k — terminal tier, leaves)
  "food-fresh": [
    { id: "BreadPastry", amount: 32000, pct: 46, change: -7, dir: "down", count: 6, itemCount: 16, sparkline: [4, 10, 15, 21, 26, 30, 32] },
    { id: "DairyEggs", amount: 22000, pct: 31, change: 3, dir: "up", count: 5, itemCount: 13, sparkline: [3, 6, 10, 13, 16, 19, 22] },
    { id: "MeatSeafood", amount: 16000, pct: 23, change: 9, dir: "up", count: 4, itemCount: 9, sparkline: [2, 4, 6, 9, 11, 14, 16] },
  ],
  // L1 transporte ($74.9k) → L2 giros (second drillable branch)
  "transporte-vehiculo": [
    { id: "GasStation", amount: 52000, pct: 69, change: 11, dir: "up", count: 3, itemCount: 4, sparkline: [6, 14, 22, 30, 38, 46, 52] },
    { id: "AutoShop", amount: 22900, pct: 31, change: -5, dir: "down", count: 2, itemCount: 4, sparkline: [3, 6, 9, 13, 17, 20, 23] },
  ],
};

/** Trend analogue of drillChildren — child trend rows for a node, or null (leaf). */
export function trendDrillChildren(id: string): TrendRichDatum[] | null {
  return TREND_DRILL_TREE[id] ?? null;
}

// ── Sankey flow (DM-13) — vertical: rubro → giro → familia ──────────────
export interface SankeyNodeDatum {
  id: string; // category id (for color/icon)
  label: string;
}
export interface SankeyLinkDatum {
  source: string;
  target: string;
  value: number;
}

// node ids MUST be real category-token ids (getCategoryToken) so each resolves
// to a color + icon + label. The L2 giros are PascalCase ids (Supermarket /
// Restaurant), NOT the store-* icon names; the `label` carries the display name
// (a store brand here — "Líder" / "Nido").
export const SANKEY_NODES: SankeyNodeDatum[] = [
  { id: "supermercados", label: "Supermercados" },
  { id: "restaurantes", label: "Restaurantes" },
  { id: "Supermarket", label: "Líder" },
  { id: "Restaurant", label: "Nido" },
  { id: "food-fresh", label: "Frescos" },
  { id: "food-packaged", label: "Envasados" },
];

export const SANKEY_LINKS: SankeyLinkDatum[] = [
  { source: "supermercados", target: "Supermarket", value: 182 },
  { source: "restaurantes", target: "Restaurant", value: 52 },
  { source: "Supermarket", target: "food-fresh", value: 110 },
  { source: "Supermarket", target: "food-packaged", value: 72 },
  { source: "Restaurant", target: "food-packaged", value: 52 },
];

// ── Multi-level sankey taxonomy (DM-24) ─────────────────────────────────
/**
 * A full L1→L2→L3→L4 spend taxonomy for the level-range sankey. Each node is
 * tagged with its level (1=rubro, 2=giro, 3=familia, 4=categoría); links connect
 * every adjacent level pair. The chart slices this to a contiguous level range
 * [lo,hi] via `sankeyForLevels` (keeps nodes in-range + links between consecutive
 * kept levels). All ids resolve in getCategoryToken for icon + color; `label`
 * carries the display name (brand names at L2). Flow conserves per node.
 */
export type SankeyLevel = 1 | 2 | 3 | 4;

export interface SankeyLevelNode extends SankeyNodeDatum {
  level: SankeyLevel;
}

export const SANKEY_TAXONOMY_NODES: SankeyLevelNode[] = [
  // L1 rubros
  { id: "supermercados", label: "Supermercados", level: 1 },
  { id: "restaurantes", label: "Restaurantes", level: 1 },
  // L2 giros (brand display labels)
  { id: "Supermarket", label: "Líder", level: 2 },
  { id: "Wholesale", label: "Central", level: 2 },
  { id: "Restaurant", label: "Nido", level: 2 },
  // L3 familias
  { id: "food-fresh", label: "Frescos", level: 3 },
  { id: "food-packaged", label: "Envasados", level: 3 },
  { id: "food-prepared", label: "Preparados", level: 3 },
  // L4 categorías
  { id: "BreadPastry", label: "Panadería", level: 4 },
  { id: "DairyEggs", label: "Lácteos", level: 4 },
  { id: "MeatSeafood", label: "Carnes", level: 4 },
  { id: "Beverages", label: "Bebidas", level: 4 },
];

export const SANKEY_TAXONOMY_LINKS: SankeyLinkDatum[] = [
  // L1 → L2
  { source: "supermercados", target: "Supermarket", value: 150 },
  { source: "supermercados", target: "Wholesale", value: 64 },
  { source: "restaurantes", target: "Restaurant", value: 52 },
  // L2 → L3
  { source: "Supermarket", target: "food-fresh", value: 92 },
  { source: "Supermarket", target: "food-packaged", value: 58 },
  { source: "Wholesale", target: "food-fresh", value: 30 },
  { source: "Wholesale", target: "food-packaged", value: 34 },
  { source: "Restaurant", target: "food-prepared", value: 52 },
  // L3 → L4
  { source: "food-fresh", target: "BreadPastry", value: 48 },
  { source: "food-fresh", target: "DairyEggs", value: 40 },
  { source: "food-fresh", target: "MeatSeafood", value: 34 },
  { source: "food-packaged", target: "Beverages", value: 56 },
  { source: "food-packaged", target: "DairyEggs", value: 36 },
  { source: "food-prepared", target: "Beverages", value: 28 },
  { source: "food-prepared", target: "MeatSeafood", value: 24 },
];

/** Level metadata for the range selector chips (L1–L4). */
export const SANKEY_LEVEL_META: { level: SankeyLevel; short: string; label: string; icon: string }[] = [
  { level: 1, short: "L1", label: "Rubros", icon: LEVEL_ICONS.L1 },
  { level: 2, short: "L2", label: "Giros", icon: LEVEL_ICONS.L2 },
  { level: 3, short: "L3", label: "Familias", icon: LEVEL_ICONS.L3 },
  { level: 4, short: "L4", label: "Categorías", icon: LEVEL_ICONS.L4 },
];

/** A contiguous level range [lo,hi], always ≥2 levels wide. */
export interface LevelRange {
  lo: SankeyLevel;
  hi: SankeyLevel;
}

/**
 * The peel state machine (DM-24). The peel always covers a contiguous range of
 * ≥2 adjacent levels. Pressing a level `k`:
 *  - k below the range  → extend DOWN  (lo = k)        e.g. L2–L3, press L1 → L1–L3
 *  - k above the range  → extend UP    (hi = k)        e.g. L1–L3, press L4 → L1–L4
 *  - k IS the low end   → retract the low end (lo+1)   e.g. L1–L4, press L1 → L2–L4
 *  - k inside (lo<k≤hi) → k becomes the new low end    e.g. L1–L4, press L2 → L2–L4
 * The range never narrows below 2 levels (retracting the low end is a no-op when
 * it would; a new-low-end press that hits the high end trims to [hi-1, hi]).
 */
export function pressLevel(range: LevelRange, k: SankeyLevel): LevelRange {
  const { lo, hi } = range;
  if (k < lo) return { lo: k, hi }; // below the range → extend down (add it)
  if (k > hi) return { lo, hi: k }; // above the range → extend up (add it)
  if (k === hi) {
    // UNSELECT the top level. ≥3 levels → just shrink the top; exactly 2 →
    // shift the whole window down so it stays 2 wide (no-op at the bottom edge).
    if (hi - lo >= 2) return { lo, hi: (hi - 1) as SankeyLevel };
    return lo > 1 ? { lo: (lo - 1) as SankeyLevel, hi: (hi - 1) as SankeyLevel } : range;
  }
  if (k === lo) {
    // UNSELECT the bottom level (symmetric). ≥3 → shrink bottom; exactly 2 →
    // shift the window up (no-op at the top edge).
    if (hi - lo >= 2) return { lo: (lo + 1) as SankeyLevel, hi };
    return hi < 4 ? { lo: (lo + 1) as SankeyLevel, hi: (hi + 1) as SankeyLevel } : range;
  }
  // strictly inside (lo < k < hi) → set k as the new top (drop the levels above it).
  return { lo, hi: k };
}

/**
 * Slice the full taxonomy to a contiguous level range [lo,hi]. Returns the nodes
 * whose level is in range + the links between consecutive kept levels (so the
 * sankey columns are exactly lo…hi). Flow is preserved as authored.
 */
export function sankeyForLevels(lo: SankeyLevel, hi: SankeyLevel): { nodes: SankeyNodeDatum[]; links: SankeyLinkDatum[] } {
  const level = new Map(SANKEY_TAXONOMY_NODES.map((n) => [n.id, n.level]));
  const nodes = SANKEY_TAXONOMY_NODES.filter((n) => n.level >= lo && n.level <= hi).map(({ id, label }) => ({ id, label }));
  const links = SANKEY_TAXONOMY_LINKS.filter((l) => {
    const s = level.get(l.source);
    const t = level.get(l.target);
    return s != null && t != null && s >= lo && t <= hi && t === s + 1;
  });
  return { nodes, links };
}

/** Short CLP for chart labels: $182k. */
export function clpK(n: number): string {
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}
