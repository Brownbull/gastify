/**
 * Shareable-transactions model — your own transactions, per group, for the
 * full-page share flow (backend POST /groups/:id/share, D74). Only post-join,
 * not-yet-shared transactions qualify; `shared` flips once shared with the group.
 */
export interface ShareableTxn {
  id: string;
  merchant: string;
  /** display date, e.g. "15 jun". */
  date: string;
  total: number;
  /** L1 rubro id (ThumbnailBadge tint) + pixel store icon. */
  category: string;
  storeIcon: string;
  /** already shared with THIS group? */
  shared: boolean;
}

const TEMPLATES: Array<{ merchant: string; category: string; storeIcon: string }> = [
  { merchant: "Supermercado Líder", category: "supermercados", storeIcon: "store-supermarket" },
  { merchant: "Unimarc", category: "supermercados", storeIcon: "store-supermarket" },
  { merchant: "Almacén Doña Rosa", category: "comercio-barrio", storeIcon: "store-almacen" },
  { merchant: "Copec", category: "transporte-vehiculo", storeIcon: "store-gas" },
  { merchant: "Café Wenu", category: "restaurantes", storeIcon: "store-restaurant" },
  { merchant: "Panadería El Trigal", category: "comercio-barrio", storeIcon: "store-bakery" },
  { merchant: "Farmacia Cruz Verde", category: "salud-bienestar", storeIcon: "store-pharmacy" },
  { merchant: "Sodimac", category: "vivienda", storeIcon: "store-hardware" },
  { merchant: "Carnicería Don Pedro", category: "comercio-barrio", storeIcon: "store-butcher" },
  { merchant: "Shell", category: "transporte-vehiculo", storeIcon: "store-gas" },
];

const MONTHS = ["abr", "may", "jun"];
const TOTALS = [4990, 8350, 12990, 5600, 28350, 7200, 42000, 18990, 6700, 22400, 9800, 15300];

/** a deterministic personal-transaction pool: `shared` of them already shared. */
export function buildShareable(count = 22, shared = 5): ShareableTxn[] {
  return Array.from({ length: count }, (_, i) => {
    const t = TEMPLATES[i % TEMPLATES.length];
    const day = 28 - ((i * 3) % 27);
    return {
      id: `own-${i + 1}`,
      merchant: t.merchant,
      date: `${day} ${MONTHS[i % MONTHS.length]}`,
      total: TOTALS[i % TOTALS.length],
      category: t.category,
      storeIcon: t.storeIcon,
      shared: i < shared,
    };
  });
}

export const SAMPLE_SHAREABLE = buildShareable();
