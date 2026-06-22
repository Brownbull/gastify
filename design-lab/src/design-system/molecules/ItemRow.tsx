import type { ReactNode } from "react";
import { CategoryChip } from "./CategoryChip";
import { clp, type TxnItem } from "@lib/transactionFixtures";

/**
 * ItemRow (DM-18) — a TRANSACTION item line (items inside a scanned receipt).
 * Scanned items rarely map to an icon, so there is NO icon. Layout (the decided
 * merged A+B): title + a content-width category chip under it on the left; the
 * numbers stacked on the right — TOTAL on top, "$unit ×qty" below.
 *
 * `tone`: "default" | "negative" (refund / over-budget) → the total flips red.
 * `index` prepends a small 1-based number (Original receipt-order view).
 * `accessory` overrides the right slot. (Items-history rows are a separate
 * molecule, HistoryItemRow.)
 */
export type ItemRowDensity = "tight" | "comfortable";
export type ItemRowTone = "default" | "negative";

export interface ItemRowProps {
  item: TxnItem;
  index?: number;
  density?: ItemRowDensity;
  tone?: ItemRowTone;
  /** override the right (numbers) slot. */
  accessory?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function ItemRow({ item, index, density = "tight", tone = "default", accessory, onClick, className = "" }: ItemRowProps) {
  const nameSize = density === "tight" ? "text-gt-md" : "text-gt-lg";

  const numbers = accessory ?? (
    <span className="flex shrink-0 flex-col items-end">
      <span className={`font-gt-display text-gt-md font-extrabold leading-tight ${tone === "negative" ? "text-gt-error" : "text-gt-ink"}`}>
        {clp(item.total)}
      </span>
      <span className="text-gt-xs font-medium leading-tight text-gt-ink-2">{clp(item.unitPrice)} ×{item.units}</span>
    </span>
  );

  const inner = (
    <>
      {index != null ? (
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-gt-md border-2 border-gt-line-strong bg-gt-bg-3 text-gt-xs font-extrabold text-gt-ink-3">
          {index}
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col items-start gap-gt-4">
        <span className={`truncate font-gt-display font-extrabold leading-tight text-gt-ink ${nameSize}`}>{item.name}</span>
        <CategoryChip category={item.category} size="sm" />
      </span>
      {numbers}
    </>
  );

  const row = `flex items-center gap-gt-8 p-gt-10 ${className}`;

  return (
    <li>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className={`${row} w-full text-left transition-colors duration-150 hover:bg-gt-bg-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-gt-primary/20`}
        >
          {inner}
        </button>
      ) : (
        <div className={row}>{inner}</div>
      )}
    </li>
  );
}
