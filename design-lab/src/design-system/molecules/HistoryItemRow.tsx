import { useId, useRef, useState, useEffect } from "react";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { ChevronDownIcon } from "@design-system/assets/icons";
import { CategoryChip } from "./CategoryChip";
import { CompactRow, CompactRowList } from "./CompactRowList";
import { ThumbnailBadge } from "./ThumbnailBadge";
import { getCategoryToken } from "@lib/categoryTokens";
import { clp, type HistoryItem, type HistoryPurchase } from "@lib/transactionFixtures";

export interface HistoryItemRowProps {
  item: HistoryItem;
  cap?: number;
  defaultOpen?: boolean;
  onSeeAll?: () => void;
  /** fired when the unmatched-item placeholder is tapped (opens the link popup). */
  onLink?: (item: HistoryItem) => void;
  className?: string;
}

/**
 * The full-height LEFT slot — the cross-app link affordance.
 *   - matched   → the real Gustify icon, prominent (filled primary tile).
 *   - unmatched → a dashed "+" placeholder; tapping it opens the link popup.
 * Spans the two-line row height so matched rows read as more prominent.
 */
function LinkSlot({ item, onLink }: { item: HistoryItem; onLink?: (item: HistoryItem) => void }) {
  if (item.gustifyIcon) {
    // Background = the item's category color (tint), like the CategoryChip — the
    // documented data exception (category hues aren't gt-* tokens). Bigger icon
    // to match Gustify's ingredient avatars.
    const tint = getCategoryToken(item.category).tint;
    return (
      <span
        className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-gt-lg border-2 border-gt-line-strong shadow-gt-xs"
        style={{ backgroundColor: tint }}
        title="Vinculado con Gustify"
      >
        <PixelIcon name={item.gustifyIcon} dir="gustify-icons" size={28} alt="Vinculado con Gustify" />
      </span>
    );
  }
  return (
    <button
      type="button"
      aria-label={`Vincular ${item.name}`}
      title="Vincular con un ingrediente o producto"
      onClick={(e) => { e.stopPropagation(); onLink?.(item); }}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-gt-lg border-2 border-dashed border-gt-line bg-gt-surface text-gt-ink-3 transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:border-gt-primary hover:text-gt-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25"
    >
      <span className="font-gt-display text-gt-2xl font-extrabold leading-none">+</span>
    </button>
  );
}

function PurchaseList({ item, cap, onSeeAll }: { item: HistoryItem; cap: number; onSeeAll?: () => void }) {
  const shown = item.purchases.slice(0, cap);
  const more = item.purchases.length - shown.length;
  return (
    <div className="bg-gt-bg-3 pb-gt-8 pt-gt-2">
      <CompactRowList className="border-t-2 border-gt-line">
        {shown.map((p: HistoryPurchase, i) => (
          <CompactRow
            key={i}
            leading={<ThumbnailBadge icon={p.storeIcon} category={p.storeCategory} size="sm" />}
            title={p.store}
            meta={
              <span className="flex items-center gap-gt-4 text-gt-xs font-medium text-gt-ink-2">
                <PixelIcon name="chart-calendar" size={14} />
                {p.date} · ×{p.qty} · {clp(p.unitPrice)} c/u
              </span>
            }
            trailing={<span className="font-gt-display text-gt-sm font-extrabold text-gt-ink">{clp(p.lineTotal)}</span>}
          />
        ))}
      </CompactRowList>
      <div className="px-gt-8 pt-gt-8">
        <button
          type="button"
          onClick={onSeeAll}
          className="flex w-full items-center justify-center gap-gt-4 rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface px-gt-12 py-gt-8 text-gt-sm font-extrabold text-gt-primary shadow-gt-xs transition hover:-translate-y-0.5 hover:shadow-gt-sm"
        >
          Ver todo{more > 0 ? ` (${more} más)` : ""} →
        </button>
      </div>
    </div>
  );
}

function Disclosure({ open, children, id }: { open: boolean; children: React.ReactNode; id: string }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [open]);

  return (
    <div
      id={id}
      role="region"
      style={{ height: open ? height : 0 }}
      className="overflow-hidden transition-[height] duration-300 ease-gt-bounce"
    >
      <div ref={contentRef}>
        {children}
      </div>
    </div>
  );
}

export function HistoryItemRow({ item, cap = 5, defaultOpen = false, onSeeAll, onLink, className = "" }: HistoryItemRowProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  return (
    <div className={`bg-gt-surface transition duration-150 ease-gt-bounce hover:bg-gt-bg-3 ${className}`}>
      <div className="flex min-h-[60px] w-full items-center gap-gt-10 px-gt-10 py-gt-8">
        {/* full-height left link slot — real icon (matched) or dashed + (unmatched) */}
        <LinkSlot item={item} onLink={onLink} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-gt-display text-gt-md font-extrabold leading-tight text-gt-ink">{item.name}</span>
          <span className="mt-gt-2 block text-gt-xs font-extrabold text-gt-ink-3">
            <CategoryChip category={item.category} size="sm" />
          </span>
        </span>
        <span className="grid shrink-0 justify-items-end gap-gt-4">
          <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">{clp(item.totalSpent)}</span>
          <button
            type="button"
            onClick={() => setOpen((p) => !p)}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={`${item.txnCount} compras — ver`}
            className="inline-flex items-center gap-gt-4 rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface px-gt-8 py-gt-0 text-gt-xs font-extrabold text-gt-ink shadow-gt-xs transition hover:-translate-y-0.5 hover:shadow-gt-sm"
          >
            <PixelIcon name="fin-receipt" size={18} />
            {item.txnCount}
            <ChevronDownIcon className={`h-4 w-4 text-gt-ink-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
          </button>
        </span>
      </div>
      <Disclosure open={open} id={panelId}>
        <PurchaseList item={item} cap={cap} onSeeAll={onSeeAll} />
      </Disclosure>
    </div>
  );
}
