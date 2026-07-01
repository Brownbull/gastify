import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { PixelIcon } from "@/components/shell/PixelIcon";
import { ChevronDownIcon } from "@/components/shell/icons";
import { IconTile } from "@/components/ui/IconTile";
import { CategoryChip } from "@/components/ui/CategoryChip";
import { formatDate, formatMinorAmount } from "@/lib/format";
import { categoryTint } from "@/lib/chartData";
import { itemCategoryIcon } from "@/lib/categoryIcon";
import type { ItemListRow } from "@/hooks/useItems";

/** A product aggregated across the period: total spent, purchase count, the rows. */
export interface AggregatedProduct {
  key: string;
  name: string;
  categoryKey?: string;
  categoryLabel?: string;
  currency: string;
  totalMinor: number;
  count: number;
  purchases: ItemListRow[];
}

/**
 * HistoryItemRow (DM-17d) — one AGGREGATED product row: category icon tile +
 * name + CategoryChip + total spent, with a receipt-count pill that expands the
 * per-purchase list (each links to its transaction). Ports the design-lab
 * HistoryItemRow; the Gustify cross-app link slot (CS-22) is omitted — the tile
 * shows the product's own category icon.
 */
export function HistoryItemRow({ product }: { product: AggregatedProduct }) {
  const [open, setOpen] = useState(false);
  const key = product.categoryKey;
  const icon = itemCategoryIcon(key);
  const tint = key ? categoryTint(key) : undefined;

  return (
    <div data-testid="history-item-row" className="bg-gt-surface transition hover:bg-gt-bg-3">
      <div className="flex items-center gap-gt-10 px-gt-12 py-gt-10">
        <IconTile size="md" icon={icon} tint={tint} />
        <div className="flex min-w-0 flex-1 flex-col gap-gt-2">
          <span className="truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{product.name}</span>
          {key && product.categoryLabel ? (
            <span>
              <CategoryChip label={product.categoryLabel} icon={icon} tint={tint ?? ""} size="sm" />
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-gt-2">
          <span className="font-gt-display text-gt-md font-extrabold tabular-nums text-gt-ink">
            {formatMinorAmount(product.totalMinor, product.currency)}
          </span>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={`${product.count}`}
            className="inline-flex items-center gap-gt-4 rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface px-gt-8 py-0.5 font-gt-display text-gt-xs font-extrabold text-gt-ink shadow-gt-xs transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:shadow-gt-sm"
          >
            <PixelIcon name="fin-receipt" size={16} />
            {product.count}
            <ChevronDownIcon className={`h-4 w-4 text-gt-ink-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {open ? (
        <div className="bg-gt-bg-3 px-gt-12 pb-gt-10 pt-gt-2">
          <ul className="divide-y-2 divide-gt-line overflow-hidden rounded-gt-lg border-2 border-gt-line bg-gt-surface">
            {product.purchases.map((p) => (
              <li key={p.id}>
                <Link
                  to="/transactions/$transactionId"
                  params={{ transactionId: p.transaction_id }}
                  className="flex items-center gap-gt-8 px-gt-10 py-gt-6 transition hover:bg-gt-bg-3"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-gt-sm font-bold text-gt-ink">{p.merchant}</span>
                    <span className="text-gt-xs font-medium text-gt-ink-3">
                      {formatDate(p.transaction_date)}
                      {p.qty != null && p.qty > 1 ? ` · ×${p.qty}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 font-gt-display text-gt-sm font-extrabold tabular-nums text-gt-ink">
                    {formatMinorAmount(p.total_minor, p.currency)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
