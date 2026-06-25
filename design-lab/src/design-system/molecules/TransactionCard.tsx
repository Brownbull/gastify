import { PixelIcon } from "@design-system/assets/PixelIcon";
import { CategoryChip } from "./CategoryChip";
import { ThumbnailBadge } from "./ThumbnailBadge";
import { clp, type TxnItem } from "@lib/transactionFixtures";
import type { BrowseTransaction } from "@lib/browseFixtures";

export interface TransactionCardProps {
  txn: BrowseTransaction;
  expanded?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
  className?: string;
}

function MetaPill({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-gt-4 rounded-gt-pill border-2 border-gt-line bg-gt-bg-3 px-gt-6 py-gt-0 text-gt-xs font-bold text-gt-ink-2">
      <PixelIcon name={icon} size={14} />
      {children}
    </span>
  );
}

function PreviewItem({ item }: { item: Pick<TxnItem, "name" | "total" | "category"> }) {
  return (
    <li className="flex items-center gap-gt-6 px-gt-10 py-gt-6">
      <CategoryChip category={item.category} size="sm" />
      <span className="min-w-0 flex-1 truncate text-gt-sm font-bold text-gt-ink-2">{item.name}</span>
      <span className="shrink-0 text-gt-sm font-extrabold text-gt-ink">{clp(item.total)}</span>
    </li>
  );
}

export function TransactionCard({ txn, expanded = false, onToggle, onClick, className = "" }: TransactionCardProps) {
  return (
    <div className={`bg-gt-surface transition duration-150 ease-gt-bounce hover:bg-gt-bg-3 ${className}`}>
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-[56px] w-full items-center gap-gt-10 px-gt-10 py-gt-8 text-left"
      >
        <ThumbnailBadge icon={txn.storeIcon} category={txn.category} size="md" />
        <span className="flex min-w-0 flex-1 flex-col gap-gt-4">
          <span className="flex items-center justify-between gap-gt-8">
            <span className="min-w-0 truncate font-gt-display text-gt-md font-extrabold leading-tight text-gt-ink">{txn.merchant}</span>
            <span className="shrink-0 font-gt-display text-gt-md font-extrabold text-gt-ink">{clp(txn.total)}</span>
          </span>
          <span className="flex flex-wrap items-center gap-gt-4">
            <MetaPill icon="chart-calendar">{txn.time}</MetaPill>
            <MetaPill icon="nav-home">{txn.location}</MetaPill>
            {txn.itemCount > 0 ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
                className="inline-flex items-center gap-gt-4 rounded-gt-pill border-2 border-gt-line-strong bg-gt-primary-soft px-gt-6 py-gt-0 text-gt-xs font-extrabold text-gt-primary shadow-gt-xs transition hover:-translate-y-0.5"
              >
                <PixelIcon name="fin-receipt" size={14} />
                {txn.itemCount}
              </button>
            ) : null}
          </span>
        </span>
      </button>

      {expanded && txn.previewItems.length > 0 ? (
        <ul className="border-t-2 border-gt-line bg-gt-bg-3">
          {txn.previewItems.map((item, i) => (
            <PreviewItem key={i} item={item} />
          ))}
          {txn.itemCount > txn.previewItems.length ? (
            <li className="px-gt-10 py-gt-6 text-center text-gt-xs font-extrabold text-gt-primary">
              +{txn.itemCount - txn.previewItems.length} más
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
