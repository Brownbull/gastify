import type { MessageKey } from "@/lib/i18n";

/** The Historial hub subsections (chosen from the header switcher, ?sub=). */
export type HistorySub = "transactions" | "products" | "reports";

export const HISTORY_SUBS: HistorySub[] = ["transactions", "products", "reports"];

/** icon + label for each subsection (header switcher + active-subsection title). */
export const HISTORY_SUB_META: { id: HistorySub; icon: string; labelKey: MessageKey }[] = [
  { id: "transactions", icon: "nav-history", labelKey: "history.transactions" },
  { id: "products", icon: "item-pantry", labelKey: "history.products" },
  { id: "reports", icon: "chart-pie", labelKey: "history.reports" },
];

export function historySubLabelKey(sub: HistorySub): MessageKey {
  return HISTORY_SUB_META.find((s) => s.id === sub)?.labelKey ?? "history.products";
}
