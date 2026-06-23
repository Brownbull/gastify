/**
 * Shared mock data for the transaction-detail parts (DM-9 decomposition).
 * One source so every section spike + the consolidated screen agree.
 *
 * Item category ids are the PascalCase L4 ids from categoryTokens (e.g.
 * "BreadPastry"); group ids are L3 familia ids (e.g. "food-fresh").
 */

export interface TxnItem {
  name: string;
  total: number;
  unitPrice: number;
  units: number;
  /** L4 category id for the per-item CategoryChip. */
  category: string;
  /**
   * Optional free-text subcategory label (DM-42) — NOT mapped to any taxonomy,
   * can be anything. Shown next to the category as plain text in the category's
   * prominent color (no chip/icon). Display-only; not user-editable. May be absent.
   */
  subcategory?: string;
}

export interface TxnGroup {
  /** L3 familia id. */
  familia: string;
  items: TxnItem[];
}

/** How often a transaction recurs — a transaction-level attribute. */
export type TxnCadence = "one-time" | "weekly" | "biweekly" | "monthly" | "yearly";

/** Spanish display label per cadence. */
export const CADENCE_LABEL: Record<TxnCadence, string> = {
  "one-time": "Única vez",
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
  yearly: "Anual",
};

/** Canonical display order of cadences (single source — pickers iterate this). */
export const CADENCE_ORDER: TxnCadence[] = ["one-time", "weekly", "biweekly", "monthly", "yearly"];

export interface TxnDetail {
  merchant: string;
  /** L1 store-category id. */
  category: string;
  storeIcon: string;
  location: string;
  date: string;
  time: string;
  /** payment-method id (see paymentMethods.ts). */
  payment: string;
  /** recurrence (one-time vs a recurring cadence). */
  cadence: TxnCadence;
  total: number;
  groups: TxnGroup[];
}

export const sampleTxn: TxnDetail = {
  merchant: "Nido Gastronómico",
  category: "restaurantes",
  storeIcon: "store-restaurant",
  location: "Villarrica, Chile",
  date: "17 Mar 2026",
  time: "17:10",
  payment: "falabella",
  cadence: "one-time",
  total: 11500,
  groups: [
    {
      familia: "food-fresh",
      items: [
        { name: "Pan amasado", total: 4800, unitPrice: 1600, units: 3, category: "BreadPastry" },
        { name: "Mantequilla", total: 4864, unitPrice: 2432, units: 2, category: "DairyEggs" },
      ],
    },
    {
      familia: "servicios-cargos",
      items: [
        { name: "Iva (19%)", total: 1836, unitPrice: 1836, units: 1, category: "TaxFees" },
        { name: "Propina", total: 0, unitPrice: 0, units: 1, category: "ServiceCharge" },
      ],
    },
  ],
};

export const sampleItems: TxnItem[] = sampleTxn.groups.flatMap((g) => g.items);

/**
 * Items-History aggregate (DM-17) — the "what I've bought over time" row in the
 * Items section. Unlike a transaction line, this carries a MAPPED ingredient/
 * meal icon (from the future Gustify connection) + over-period aggregates.
 */
/** One receipt where a history item was bought (the expanded-row content). */
export interface HistoryPurchase {
  store: string;
  storeIcon: string;
  /** L1 store-category id for the ThumbnailBadge overlay. */
  storeCategory: string;
  date: string;
  qty: number;
  unitPrice: number;
  /** what this item cost on that receipt (CLP). */
  lineTotal: number;
}

export interface HistoryItem {
  name: string;
  /** L4 category id for the CategoryChip. */
  category: string;
  /** mapped ingredient/meal pixel icon (Gustify connection). */
  icon: string;
  /**
   * Gustify-link icon (DM-17d) — filename under public/gustify-icons/. Present
   * ONLY when this item is mapped to a Gustify ingredient/prepared-food (the
   * cross-app connection). Undefined = not mapped, no Gustify chip.
   */
  gustifyIcon?: string;
  /** total spent on this item over the period (CLP). */
  totalSpent: number;
  /** how many transactions/receipts this item appears in. */
  txnCount: number;
  /** total units bought. */
  units: number;
  /** most recent unit price (CLP). */
  lastPrice: number;
  /** when last bought (display string). */
  lastBought: string;
  /** the receipts where it was bought (expanded view). */
  purchases: HistoryPurchase[];
}

const lider = { store: "Supermercado Líder", storeIcon: "store-supermarket", storeCategory: "supermercados" };
const unimarc = { store: "Unimarc", storeIcon: "store-supermarket", storeCategory: "supermercados" };
const almacen = { store: "Almacén Doña Rosa", storeIcon: "store-minimarket", storeCategory: "comercio-barrio" };

export const sampleHistoryItems: HistoryItem[] = [
  {
    name: "Pan amasado", category: "BreadPastry", icon: "item-bread-pastry", gustifyIcon: "bread",
    totalSpent: 38400, txnCount: 6, units: 36, lastPrice: 1600, lastBought: "hoy",
    purchases: [
      { ...lider, date: "hoy", qty: 3, unitPrice: 1600, lineTotal: 4800 },
      { ...unimarc, date: "2 jun", qty: 2, unitPrice: 1490, lineTotal: 2980 },
      { ...almacen, date: "28 may", qty: 4, unitPrice: 1500, lineTotal: 6000 },
      { ...lider, date: "21 may", qty: 3, unitPrice: 1600, lineTotal: 4800 },
      { ...unimarc, date: "14 may", qty: 2, unitPrice: 1490, lineTotal: 2980 },
      { ...lider, date: "7 may", qty: 6, unitPrice: 1600, lineTotal: 9600 },
    ],
  },
  {
    name: "Leche entera", category: "DairyEggs", icon: "item-dairy-eggs", gustifyIcon: "milk",
    totalSpent: 24900, txnCount: 4, units: 18, lastPrice: 1390, lastBought: "ayer",
    purchases: [
      { ...lider, date: "ayer", qty: 6, unitPrice: 1390, lineTotal: 8340 },
      { ...unimarc, date: "30 may", qty: 4, unitPrice: 1350, lineTotal: 5400 },
      { ...lider, date: "18 may", qty: 4, unitPrice: 1390, lineTotal: 5560 },
      { ...almacen, date: "5 may", qty: 4, unitPrice: 1400, lineTotal: 5600 },
    ],
  },
  {
    name: "Pechuga de pollo", category: "MeatSeafood", icon: "item-meat-seafood", gustifyIcon: "chicken-breast",
    totalSpent: 61200, txnCount: 3, units: 9, lastPrice: 8900, lastBought: "lun 12 jun",
    purchases: [
      { ...lider, date: "lun 12 jun", qty: 3, unitPrice: 8900, lineTotal: 26700 },
      { ...unimarc, date: "29 may", qty: 3, unitPrice: 8500, lineTotal: 25500 },
      { ...lider, date: "15 may", qty: 3, unitPrice: 3000, lineTotal: 9000 },
    ],
  },
  {
    name: "Café molido", category: "Beverages", icon: "item-beverages",
    totalSpent: 17800, txnCount: 2, units: 4, lastPrice: 4490, lastBought: "3 jun",
    purchases: [
      { ...lider, date: "3 jun", qty: 2, unitPrice: 4490, lineTotal: 8980 },
      { ...unimarc, date: "20 may", qty: 2, unitPrice: 4410, lineTotal: 8820 },
    ],
  },
];

export function clp(n: number): string {
  return `$${n.toLocaleString("es-CL")}`;
}
