import { sampleTxn, type TxnDetail } from "@lib/transactionFixtures";
import type { BrowseTransaction } from "@lib/browseFixtures";

/**
 * A richer supermarket boleta (3 familia groups) — the canonical multi-group
 * detail for showing the grouped item layout (sampleTxn is a smaller 2-group
 * restaurant boleta). Items sum to `total`. Mockup data.
 */
export const SUPERMARKET_TXN: TxnDetail = {
  merchant: "Líder",
  category: "supermercados",
  storeIcon: "store-supermarket",
  location: "Santiago, Chile",
  date: "15 Mar 2026",
  time: "11:24",
  payment: "cash",
  total: 28800,
  groups: [
    {
      familia: "food-fresh",
      items: [
        { name: "Tomates", total: 2990, unitPrice: 2990, units: 1, category: "Produce" },
        { name: "Plátanos", total: 1890, unitPrice: 1890, units: 1, category: "Produce" },
        { name: "Pechuga de pollo", total: 6490, unitPrice: 6490, units: 1, category: "MeatSeafood" },
        { name: "Pan de molde", total: 2190, unitPrice: 2190, units: 1, category: "BreadPastry" },
      ],
    },
    {
      familia: "food-packaged",
      items: [
        { name: "Arroz 1 kg", total: 1290, unitPrice: 1290, units: 1, category: "Pantry" },
        { name: "Coca-Cola 1.5L", total: 3980, unitPrice: 1990, units: 2, category: "Beverages" },
        { name: "Galletas", total: 1490, unitPrice: 1490, units: 1, category: "Snacks" },
      ],
    },
    {
      familia: "hogar",
      items: [
        { name: "Detergente", total: 5990, unitPrice: 5990, units: 1, category: "CleaningSupplies" },
        { name: "Toalla de papel", total: 2490, unitPrice: 2490, units: 1, category: "HomeEssentials" },
      ],
    },
  ],
};

/**
 * Pick a representative detail for a tapped browse transaction. Mockup mapping —
 * keyed by the store category so a supermarket row opens a supermarket boleta;
 * everything else falls back to the restaurant sample. (Real data would resolve
 * the actual receipt; the fixtures stay internally consistent — items sum to
 * total — which matters more here than list↔detail amount parity.)
 */
export function pickDetailFor(txn: BrowseTransaction): TxnDetail {
  return txn.category === "supermercados" ? SUPERMARKET_TXN : sampleTxn;
}
